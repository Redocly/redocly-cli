import type { SourceDescription, Workflow } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import { validateWorkflowIdDefined } from '../utils.js';

export const SpecStepWorkflowIdDefined: Arazzo1Rule = () => {
  let definedSourceDescriptions: SourceDescription[] = [];
  let definedWorkflows: Workflow[] = [];

  return {
    SourceDescriptions(sourceDescriptions) {
      definedSourceDescriptions = sourceDescriptions;
    },
    Workflows(workflows) {
      definedWorkflows = workflows;
    },
    Step(step, ctx) {
      validateWorkflowIdDefined({
        workflowId: step.workflowId,
        workflows: definedWorkflows,
        sourceDescriptions: definedSourceDescriptions,
        ctx,
        reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-step-workflowid-defined',
      });
    },
  };
};
