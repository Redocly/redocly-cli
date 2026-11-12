import type {
  Check,
  JsonLogs,
  PublicWorkflowStep,
  RunFileResult,
  Step,
  StepExecutionResult,
  TestContext,
  WorkflowExecutionResult,
  WorkflowExecutionResultJson,
} from '../../types.js';
import { calculateTotals } from './calculate-tests-passed.js';
import { conditionallyMaskSecrets } from './mask-secrets.js';

export function composeJsonLogs(filesResult: RunFileResult[], totalTime: number): JsonLogs {
  const hasProblems = filesResult.some((result) => result.hasProblems);
  const hasWarnings = filesResult.some((result) => result.hasWarnings);

  return {
    files: composeJsonLogsFiles(filesResult),
    status: hasProblems ? 'error' : hasWarnings ? 'warn' : 'success',
    totalTime,
  };
}

function composeJsonLogsFiles(filesResult: RunFileResult[]): JsonLogs['files'] {
  const files: JsonLogs['files'] = {};

  for (const fileResult of filesResult) {
    const {
      executedWorkflows,
      globalTimeoutError: fileGlobalTimeoutError,
      ctx,
      secretValues,
    } = fileResult;

    files[fileResult.file] = conditionallyMaskSecrets({
      value: {
        totalRequests: fileResult.totalRequests,
        executedWorkflows: executedWorkflows.map((workflow) => mapJsonWorkflow(workflow)),
        totalTimeMs: fileResult.totalTimeMs,
        globalTimeoutError: fileGlobalTimeoutError,
        secretValues,
      },
      noSecretsMasking: ctx.noSecretsMasking,
      secretsSet: ctx.secretsSet || new Set(),
    });
  }

  return files;
}

function mapJsonWorkflow(workflow: WorkflowExecutionResult): WorkflowExecutionResultJson {
  const { ctx, ...rest } = workflow;
  const steps = workflow.executedSteps.map((step) => mapJsonStep(step, workflow.workflowId, ctx));

  const totals = calculateTotals([workflow]);

  const result: WorkflowExecutionResultJson = {
    ...rest,
    executedSteps: steps,
    status: totals.steps.failed > 0 ? 'error' : totals.steps.warnings > 0 ? 'warn' : 'success',
    totalRequests: totals.totalRequests,
    totalTimeMs: workflow.totalTimeMs,
  };

  return result;
}

function mapJsonStep(
  step: Step | WorkflowExecutionResult,
  workflowId: string,
  ctx: TestContext
): StepExecutionResult | WorkflowExecutionResultJson {
  if ('executedSteps' in step) {
    return mapJsonWorkflow(step as WorkflowExecutionResult);
  }

  // synthetic steps (e.g. a failed dependsOn resolution) have no declared
  // counterpart in the workflow, so there is no public step to read from
  const publicStep = ctx.$workflows[workflowId].steps[step.stepId] as
    | PublicWorkflowStep
    | undefined;
  return {
    type: 'step',
    stepId: step.stepId,
    workflowId,
    request: {
      method: publicStep?.request?.method || '',
      url: step.response?.requestUrl || '',
      headers: publicStep?.request?.header || {},
      body: publicStep?.request?.body,
    },
    response: {
      statusCode: step.response?.statusCode || 0,
      body: publicStep?.response?.body,
      headers: step.response?.header || {},
      time: step.response?.time || 0,
      size: step.response?.responseSize,
    },
    checks: step.checks.map((check) => ({
      ...check,
      status: calculateCheckStatus(check),
    })),
    totalTimeMs: publicStep?.response?.time || 0,
    retriesLeft: step.retriesLeft,
    status: calculateStepStatus(step.checks),
  };
}

function calculateCheckStatus(check: Check): 'success' | 'error' | 'warn' {
  if (check.passed) {
    return 'success';
  }
  if (check.severity === 'error') {
    return 'error';
  }
  return 'warn';
}

function calculateStepStatus(checks: Check[]): 'success' | 'error' | 'warn' {
  let hasWarning = false;
  for (const check of checks) {
    if (!check.passed && check.severity === 'error') {
      return 'error';
    }
    if (!check.passed && check.severity === 'warn') {
      hasWarning = true;
    }
  }

  return hasWarning ? 'warn' : 'success';
}
