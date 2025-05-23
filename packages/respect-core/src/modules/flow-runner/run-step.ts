import { blue, white, bold, red } from 'colorette';
import { callAPIAndAnalyzeResults } from './call-api-and-analyze-results.js';
import { checkCriteria } from './success-criteria/index.js';
import { delay } from '../../utils/delay.js';
import { CHECKS } from '../checks/index.js';
import { runWorkflow, resolveWorkflowContext } from './runner.js';
import { prepareRequest, type RequestData } from './prepare-request.js';
import {
  printChildWorkflowSeparator,
  printStepDetails,
  printActionsSeparator,
  printUnknownStep,
} from '../../utils/cli-outputs.js';
import {
  getValueFromContext,
  isParameterWithoutIn,
  resolveReusableComponentItem,
} from '../context-parser/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { DefaultLogger } from '../../utils/logger/logger.js';
import { Timer } from '../timeout-timer/timer.js';
import { DEFAULT_RESPECT_MAX_STEPS } from '../../consts.js';

import type {
  Check,
  Step,
  TestContext,
  Parameter,
  OnSuccessObject,
  OnFailureObject,
  RuntimeExpressionContext,
  ResolvedParameter,
} from '../../types.js';
import type { ParameterWithoutIn } from '../context-parser/index.js';

const logger = DefaultLogger.getInstance();
const parsedMaxSteps = parseInt(process.env.RESPECT_MAX_STEPS as string, 10);
const maxSteps = isNaN(parsedMaxSteps) ? DEFAULT_RESPECT_MAX_STEPS : parsedMaxSteps;
let stepsRun = 0;

export async function runStep({
  step,
  ctx,
  workflowId,
  retriesLeft,
}: {
  step: Step;
  ctx: TestContext;
  workflowId: string | undefined;
  retriesLeft?: number;
}): Promise<{ shouldEnd: boolean } | void> {
  step = { ...step }; // shallow copy step to avoid mutating the original step
  step.retriesLeft = retriesLeft;
  const workflow = ctx.workflows.find((w) => w.workflowId === workflowId);
  const { stepId, onFailure, onSuccess, workflowId: targetWorkflowRef, parameters } = step;

  const failureActionsToRun = (onFailure || workflow?.failureActions || []).map(
    (action) => resolveReusableComponentItem(action, ctx) as OnFailureObject
  );
  const successActionsToRun = (onSuccess || workflow?.successActions || []).map(
    (action) => resolveReusableComponentItem(action, ctx) as OnSuccessObject
  );

  const resolvedParameters = parameters?.map(
    (parameter) => resolveReusableComponentItem(parameter, ctx) as ResolvedParameter
  );

  if (targetWorkflowRef) {
    const targetWorkflow =
      ctx.workflows.find((w) => w.workflowId === targetWorkflowRef) ||
      getValueFromContext(targetWorkflowRef, ctx);

    if (!targetWorkflow) {
      const failedCall: Check = {
        name: CHECKS.UNEXPECTED_ERROR,
        message: `Workflow ${red(targetWorkflowRef)} not found.`,
        passed: false,
        severity: ctx.severity['UNEXPECTED_ERROR'],
      };
      step.checks.push(failedCall);
      return;
    }

    const workflowCtx = await resolveWorkflowContext(targetWorkflowRef, targetWorkflow, ctx);

    if (resolvedParameters && resolvedParameters.length) {
      // When the step in context specifies a workflowId, then all parameters without `in` maps to workflow inputs.
      const workflowInputParameters = resolvedParameters
        .filter(isParameterWithoutIn)
        .reduce((acc, parameter: ParameterWithoutIn) => {
          // Ensure parameter is of type ParameterWithoutIn
          acc[parameter.name] = getValueFromContext(parameter.value, ctx);
          return acc;
        }, {} as Record<string, any>);

      workflowCtx.$workflows[targetWorkflow.workflowId].inputs = workflowInputParameters;
    }

    printChildWorkflowSeparator(stepId);
    const stepWorkflowResult = await runWorkflow({
      workflowInput: targetWorkflow,
      ctx: workflowCtx,
      skipLineSeparator: true,
      parentStepId: stepId,
      invocationContext: `Child workflow of step ${stepId}`,
    });

    ctx.executedSteps.push(stepWorkflowResult);

    const outputs: Record<string, any> = {};
    if (step?.outputs) {
      try {
        for (const [outputKey, outputValue] of Object.entries(step.outputs)) {
          // need to partially emulate $outputs context
          outputs[outputKey] = evaluateRuntimeExpressionPayload({
            payload: outputValue,
            context: {
              $outputs: workflowCtx.$outputs?.[targetWorkflow.workflowId] || {},
            } as RuntimeExpressionContext,
          });
        }
      } catch (error: any) {
        const failedCall: Check = {
          name: CHECKS.UNEXPECTED_ERROR,
          message: error.message,
          passed: false,
          severity: ctx.severity['UNEXPECTED_ERROR'],
        };
        step.checks.push(failedCall);
      }

      // save local $steps context
      ctx.$steps[stepId] = {
        outputs,
      };

      // save local $steps context to parent workflow
      if (workflow?.workflowId) {
        ctx.$workflows[workflow.workflowId].steps[stepId] = {
          outputs,
          request: undefined,
          response: undefined,
        };
      }
    }

    return { shouldEnd: false };
  }
  ctx.executedSteps.push(step);

  stepsRun++;
  if (stepsRun > maxSteps) {
    step.checks.push({
      name: CHECKS.MAX_STEPS_REACHED_ERROR,
      message: `Max steps (${maxSteps}) reached`,
      passed: false,
      severity: ctx.severity['MAX_STEPS_REACHED_ERROR'],
    });
    return { shouldEnd: true };
  }

  if (Timer.getInstance().isTimedOut()) {
    step.checks.push({
      name: CHECKS.GLOBAL_TIMEOUT_ERROR,
      message: `Global Respect timer reached`,
      passed: false,
      severity: ctx.severity['GLOBAL_TIMEOUT_ERROR'],
    });
    return { shouldEnd: true };
  }

  if (resolvedParameters && resolvedParameters.length) {
    // When the step in context does not specify a workflowId the `in` field MUST be specified.
    const parameterWithoutIn = resolvedParameters.find((parameter: Parameter) => {
      const resolvedParameter = resolveReusableComponentItem(parameter, ctx) as ResolvedParameter;
      return !('in' in resolvedParameter);
    });

    if (parameterWithoutIn) {
      throw new Error(
        `Parameter "in" is required for ${stepId} step parameter ${parameterWithoutIn.name}`
      );
    }
  }

  let allChecksPassed = false;
  let requestData: RequestData | undefined;

  try {
    if (!workflowId) {
      throw new Error('Workflow name is required to run a step');
    }

    requestData = await prepareRequest(ctx, step, workflowId);

    const checksResult = await callAPIAndAnalyzeResults({
      ctx,
      workflowId,
      step,
      requestData,
    });

    allChecksPassed = Object.values(checksResult).every((check) => check);
  } catch (e: any) {
    step.verboseLog = ctx.apiClient.getVerboseResponseLogs();

    const failedCall: Check = {
      name: CHECKS.UNEXPECTED_ERROR,
      message: e.message,
      passed: false,
      severity: ctx.severity['UNEXPECTED_ERROR'],
    };
    step.checks.push(failedCall);
  }

  const verboseLogs = ctx.options.verbose ? ctx.apiClient.getVerboseLogs() : undefined;
  const verboseResponseLogs = ctx.options.verbose
    ? ctx.apiClient.getVerboseResponseLogs()
    : undefined;
  const requestUrl = requestData?.path || requestData?.serverUrl?.url;
  if (requestUrl) {
    printStepDetails({
      testNameToDisplay: `${requestData?.method.toUpperCase()} ${white(requestUrl)}${
        step.stepId ? ` ${blue('- step')} ${white(bold(step.stepId))}` : ''
      }`,
      checks: step.checks,
      verboseLogs,
      verboseResponseLogs,
    });
  } else {
    printUnknownStep(step);
  }

  if (!allChecksPassed) {
    const result = await runActions(failureActionsToRun, 'failure');
    if (result?.retriesLeft && result.retriesLeft > 0) {
      // if retriesLeft > 0, it means that the step was retried successfully and we need to
      // return step result to the outer flow
      return result.stepResult;
    }
    if (result?.shouldEnd) {
      return { shouldEnd: true };
    }
  }

  if (successActionsToRun.length && allChecksPassed) {
    const result = await runActions(successActionsToRun, 'success');
    if (result?.shouldEnd) {
      return { shouldEnd: true };
    }
  }

  // Internal function to run actions
  async function runActions(
    actions: OnFailureObject[] | OnSuccessObject[] = [],
    kind: 'failure' | 'success'
  ): Promise<{
    retriesLeft?: number;
    shouldEnd?: boolean;
    stepResult?: { shouldEnd: boolean } | void;
  } | void> {
    for (const action of actions) {
      const { type, criteria } = action;

      if (action.workflowId && action.stepId) {
        throw new Error(
          `Cannot use both workflowId: ${action.workflowId} and stepId: ${action.stepId} in ${action.type} action`
        );
      }

      const matchesCriteria = checkCriteria({
        workflowId: workflowId,
        step,
        criteria,
        ctx,
      }).every((check) => check.passed);

      if (matchesCriteria) {
        const targetWorkflow = action.workflowId
          ? getValueFromContext(action.workflowId, ctx)
          : undefined;
        const targetCtx = action.workflowId
          ? await resolveWorkflowContext(action.workflowId, targetWorkflow, ctx)
          : { ...ctx, executedSteps: [] };

        const targetStep = action.stepId ? action.stepId : undefined;

        if (type === 'retry') {
          const { retryAfter, retryLimit = 0 } = action;
          retriesLeft = retriesLeft ?? retryLimit;
          step.retriesLeft = retriesLeft;
          if (retriesLeft === 0) {
            return { retriesLeft: 0, shouldEnd: false };
          }
          await delay(retryAfter);

          if (targetWorkflow || targetStep) {
            printActionsSeparator(stepId, action.name, kind);
          }

          if (targetWorkflow) {
            const stepWorkflowResult = await runWorkflow({
              workflowInput: targetWorkflow,
              ctx: targetCtx,
              skipLineSeparator: true,
              invocationContext: `Retry action for step ${stepId}`,
            });
            ctx.executedSteps.push(stepWorkflowResult);
          } else if (targetStep) {
            const stepToRun = workflow?.steps.find((s) => s.stepId === targetStep) as Step;
            if (!stepToRun) {
              throw new Error(`Step ${targetStep} not found in workflow ${workflowId}`);
            }
            await runStep({
              step: stepToRun,
              ctx: targetCtx,
              workflowId,
            });
          }

          logger.log(
            `\n  Retrying step ${blue(stepId)} (${retryLimit - retriesLeft + 1}/${retryLimit})\n`
          );

          return {
            stepResult: await runStep({
              step,
              ctx,
              workflowId,
              retriesLeft: retriesLeft - 1,
            }),
            retriesLeft,
          };
        } else if (type === 'end') {
          return { shouldEnd: true };
        } else if (type === 'goto') {
          if (!targetWorkflow && !targetStep) {
            throw new Error('Either workflowId or stepId must be provided in goto action');
          }

          if (targetWorkflow || targetStep) {
            printActionsSeparator(stepId, action.name, kind);
          }

          const stepWorkflowResult = await runWorkflow({
            workflowInput: targetWorkflow || workflow,
            ctx: targetCtx,
            fromStepId: targetStep,
            skipLineSeparator: true,
            invocationContext: `Goto from step ${stepId}`,
          });
          ctx.executedSteps.push(stepWorkflowResult);
          return { shouldEnd: true };
        }
        // stop at first matching action
        break;
      }
    }

    if (kind === 'failure') {
      return { shouldEnd: true };
    }
  }
}
