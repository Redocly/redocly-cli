import type {
  OnFailureObject,
  OnSuccessObject,
  SourceDescription,
  Workflow,
} from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateWorkflowIdDefined } from '../utils.js';

export const SpecActionWorkflowIdDefined: Arazzo1Rule = () => {
  let definedSourceDescriptions: SourceDescription[] = [];
  let definedWorkflows: Workflow[] = [];

  function checkWorkflowId(action: OnSuccessObject | OnFailureObject, ctx: UserContext) {
    // the `workflowId` of an `end` action is not relevant, so it references nothing
    if (action.type === 'end') return;

    validateWorkflowIdDefined({
      workflowId: action.workflowId,
      workflows: definedWorkflows,
      sourceDescriptions: definedSourceDescriptions,
      ctx,
      reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-action-workflowid-defined',
    });
  }

  return {
    SourceDescriptions(sourceDescriptions) {
      definedSourceDescriptions = sourceDescriptions;
    },
    Workflows(workflows) {
      definedWorkflows = workflows;
    },
    SuccessActionObject: checkWorkflowId,
    FailureActionObject: checkWorkflowId,
  };
};
