import { checkCriteria } from './success-criteria/index.js';
import { checkSchema } from './schema/index.js';
import { CHECKS } from '../checks/index.js';
import { createRuntimeExpressionCtx } from './context/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';

import type { RequestData } from './prepare-request.js';
import type { TestContext, Step } from '../../types.js';

// TODO: split into two functions
export async function callAPIAndAnalyzeResults({
  ctx,
  workflowId,
  step,
  requestData,
}: {
  ctx: TestContext;
  workflowId: string;
  step: Step;
  requestData: RequestData;
}) {
  // clear checks in case of retry
  step.checks = [];

  const checksResult = {
    successCriteriaCheck: true,
    schemaCheck: true,
    networkCheck: true,
  };

  try {
    step.response = await ctx.apiClient.fetchResult({ ctx, step, requestData, workflowId });
  } catch (error: any) {
    step.checks.push({
      name: CHECKS.NETWORK_ERROR,
      passed: false,
      message: error.message,
      severity: ctx.severity['NETWORK_ERROR'],
    });
    checksResult.networkCheck = false;
    return checksResult;
  }

  const request = ctx.$workflows[workflowId].steps[step.stepId].request;

  step.verboseLog = ctx.apiClient.getVerboseResponseLogs();

  if (step.successCriteria) {
    const successCriteriaChecks = checkCriteria({
      workflowId,
      step,
      criteria: step.successCriteria,
      ctx: {
        ...ctx,
        $request: request,
        $response: step.response,
        $inputs: ctx.$workflows[workflowId].inputs,
      },
    });

    checksResult.successCriteriaCheck = successCriteriaChecks.every(
      (check) => check.passed || ['off', 'warn'].includes(check.severity)
    );
    step.checks.push(...successCriteriaChecks);
  }

  const schemaChecks = checkSchema({
    stepCallCtx: {
      $request: request,
      $response: step.response,
      $inputs: ctx.$workflows[workflowId].inputs,
    },
    descriptionOperation: requestData.openapiOperation,
    ctx,
  });

  if (schemaChecks.length) {
    checksResult.schemaCheck = schemaChecks.every(
      (check) => check.passed || ['off', 'warn'].includes(check.severity)
    );
    step.checks.push(...schemaChecks);
  }

  // store step level outputs
  const outputs: Record<string, any> = {};
  if (step.outputs) {
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: {
        ...ctx,
        $request: request,
        $response: step.response,
        $inputs: ctx.$workflows[workflowId].inputs,
      },
      workflowId,
      step,
    });

    for (const outputKey of Object.keys(step.outputs)) {
      outputs[outputKey] = evaluateRuntimeExpressionPayload({
        payload: step.outputs[outputKey],
        context: runtimeExpressionContext,
      });
    }
  }

  // save local $steps context
  ctx.$steps[step.stepId] = {
    outputs: { ...ctx.$steps[step.stepId].outputs, ...outputs },
  };
  // save $workflows context
  ctx.$workflows[workflowId].steps[step.stepId] = {
    outputs: { ...ctx.$steps[step.stepId].outputs, ...outputs },
    request,
    response: step.response,
  };

  return checksResult;
}
