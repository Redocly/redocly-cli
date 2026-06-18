import type { Parameter } from '../../typings/arazzo.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

function isInlineParameter(parameter: Parameter): boolean {
  return isPlainObject(parameter) && !('reference' in parameter);
}

function checkInRequired(parameters: Parameter[], { report, location }: UserContext) {
  if (!Array.isArray(parameters)) return;

  for (let i = 0; i < parameters.length; i++) {
    const parameter = parameters[i];
    if (!isInlineParameter(parameter)) continue;

    if (!('in' in parameter)) {
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
        checkInRequired(workflow.parameters, ctx);
      },
    },
    Step: {
      enter(step, ctx: UserContext) {
        if (!step.parameters) return;
        if (step.workflowId) return;
        checkInRequired(step.parameters, ctx);
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
