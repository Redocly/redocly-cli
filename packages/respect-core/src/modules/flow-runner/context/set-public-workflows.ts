import { isPlainObject } from '@redocly/openapi-core';

import type { Workflow, PublicWorkflow, InputSchema } from '../../../types.js';
import { resolveInputValuesToSchema } from '../inputs/index.js';
import { getPublicSteps } from './set-public-steps.js';

export function getPublicWorkflows({
  workflows,
  inputs,
  env = {},
}: {
  workflows: Workflow[];
  inputs: Record<string, string>;
  env: Record<string, string>;
}): Record<string, PublicWorkflow> {
  const publicWorkflows = {} as Record<string, PublicWorkflow>;

  for (const workflow of workflows) {
    const workflowInputSchema = workflow.inputs;
    const mergedInputs = mergeWorkflowInputs({ inputs, workflowInputSchema, env });

    publicWorkflows[workflow.workflowId] = {
      steps: getPublicSteps(workflow.steps || []),
      inputs: workflowInputSchema ? mergedInputs : undefined,
      // the runner sets the evaluated outputs once the workflow has run
      outputs: undefined,
    };
  }

  return publicWorkflows;
}

export function mergeWorkflowInputs({
  inputs,
  workflowInputSchema,
  env,
  onInvalidInputs,
}: {
  inputs: Record<string, unknown> | undefined;
  workflowInputSchema: InputSchema | undefined;
  env: Record<string, string> | undefined;
  onInvalidInputs?: (problems: string) => void;
}) {
  if (!workflowInputSchema) {
    return {};
  }

  const envProperty = workflowInputSchema.properties?.env;
  // A boolean `env` schema declares no variables.
  const envSchema = isPlainObject<InputSchema>(envProperty) ? envProperty : undefined;
  const resolvedDotEnvInputs = envSchema ? resolveInputValuesToSchema(env || {}, envSchema) : {};
  const hasEnvVariables = Object.keys(resolvedDotEnvInputs).length > 0;

  const problems: string[] = [];
  const collectProblems = (text: string) => problems.push(text);
  const result = resolveInputValuesToSchema(
    hasEnvVariables ? { ...inputs, env: resolvedDotEnvInputs } : inputs,
    workflowInputSchema,
    collectProblems
  );

  // An absent `env` passes the check above, so when no declared variable is set, no `env` input
  // is given, and no `env` default applies, an empty `env` is checked on its own to report a
  // required variable that is not set.
  if (envSchema && !hasEnvVariables && inputs?.env === undefined && !('default' in envSchema)) {
    resolveInputValuesToSchema(
      { env: {} },
      { type: 'object', properties: { env: envSchema } },
      collectProblems
    );
  }

  if (problems.length > 0) {
    onInvalidInputs?.(problems.join(', '));
  }

  return result;
}
