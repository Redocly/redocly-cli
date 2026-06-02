import { isPlainObject } from '../../utils/is-plain-object.js';

import type { Parameter } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

function isInlineParameter(parameter: Parameter): boolean {
  return isPlainObject(parameter) && !('reference' in parameter);
}

function checkParameters(
  parameters: Parameter[],
  hasWorkflowId: boolean,
  { report, location }: UserContext
) {
  if (!Array.isArray(parameters)) return;

  for (let i = 0; i < parameters.length; i++) {
    const parameter = parameters[i];
    if (!isInlineParameter(parameter)) continue;

    const hasIn = 'in' in parameter;

    if (hasWorkflowId && hasIn) {
      report({
        message:
          'Parameter `in` field MUST NOT be specified when the parent references a `workflowId`; parameters map to workflow inputs.',
        location: location.child(['parameters', i, 'in']).key(),
      });
    } else if (!hasWorkflowId && !hasIn) {
      report({
        message:
          'Parameter `in` field MUST be specified when the parent does not reference a `workflowId`.',
        location: location.child(['parameters', i]),
      });
    }
  }
}

export const SpecParametersInByContext: Arazzo1Rule = () => {
  return {
    Workflow: {
      enter(workflow, ctx: UserContext) {
        if (!workflow.parameters) return;
        // A workflow never references another workflow, so `in` is always required.
        checkParameters(workflow.parameters, false, ctx);
      },
    },
    Step: {
      enter(step, ctx: UserContext) {
        if (!step.parameters) return;
        checkParameters(step.parameters, Boolean(step.workflowId), ctx);
      },
    },
    SuccessActionObject: {
      enter(action, ctx: UserContext) {
        if (!action.parameters) return;

        if (!action.workflowId) {
          ctx.report({
            message:
              'Parameters on success actions are only valid when the action references a `workflowId`.',
            location: ctx.location.child(['parameters']).key(),
          });
        }
      },
    },
    FailureActionObject: {
      enter(action, ctx: UserContext) {
        if (!action.parameters) return;

        if (!action.workflowId) {
          ctx.report({
            message:
              'Parameters on failure actions are only valid when the action references a `workflowId`.',
            location: ctx.location.child(['parameters']).key(),
          });
        }
      },
    },
  };
};
