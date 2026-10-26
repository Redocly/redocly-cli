import type { Workflow, PublicWorkflow, InputSchema } from '../../../types.js';
import {
  resolveInputValuesToSchema,
  type WorkflowInputValidationContext,
} from '../inputs/index.js';
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
  validationContext,
}: {
  inputs: Record<string, string> | undefined;
  workflowInputSchema: InputSchema | undefined;
  env: Record<string, string> | undefined;
  validationContext?: WorkflowInputValidationContext;
}) {
  let resolvedInputs = {};
  let resolvedDotEnvInputs = {};

  if (workflowInputSchema) {
    resolvedInputs = resolveInputValuesToSchema(inputs, workflowInputSchema as InputSchema);
  }

  if (workflowInputSchema?.properties?.env) {
    resolvedDotEnvInputs = resolveInputValuesToSchema(
      env || {},
      workflowInputSchema.properties.env as InputSchema
    );
  }

  const mergedInputs =
    Object.keys(resolvedDotEnvInputs).length > 0
      ? { ...resolvedInputs, env: resolvedDotEnvInputs }
      : resolvedInputs;

  return validationContext && workflowInputSchema
    ? resolveInputValuesToSchema(mergedInputs, workflowInputSchema, validationContext)
    : mergedInputs;
}
