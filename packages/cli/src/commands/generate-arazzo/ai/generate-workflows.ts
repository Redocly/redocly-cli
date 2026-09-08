import { createConfig, isPlainObject, logger, stringifyYaml } from '@redocly/openapi-core';
import type { TestDescription } from '@redocly/respect-core';

import { lintDocumentSource } from '../../../utils/ai/output.js';
import { type AiProvider } from '../../../utils/ai/providers.js';
import { buildWorkflowsPrompt, MAX_PROMPT_CHARS, stripProse } from './prompt.js';
import { callProvider, parseWorkflowsDocument, validateReferences } from './provider-answer.js';
import { generateWorkflowsTwoPass } from './two-pass.js';

export interface GenerateWorkflowsOptions {
  provider: AiProvider;
  /** Model passed to the provider; the provider's default applies otherwise. */
  model?: string;
  /** The mechanically generated Arazzo description the AI redesigns. */
  baseline: TestDescription;
  /** The bundled OpenAPI description, sent to the AI as context. */
  description: unknown;
  /** The most workflows the AI may design; more get the answer rejected. */
  maxWorkflows: number;
  /** Scenario designs run in parallel in two-pass mode; defaults to 4. */
  concurrency?: number;
}

export interface GeneratedWorkflowsResult {
  /** The Arazzo description with the AI-designed workflows, as YAML. */
  yaml: string;
  workflows: number;
}

/**
 * An answer often returns only its own reusable inputs, while its workflows
 * still $ref the baseline's security inputs — merge instead of replace, so
 * those references keep resolving. An input the answer redefines deliberately
 * still wins.
 */
function mergeComponents(answer: unknown, baseline: TestDescription['components']): unknown {
  const answerComponents = isPlainObject(answer) ? answer : undefined;
  if (!answerComponents || !baseline) {
    return answerComponents ?? baseline;
  }
  const inputs = {
    ...(isPlainObject(baseline.inputs) && baseline.inputs),
    ...(isPlainObject(answerComponents.inputs) && answerComponents.inputs),
  };
  return {
    ...baseline,
    ...answerComponents,
    ...(Object.keys(inputs).length > 0 && { inputs }),
  };
}

/**
 * Ask the AI provider to redesign the baseline's one-workflow-per-operation
 * skeleton into realistic multi-step workflows. The answer is never trusted
 * blindly: the header fields (`arazzo`, `info`, `sourceDescriptions`) always
 * come from the baseline, every operation reference must exist in the
 * description, and the result must pass validation with the `spec` ruleset.
 * Any rejection throws, and the command falls back to the baseline.
 */
export async function generateWorkflowsWithAi(
  options: GenerateWorkflowsOptions
): Promise<GeneratedWorkflowsResult> {
  const config = await createConfig({ extends: ['spec'] });

  let { system, user } = buildWorkflowsPrompt({
    description: options.description,
    baseline: options.baseline,
    maxWorkflows: options.maxWorkflows,
  });
  let prosePruned = false;
  if (system.length + user.length > MAX_PROMPT_CHARS) {
    // Chaining operations needs the description's structure, not its prose;
    // dropping the prose lets much larger descriptions fit the prompt.
    ({ system, user } = buildWorkflowsPrompt({
      description: stripProse(options.description),
      baseline: options.baseline,
      maxWorkflows: options.maxWorkflows,
    }));
    prosePruned = true;
  }

  let workflows: unknown[];
  let components: unknown;

  if (system.length + user.length > MAX_PROMPT_CHARS) {
    workflows = await generateWorkflowsTwoPass(options, config);
    components = options.baseline.components;
  } else {
    if (prosePruned) {
      logger.info(
        'The OpenAPI description is large; sending it to the AI provider without description and example fields.\n'
      );
    }
    const text = await callProvider(
      options.provider,
      options.model,
      { system, user },
      'Waiting for the AI-designed workflows'
    );
    const parsed = parseWorkflowsDocument(text);
    if (parsed.workflows.length > options.maxWorkflows) {
      throw new Error(
        `the response contains ${parsed.workflows.length} workflows, more than the --max-workflows limit of ${options.maxWorkflows}`
      );
    }
    validateReferences(parsed.workflows, options.baseline);
    workflows = parsed.workflows;
    components = mergeComponents(parsed.components, options.baseline.components);
  }

  const document = {
    arazzo: options.baseline.arazzo,
    info: options.baseline.info,
    sourceDescriptions: options.baseline.sourceDescriptions,
    workflows,
    ...(components !== undefined && { components }),
  };

  const yaml = stringifyYaml(document);
  await lintDocumentSource(yaml, config);

  return { yaml, workflows: workflows.length };
}
