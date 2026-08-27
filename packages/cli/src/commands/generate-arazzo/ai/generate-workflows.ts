import {
  createConfig,
  isPlainObject,
  logger,
  parseYaml,
  stringifyYaml,
} from '@redocly/openapi-core';
import type { TestDescription } from '@redocly/respect-core';
import * as process from 'node:process';

import { lintDocumentSource, stripCodeFences } from '../../../utils/ai/output.js';
import { type AiProvider, runProvider } from '../../../utils/ai/providers.js';
import { Spinner } from '../../../utils/spinner.js';
import { buildWorkflowsPrompt } from './prompt.js';

export interface GenerateWorkflowsOptions {
  provider: AiProvider;
  /** The mechanically generated Arazzo description the AI redesigns. */
  baseline: TestDescription;
  description: unknown;
  maxWorkflows: number;
}

// The whole prompt must fit the provider's context window with room left for
// the answer; ~400k characters is roughly 100k tokens.
export const MAX_PROMPT_CHARS = 400_000;

const PROSE_KEYS = new Set(['description', 'example', 'examples', 'externalDocs']);

/**
 * Copy the description without its prose fields. Under a `properties` key the
 * keys are schema property names, not OpenAPI keywords — a property named
 * "description" must survive.
 */
function stripProse(value: unknown, keysArePropertyNames = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripProse(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!keysArePropertyNames && PROSE_KEYS.has(key)) {
      continue;
    }
    result[key] = stripProse(child, !keysArePropertyNames && key === 'properties');
  }
  return result;
}

export interface GeneratedWorkflowsResult {
  /** The Arazzo description with the AI-designed workflows, as YAML. */
  yaml: string;
  workflows: number;
}

interface StepReferences {
  operationRefs: Set<string>;
  workflowRefs: Set<string>;
  workflowIds: Set<string>;
}

function collectReferences(workflows: unknown): StepReferences {
  const references: StepReferences = {
    operationRefs: new Set(),
    workflowRefs: new Set(),
    workflowIds: new Set(),
  };
  if (!Array.isArray(workflows)) {
    return references;
  }
  for (const workflow of workflows) {
    if (!isPlainObject(workflow)) {
      continue;
    }
    if (typeof workflow.workflowId === 'string') {
      references.workflowIds.add(workflow.workflowId);
    }
    if (!Array.isArray(workflow.steps)) {
      continue;
    }
    for (const step of workflow.steps) {
      if (!isPlainObject(step)) {
        continue;
      }
      if (typeof step.operationId === 'string') {
        references.operationRefs.add(step.operationId);
      }
      if (typeof step.operationPath === 'string') {
        references.operationRefs.add(step.operationPath);
      }
      if (typeof step.workflowId === 'string') {
        references.workflowRefs.add(step.workflowId);
      }
    }
  }
  return references;
}

function parseWorkflowsDocument(text: string): { workflows: unknown[]; components?: unknown } {
  let parsed: unknown;
  try {
    parsed = parseYaml(stripCodeFences(text));
  } catch (error) {
    throw new Error(
      `the provider did not return valid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isPlainObject(parsed) || !Array.isArray(parsed.workflows) || parsed.workflows.length === 0) {
    throw new Error('the response is not a YAML document with a non-empty "workflows" list');
  }

  return { workflows: parsed.workflows, components: parsed.components };
}

/**
 * Every operation the baseline covers appears in exactly one of its steps, so
 * the baseline's operationId/operationPath values are the complete list of
 * valid operation references — anything else is hallucinated.
 */
function validateReferences(workflows: unknown[], baseline: TestDescription): void {
  const valid = collectReferences(baseline.workflows);
  const generated = collectReferences(workflows);

  const unknownOperations = [...generated.operationRefs].filter(
    (reference) => !valid.operationRefs.has(reference)
  );
  if (unknownOperations.length > 0) {
    throw new Error(
      `the response references operation(s) missing from the OpenAPI description: ${unknownOperations.join(
        ', '
      )}`
    );
  }

  const unknownWorkflows = [...generated.workflowRefs].filter(
    (reference) => !generated.workflowIds.has(reference)
  );
  if (unknownWorkflows.length > 0) {
    throw new Error(
      `the response references workflow(s) it does not define: ${unknownWorkflows.join(', ')}`
    );
  }
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
  let { system, user } = buildWorkflowsPrompt({
    description: options.description,
    baseline: options.baseline,
    maxWorkflows: options.maxWorkflows,
  });

  if (system.length + user.length > MAX_PROMPT_CHARS) {
    // Chaining operations needs the description's structure, not its prose;
    // dropping the prose lets much larger descriptions fit the prompt.
    ({ system, user } = buildWorkflowsPrompt({
      description: stripProse(options.description),
      baseline: options.baseline,
      maxWorkflows: options.maxWorkflows,
    }));
    if (system.length + user.length > MAX_PROMPT_CHARS) {
      throw new Error('the OpenAPI description is too large to send to the AI provider');
    }
    logger.info(
      'The OpenAPI description is large; sending it to the AI provider without description and example fields.\n'
    );
  }

  const spinner = new Spinner();
  spinner.start('Waiting for the AI-designed workflows');
  let text: string;
  try {
    ({ text } = await runProvider(options.provider, { system, user }));
  } finally {
    spinner.stop();
    if (process.stderr.isTTY) {
      // Erase the leftover spinner frame so the result line prints clean.
      logger.info('\x1b[2K');
    }
  }

  const parsed = parseWorkflowsDocument(text);
  if (parsed.workflows.length > options.maxWorkflows) {
    throw new Error(
      `the response contains ${parsed.workflows.length} workflows, more than the --max-workflows limit of ${options.maxWorkflows}`
    );
  }
  validateReferences(parsed.workflows, options.baseline);

  // An answer that omits the baseline's components (security inputs) would
  // break the "$components..." references the prompt asks to keep.
  const components = parsed.components ?? options.baseline.components;
  const document = {
    arazzo: options.baseline.arazzo,
    info: options.baseline.info,
    sourceDescriptions: options.baseline.sourceDescriptions,
    workflows: parsed.workflows,
    ...(components !== undefined && { components }),
  };

  const yaml = stringifyYaml(document);
  await lintDocumentSource(yaml, await createConfig({ extends: ['spec'] }));

  return { yaml, workflows: parsed.workflows.length };
}
