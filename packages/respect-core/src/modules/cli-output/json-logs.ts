import { maskSecrets } from './mask-secrets';

import type {
  TestContext,
  JsonLogs,
  WorkflowExecutionResult,
  WorkflowExecutionResultJson,
  Step,
  StepExecutionResult,
  Check,
} from '../../types';

export function composeJsonLogsFiles(
  filesResult: {
    file: string;
    hasProblems: boolean;
    hasWarnings?: boolean;
    totalRequests: number;
    totalTimeMs: number;
    executedWorkflows: WorkflowExecutionResult[];
    argv?: { workflow?: string[]; skip?: string[] };
    ctx: TestContext;
  }[]
): JsonLogs['files'] {
  const files: JsonLogs['files'] = {};

  for (const fileResult of filesResult) {
    const { executedWorkflows } = fileResult;
    const { secretFields } = fileResult.ctx;

    files[fileResult.file] = maskSecrets(
      {
        totalRequests: fileResult.totalRequests,
        executedWorkflows: executedWorkflows.map((workflow) => {
          const steps = workflow.executedSteps.map((step) =>
            composeJsonSteps(step, workflow.workflowId, fileResult.ctx)
          );

          const result: WorkflowExecutionResultJson = {
            ...workflow,
            executedSteps: steps,
            status: fileResult.hasProblems ? 'error' : fileResult.hasWarnings ? 'warn' : 'success',
            totalTimeMs: fileResult.totalTimeMs,
          };

          return result;
        }),
      },
      secretFields || new Set()
    );
  }

  return files;
}

function composeJsonSteps(
  step: Step | WorkflowExecutionResult,
  workflowId: string,
  ctx: TestContext
): StepExecutionResult | WorkflowExecutionResult {
  if ('executedSteps' in step) {
    return step as WorkflowExecutionResult;
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
