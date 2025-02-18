
import { resolveInputValuesToSchema } from '../inputs';
import { getPublicSteps } from './set-public-steps';

import type { Workflow, PublicWorkflow, InputSchema } from '../../../types';

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

    publicWorkflows[workflow.workflowId] = {
      steps: getPublicSteps(workflow.steps || []),
      inputs: workflowInputSchema ? mergedInputs : undefined,
      outputs: workflow.outputs,
    };
  }

  return publicWorkflows;
}
