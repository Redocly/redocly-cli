import { blue, white, bold, red } from 'colorette';
import { callAPIAndAnalyzeResults } from './call-api-and-analyze-results';
import { checkCriteria } from './success-criteria';
import { delay } from '../../utils/delay';
import { CHECKS } from '../checks';
import { runWorkflow, resolveWorkflowContext } from './runner';
import { prepareRequest } from './prepare-request';
import { printStepDetails } from '../../utils/cli-outputs';
import {
  getValueFromContext,
  isParameterWithoutIn,
  resolveReusableComponentItem,
} from '../config-parser';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions';
import { DefaultLogger } from '../../utils/logger/logger';

import type {
  Check,
  Step,
  TestContext,
  Parameter,
  OnSuccessObject,
  OnFailureObject,
  RuntimeExpressionContext,
  ResolvedParameter,
} from '../../types';
import type { ParameterWithoutIn } from '../config-parser';
import type { ResultObject } from './call-api-and-analyze-results';

const logger = DefaultLogger.getInstance();

export async function runStep({
  step,
  ctx,
  workflowName,
  parentStepId,
  parentWorkflowId,
  retriesLeft,
}: {
  step: Step;
  ctx: TestContext;
  workflowName: string | undefined;
  parentStepId?: string;
  parentWorkflowId?: string;
  retriesLeft?: number;
}): Promise<{ shouldEnd: boolean } | void> {
  const workflow = ctx.workflows.find((w) => w.workflowId === workflowName);
  const { stepId, onFailure, onSuccess, workflowId, parameters } = step;

  const failureActionsToRun = (onFailure || workflow?.failureActions || []).map(
    (action) => resolveReusableComponentItem(action, ctx) as OnFailureObject
  );
  const successActionsToRun = (onSuccess || workflow?.successActions || []).map(
    (action) => resolveReusableComponentItem(action, ctx) as OnSuccessObject
  );

  const resolvedParameters = parameters?.map(
    (parameter) => resolveReusableComponentItem(parameter, ctx) as ResolvedParameter
  );

  if (workflowId) {
    const resolvedWorkflow =
      ctx.workflows.find((w) => w.workflowId === workflowId) ||
      getValueFromContext(workflowId, ctx);

    if (!resolvedWorkflow) {
      const failedCall: Check = {
        name: CHECKS.UNEXPECTED_ERROR,
        message: `Workflow ${red(workflowId)} not found.`,
        pass: false,
        severity: ctx.severity['UNEXPECTED_ERROR'],
      };
      step.checks.push(failedCall);
      return;
    }

    const workflowCtx = await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx);

    if (resolvedParameters && resolvedParameters.length) {
      // When the step in context specifies a workflowId, then all parameters without `in` maps to workflow inputs.
      const workflowInputParameters = resolvedParameters
        .filter(isParameterWithoutIn)
        .reduce((acc, parameter: ParameterWithoutIn) => {
          // Ensure parameter is of type ParameterWithoutIn
          acc[parameter.name] = getValueFromContext(parameter.value, ctx);
          return acc;
        }, {} as Record<string, any>);

      workflowCtx.$workflows[resolvedWorkflow.workflowId].inputs = workflowInputParameters;
    }

    const stepWorkflowResult = await runWorkflow({
      workflowInput: resolvedWorkflow,
      ctx: workflowCtx,
      parentWorkflowId: workflowId || parentWorkflowId,
      parentStepId: parentStepId || stepId,
    });

    // FIXME
    if (stepWorkflowResult?.steps) {
      const innerSteps = stepWorkflowResult.steps as Step[];
      // merge all checks from all steps in executed workflow
      step.checks = innerSteps.flatMap(({ checks }) => checks);
    }

    if (step?.outputs && stepWorkflowResult?.outputs) {
      try {
        for (const [outputKey, outputValue] of Object.entries(step.outputs)) {
          // need to partially emulate $outputs context
          step.outputs[outputKey] = evaluateRuntimeExpressionPayload({
            payload: outputValue,
            context: {
              $outputs: stepWorkflowResult.outputs,
            } as RuntimeExpressionContext,
          });
        }
      } catch (error: any) {
        const failedCall: Check = {
          name: CHECKS.UNEXPECTED_ERROR,
          message: error.message,
          pass: false,
          severity: ctx.severity['UNEXPECTED_ERROR'],
        };
        step.checks.push(failedCall);
        return;
      }

      // save local $steps context
      ctx.$steps[stepId] = {
        outputs: step?.outputs,
      };

      // save local $steps context to parent workflow
      if (workflow?.workflowId) {
        ctx.$workflows[workflow.workflowId].steps[stepId] = {
          outputs: step?.outputs,
          request: undefined,
          response: undefined,
        };
      }
    }

    return { shouldEnd: false };
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
  let requestData: ResultObject['requestData'] | undefined;

  try {
    if (!workflowName) {
      throw new Error('Workflow name is required to run a step');
    }

    requestData = await prepareRequest(ctx, step, workflowName);

    const checksResult = await callAPIAndAnalyzeResults({
      ctx,
      workflowName,
      step,
      requestData,
    });

    allChecksPassed = Object.values(checksResult).every((check) => check);

    // we need to handle retry action separatelly as it should replace the current step state and should not log
    if (failureActionsToRun.length && !allChecksPassed) {
      const result = await runActions(failureActionsToRun, ['retry']);
      if (result?.retriesLeft && result.retriesLeft > 0) {
        // if retriesLeft > 0, it means that the step was retried successfully and we need
        // to stop output logs and return step result to the outer workflow
        return result.stepResult;
      }
    }
  } catch (e: any) {
    step.verboseLog = ctx.apiClient.getVerboseResponseLogs();

    const failedCall: Check = {
      name: CHECKS.UNEXPECTED_ERROR,
      message: e.message,
      pass: false,
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
  }

  // onFailure handle 'goto' and 'end'.
  if (failureActionsToRun.length && !allChecksPassed) {
    const result = await runActions(failureActionsToRun, ['end', 'goto']); // retry is handled earlier
    if (result?.shouldEnd) {
      return { shouldEnd: true };
    }
  }

  if (successActionsToRun.length && allChecksPassed) {
    const result = await runActions(successActionsToRun, ['end', 'goto']);
    if (result?.shouldEnd) {
      return { shouldEnd: true };
    }
  }

  // Internal function to run actions
  async function runActions(
    actions: OnFailureObject[] | OnSuccessObject[],
    onlyTypes?: ('end' | 'goto' | 'retry')[]
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
        workflowId: workflowName,
        step,
        criteria,
        ctx,
      }).every((check) => check.pass);

      if (matchesCriteria) {
        if (onlyTypes && !onlyTypes.includes(type)) {
          break;
        }

        const targetWorkflow = action.workflowId
          ? getValueFromContext(action.workflowId, ctx)
          : undefined;
        const targetCtx = action.workflowId
          ? await resolveWorkflowContext(action.workflowId, targetWorkflow, ctx)
          : ctx;
        const targetStep = action.stepId ? step.stepId : undefined;

        if (type === 'retry') {
          const { retryAfter, retryLimit = 0 } = action;
          retriesLeft = retriesLeft ?? retryLimit;
          if (retriesLeft === 0) {
            return { retriesLeft: 0, shouldEnd: false };
          }
          await delay(retryAfter);
          logger.log(
            `\n  Retrying step ${blue(stepId)} attempt # ${retryLimit - retriesLeft + 1}\n`
          );
          if (targetWorkflow) {
            await runWorkflow({
              workflowInput: targetWorkflow,
              ctx: targetCtx,
              parentWorkflowId: workflowName,
              fromStepId: targetStep,
            });
          } else if (targetStep) {
            const stepToRun = workflow?.steps.find((s) => s.stepId === targetStep) as Step;
            if (!stepToRun) {
              throw new Error(`Step ${targetStep} not found in workflow ${workflowName}`);
            }
            await runStep({
              step: stepToRun,
              ctx: targetCtx,
              workflowName: workflowName as string,
            });
          }
          return {
            stepResult: await runStep({
              step,
              ctx,
              workflowName,
              parentStepId: stepId,
              parentWorkflowId: workflowName,
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
          await runWorkflow({
            workflowInput: targetWorkflow || workflow,
            ctx: targetCtx,
            parentWorkflowId: workflowName,
            fromStepId: targetStep,
          });
          return { shouldEnd: true };
        }
        // stop at first matching action
        break;
      }
    }
  }
}
