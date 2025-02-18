import { checkCriteria } from './success-criteria';
import { checkSchema } from './schema';
import { CHECKS } from '../checks';
import { createRuntimeExpressionCtx } from './context';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions';

import type { RequestData } from './prepare-request';
import type { TestContext, Step } from '../../types';

// TODO: split into two functions
export async function callAPIAndAnalyzeResults({
  ctx,
  workflowName,
  step,
  requestData,
}: {
  ctx: TestContext;
  workflowName: string;
  step: Step;
  requestData: RequestData;
}) {
  // clear checks in case of retry
  step.checks = [];

  const checksResult = {
    successCriteriaCheck: true,
    expectCheck: true,
    networkCheck: true,
  };

  try {
    step.response = await ctx.apiClient.fetchResult(ctx, requestData);
  } catch (error: any) {
    step.checks.push({
      name: CHECKS.NETWORK_ERROR,
      pass: false,
      message: error.message,
      severity: ctx.severity['NETWORK_ERROR'],
    });
    checksResult.networkCheck = false;
    return checksResult;
  }

  const request = ctx.$workflows[workflowName].steps[step.stepId].request;

  // store step level outputs
  if (step.outputs) {
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: {
        ...ctx,
        ...{
          $request: request,
          $response: step.response,
          $inputs: ctx.$workflows[workflowName].inputs,
        },
      },
      workflowId: workflowName,
      step,
    });

    if (step.outputs) {
      for (const outputKey of Object.keys(step.outputs)) {
        step.outputs[outputKey] = evaluateRuntimeExpressionPayload({
          payload: step.outputs[outputKey],
          context: runtimeExpressionContext,
        });
      }
    }
  }

  step.verboseLog = ctx.apiClient.getVerboseResponseLogs();

  if (step.successCriteria) {
    const successCriteriaChecks = checkCriteria({
      workflowId: workflowName,
      step,
      criteria: step.successCriteria,
      ctx: {
        ...ctx,
        ...{
          $request: request,
          $response: step.response,
          $inputs: ctx.$workflows[workflowName].inputs,
        },
      },
    });

    checksResult.successCriteriaCheck = successCriteriaChecks.every((check) => check.pass);
    step.checks.push(...successCriteriaChecks);
  }

  const schemaChecks = checkSchema({
    stepCallCtx: {
      $request: request,
      $response: step.response,
      $inputs: ctx.$workflows[workflowName].inputs,
    },
    descriptionOperation: requestData.openapiOperation,
    ctx,
  });

  if (schemaChecks.length) {
    checksResult.expectCheck = schemaChecks.every((check) => check.pass);
    step.checks.push(...schemaChecks);
  }

  // save local $steps context
  ctx.$steps[step.stepId] = {
    outputs: ctx.$steps[step.stepId].outputs
      ? { ...ctx.$steps[step.stepId].outputs, ...step.outputs }
      : step.outputs,
  };
  // save $workflows context
  ctx.$workflows[workflowName].steps[step.stepId] = {
    outputs: ctx.$steps[step.stepId].outputs,
    request,
    response: step.response,
  };

  return checksResult;
}
