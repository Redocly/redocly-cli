import { isPlainObject, parseYaml } from '@redocly/openapi-core';
import type { TestDescription } from '@redocly/respect-core';

import { stripCodeFences } from '../../../utils/ai/output.js';
import { type AiProvider, runProvider } from '../../../utils/ai/providers.js';
import { finishProgress, Spinner } from '../../../utils/spinner.js';

/** One spinner-wrapped provider call whose errors propagate to the caller. */
export async function callProvider(
  provider: AiProvider,
  model: string | undefined,
  prompt: { system: string; user: string },
  progressLabel: string
): Promise<string> {
  const spinner = new Spinner();
  spinner.start(progressLabel);
  try {
    const { text } = await runProvider(provider, { ...prompt, model });
    return text;
  } finally {
    finishProgress(spinner);
  }
}

export function parseWorkflowsDocument(text: string): {
  workflows: unknown[];
  components?: unknown;
} {
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

interface StepReferences {
  operationRefs: Set<string>;
  workflowRefs: Set<string>;
  workflowIds: Set<string>;
}

export function collectReferences(workflows: unknown): StepReferences {
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

/**
 * Every operation the baseline covers appears in exactly one of its steps, so
 * the baseline's operationId/operationPath values are the complete list of
 * valid operation references — anything else is hallucinated.
 */
export function validateReferences(workflows: unknown[], baseline: TestDescription): void {
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
