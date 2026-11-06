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

  const envSchema = workflowInputSchema.properties?.env as InputSchema | undefined;
  if (!envSchema) {
    return resolveInputValuesToSchema(inputs, workflowInputSchema, onInvalidInputs);
  }

  const resolvedDotEnvInputs = resolveInputValuesToSchema(env || {}, envSchema);
  if (Object.keys(resolvedDotEnvInputs).length > 0) {
    return resolveInputValuesToSchema(
      { ...inputs, env: resolvedDotEnvInputs },
      workflowInputSchema,
      onInvalidInputs
    );
  }

  // Without a declared variable set, an `env` input is kept, the `env` default applies,
  // or an empty `env` is checked, so a required variable that is not set is reported.
  return resolveInputValuesToSchema(
    'default' in envSchema ? inputs : { env: {}, ...inputs },
    workflowInputSchema,
    onInvalidInputs
  );
}
