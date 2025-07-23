import { maskSecrets, calculateTotals } from '@redocly/respect-core';

import type {
  TestContext,
  JsonLogs,
  WorkflowExecutionResult,
  WorkflowExecutionResultJson,
  Step,
  StepExecutionResult,
  Check,
} from '@redocly/respect-core';

export function composeJsonLogsFiles(
  filesResult: {
    file: string;
    totalRequests: number;
    totalTimeMs: number;
    executedWorkflows: WorkflowExecutionResult[];
    ctx: TestContext;
    globalTimeoutError: boolean;
  }[]
): JsonLogs['files'] {
  const files: JsonLogs['files'] = {};

  for (const fileResult of filesResult) {
    const { executedWorkflows, globalTimeoutError: fileGlobalTimeoutError } = fileResult;
    const { secretFields } = fileResult.ctx;

    files[fileResult.file] = maskSecrets(
      {
        totalRequests: fileResult.totalRequests,
        executedWorkflows: executedWorkflows.map((workflow) => mapJsonWorkflow(workflow)),
        totalTimeMs: fileResult.totalTimeMs,
        globalTimeoutError: fileGlobalTimeoutError,
      },
      secretFields || new Set()
    );
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

  const publicStep = ctx.$workflows[workflowId].steps[step.stepId];
  return {
    type: 'step',
    stepId: step.stepId,
    workflowId,
    request: {
      method: publicStep.request?.method || '',
      url: step.response?.requestUrl || '',
      headers: publicStep.request?.header || {},
      body: publicStep.request?.body,
    },
    response: {
      statusCode: step.response?.statusCode || 0,
      body: publicStep.response?.body,
      headers: step.response?.header || {},
      time: step.response?.time || 0,
    },
    checks: step.checks.map((check) => ({
      ...check,
      status: calculateCheckStatus(check),
    })),
    totalTimeMs: publicStep.response?.time || 0,
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
