import { blue, white, bold, red } from 'colorette';
import { callAPIAndAnalyzeResults } from './call-api-and-analyze-results';
import { checkCriteria } from './success-criteria';
import { delay } from '../../utils/delay';
import { CHECKS } from '../checks';
import { getStepFromCtx } from './context';
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
  CriteriaObject,
  Check,
  Step,
  TestContext,
  Workflow,
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
}: {
  step: Step;
  ctx: TestContext;
  workflowName: string | undefined;
  parentStepId?: string;
  parentWorkflowId?: string;
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

    // onFailure handle 'retry'
    // When an 'end' action is encountered, the workflow will stop immediately.
    // Any remaining actions (like retries) will be skipped.
    if (failureActionsToRun.length && !allChecksPassed) {
      await runActions(failureActionsToRun, ['retry']);
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
  const serverUrl = requestData?.serverUrl?.url || '';

  if (requestData?.path || serverUrl) {
    printStepDetails({
      testNameToDisplay: requestData?.path
        ? `${requestData.method.toUpperCase()} ${white(requestData.path)}${
            step.stepId ? ` ${blue('- step')} ${white(bold(step.stepId))}` : ''
          }`
        : `${requestData?.method.toUpperCase()} ${white(serverUrl)}${
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

  async function runActions(
    actions: OnFailureObject[] | OnSuccessObject[],
    onlyTypes?: ('end' | 'goto' | 'retry')[]
  ): Promise<{ shouldEnd: boolean } | void> {
    for (const item of actions) {
      const { type, criteria } = item;

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

        if (type === 'retry') {
          await handleRetryActions({
            resolvedFailureAction: item,
            ctx,
            workflowName: workflowName || '',
            stepId,
            step,
          });
        } else if (type === 'end') {
          return handleEndActions();
        } else if (type === 'goto') {
          await handleGoToActions({
            resolvedAction: item,
            ctx,
            workflowName: workflowName || '',
            step,
          });
        }
        // stop at first matching action
        break;
      }
    }
  }
}

async function handleGoTo({
  currentStep,
  executingCtx,
  workflowName,
  workflowInput,
  stepId,
  criteria,
  gotoCtx,
}: {
  currentStep: Step;
  executingCtx: TestContext;
  workflowName?: string;
  workflowInput?: string | Workflow;
  stepId?: string;
  criteria: CriteriaObject[] | undefined;
  gotoCtx: TestContext;
}) {
  let criteriaPassed = true;
  if (workflowInput && stepId) {
    throw new Error(
      `Cannot use both workflowId: ${
        typeof workflowInput === 'string' ? workflowInput : workflowInput.workflowId
      } and stepId: ${stepId} in goto action`
    );
  }

  if (criteria) {
    const criteriaCheck = checkCriteria({
      workflowId: workflowName,
      step: currentStep,
      criteria: criteria,
      ctx: executingCtx,
    });

    criteriaPassed = criteriaCheck.every((check) => check.pass);
  }

  if (!criteriaPassed) {
    logger.error(`Criteria not met, skipping goto action`);
    return;
  }

  if (stepId && workflowName) {
    const gotoStep = getStepFromCtx(gotoCtx, workflowName, stepId);
    if (gotoStep) {
      await runStep({
        step: gotoStep,
        ctx: gotoCtx,
        workflowName,
      });
    }
  } else if (workflowInput) {
    await runWorkflow({
      workflowInput,
      parentWorkflowId: workflowName,
      ctx: gotoCtx,
    });
  }
}

async function handleGoToActions({
  resolvedAction,
  ctx,
  workflowName,
  step,
}: {
  resolvedAction: OnFailureObject | OnSuccessObject;
  ctx: TestContext;
  workflowName: string;
  step: Step;
}) {
  const { stepId: gotoStepId, workflowId: gotoWorkflowId, criteria } = resolvedAction;
  const resolvedGotoWorkflow = gotoWorkflowId && getValueFromContext(gotoWorkflowId, ctx);
  const workflowCtx = await resolveWorkflowContext(gotoWorkflowId, resolvedGotoWorkflow, ctx);

  await handleGoTo({
    currentStep: step,
    executingCtx: ctx,
    workflowName,
    workflowInput: resolvedGotoWorkflow,
    stepId: gotoStepId,
    criteria,
    gotoCtx: workflowCtx,
  });
}

function handleEndActions() {
  return { shouldEnd: true };
}

async function handleRetryActions({
  resolvedFailureAction,
  ctx,
  workflowName,
  stepId,
  step,
}: {
  resolvedFailureAction: OnFailureObject;
  ctx: TestContext;
  workflowName: string;
  stepId: string;
  step: Step;
}) {
  const {
    retryAfter,
    retryLimit,
    criteria,
    stepId: retryStepId,
    workflowId: retryWorkflowId,
  } = resolvedFailureAction;

  const configuredRetryLimit = retryLimit || 0;
  const retryOperation = async (
    retryLimit = 0,
    retryAfter = 0,
    criteria: CriteriaObject[] | undefined
  ) => {
    while (retryLimit > 0) {
      logger.log(
        `\n  Retrying step ${blue(stepId)} attempt # ${configuredRetryLimit - retryLimit + 1}\n`
      );

      if (retryWorkflowId && retryStepId) {
        throw new Error('Cannot use both workflowId and stepId in onFailure retry action');
      }

      const resolvedGotoWorkflow = retryWorkflowId && getValueFromContext(retryWorkflowId, ctx);
      const workflowCtx = await resolveWorkflowContext(retryWorkflowId, resolvedGotoWorkflow, ctx);

      // Step to be executed before retry
      await handleGoTo({
        currentStep: step,
        executingCtx: ctx,
        workflowName,
        workflowInput: resolvedGotoWorkflow,
        stepId: retryStepId,
        criteria,
        gotoCtx: workflowCtx,
      });

      // Restore current step params
      const requestData = await prepareRequest(ctx, step, workflowName);

      const retryResult = await callAPIAndAnalyzeResults({
        ctx,
        workflowName,
        step,
        requestData,
      });

      const allChecksPassed = Object.values(retryResult).every((check) => check);

      if (allChecksPassed) {
        break;
      }

      if (criteria && step.response) {
        const onFailureCriteriaCheck = checkCriteria({
          workflowId: workflowName,
          step,
          criteria,
          ctx,
        });

        const onFailureCriteriaPassed = onFailureCriteriaCheck.every((check) => check.pass);

        if (!onFailureCriteriaPassed) {
          break;
        }
      }

      await delay(retryAfter);
      retryLimit--;
    }
  };

  await retryOperation(retryLimit, retryAfter, criteria);
}
