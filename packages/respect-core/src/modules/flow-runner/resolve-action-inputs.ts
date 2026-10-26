import type {
  OnFailureObject,
  OnSuccessObject,
  ResolvedParameter,
  Step,
  TestContext,
} from '../../types.js';
import { resolveReusableComponentItem } from '../context-parser/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { createRuntimeExpressionCtx } from './context/index.js';

// The parameters of a success or failure action are the inputs of the workflow that the action references.
// They are evaluated after the step has run, so they can use its response, like the action criteria.
export function resolveActionInputs({
  action,
  ctx,
  step,
  workflowId,
}: {
  action: OnSuccessObject | OnFailureObject;
  ctx: TestContext;
  step: Step;
  workflowId: string | undefined;
}): Record<string, unknown> | undefined {
  if (!action.workflowId || !action.parameters) {
    return undefined;
  }

  const expressionContext = createRuntimeExpressionCtx({
    ctx: {
      ...ctx,
      $inputs: {
        ...ctx.$inputs,
        ...(workflowId ? ctx.$workflows[workflowId]?.inputs : {}),
      },
    },
    workflowId,
    step,
  });

  return Object.fromEntries(
    action.parameters.map((parameter) => {
      // a reusable reference resolves to the parameter it points to
      const resolvedParameter = resolveReusableComponentItem(parameter, ctx) as ResolvedParameter;

      if ('in' in resolvedParameter) {
        throw new Error(
          `Parameter ${resolvedParameter.name} of action ${action.name} has an "in" field. An action parameter is an input of workflow ${action.workflowId}, so it only has a name and a value.`
        );
      }

      return [
        resolvedParameter.name,
        evaluateRuntimeExpressionPayload({
          payload: resolvedParameter.value,
          context: expressionContext,
          logger: ctx.options.logger,
        }),
      ];
    })
  );
}
