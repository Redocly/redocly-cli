import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

function isInlineParameter(parameter: any): boolean {
  return parameter && typeof parameter === 'object' && !('reference' in parameter);
}

function checkParameters(
  parameters: any,
  hasWorkflowId: boolean,
  basePath: (string | number)[],
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
        location: location.child([...basePath, i, 'in']).key(),
      });
    } else if (!hasWorkflowId && !hasIn) {
      report({
        message:
          'Parameter `in` field MUST be specified when the parent does not reference a `workflowId`.',
        location: location.child([...basePath, i]),
      });
    }
  }
}

export const SpecParametersInByContext: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, ctx: UserContext) {
        if (!step.parameters) return;
        checkParameters(step.parameters, Boolean(step.workflowId), ['parameters'], ctx);
      },
    },
    SuccessActionObject: {
      enter(action, ctx: UserContext) {
        if (!('parameters' in action) || !action.parameters) return;

        if (!action.workflowId) {
          ctx.report({
            message:
              'Parameters on success/failure actions are only valid when the action references a `workflowId`.',
            location: ctx.location.child(['parameters']).key(),
          });
          return;
        }
        checkParameters(action.parameters, true, ['parameters'], ctx);
      },
    },
    FailureActionObject: {
      enter(action, ctx: UserContext) {
        if (!('parameters' in action) || !action.parameters) return;

        if (!action.workflowId) {
          ctx.report({
            message:
              'Parameters on success/failure actions are only valid when the action references a `workflowId`.',
            location: ctx.location.child(['parameters']).key(),
          });
          return;
        }
        checkParameters(action.parameters, true, ['parameters'], ctx);
      },
    },
  };
};
