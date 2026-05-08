import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const IN_REQUIRED_MESSAGE =
  "Parameter `in` field MUST be specified when the parent does not reference a `workflowId`.";
const IN_NOT_ALLOWED_MESSAGE =
  "Parameter `in` field MUST NOT be specified when the parent references a `workflowId`; parameters map to workflow inputs.";
const ACTION_PARAMETERS_REQUIRE_WORKFLOW_ID =
  'Parameters on success/failure actions are only valid when the action references a `workflowId`.';

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
        message: IN_NOT_ALLOWED_MESSAGE,
        location: location.child([...basePath, i, 'in']).key(),
      });
    } else if (!hasWorkflowId && !hasIn) {
      report({
        message: IN_REQUIRED_MESSAGE,
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
        const hasWorkflowId = Boolean(step.workflowId);
        checkParameters(step.parameters, hasWorkflowId, ['parameters'], ctx);
      },
    },
    SuccessActionObject: {
      enter(action, ctx: UserContext) {
        if (!('parameters' in action) || !action.parameters) return;

        const hasWorkflowId = Boolean(action.workflowId);
        if (!hasWorkflowId) {
          ctx.report({
            message: ACTION_PARAMETERS_REQUIRE_WORKFLOW_ID,
            location: ctx.location.child(['parameters']).key(),
          });
        }
        checkParameters(action.parameters, hasWorkflowId, ['parameters'], ctx);
      },
    },
    FailureActionObject: {
      enter(action, ctx: UserContext) {
        if (!('parameters' in action) || !action.parameters) return;

        const hasWorkflowId = Boolean(action.workflowId);
        if (!hasWorkflowId) {
          ctx.report({
            message: ACTION_PARAMETERS_REQUIRE_WORKFLOW_ID,
            location: ctx.location.child(['parameters']).key(),
          });
        }
        checkParameters(action.parameters, hasWorkflowId, ['parameters'], ctx);
      },
    },
  };
};
