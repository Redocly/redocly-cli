import {
  type Config,
  type CollectFn,
  type LoggerInterface,
  type BaseResolver,
} from '@redocly/openapi-core';
import { runTestFile } from './modules/flow-runner/index.js';
import { displayErrors, displaySummary, calculateTotals } from './modules/logger-output/index.js';
import { Timer } from './modules/timeout-timer/timer.js';
import { type ExecutedStepsCount, type RunFileResult, type RunOptions } from './types.js';

export type RespectOptions = {
  files: string[];
  input?: string | string[];
  server?: string | string[];
  workflow?: string[];
  skip?: string[];
  verbose?: boolean;
  severity?: string;
  config: Config;
  maxSteps: number;
  maxFetchTimeout: number;
  executionTimeout?: number;
  collectSpecData?: CollectFn;
  requestFileLoader: { getFileBody: (filePath: string) => Promise<Blob> };
  envVariables?: Record<string, string>;
  version?: string;
  logger: LoggerInterface;
  fetch: typeof fetch;
  externalRefResolver?: BaseResolver;
  skipLint?: boolean;
  secretsReveal?: boolean;
};

export async function run(options: RespectOptions): Promise<RunFileResult[]> {
  const executedStepsCount = { value: 0 };
  const { files, executionTimeout, collectSpecData } = options;

  // Don't create a timer if executionTimeout is not set
  if (executionTimeout) {
    Timer.reset();
    Timer.getInstance(executionTimeout);
  }

  const testsRunProblemsStatus: boolean[] = [];
  const runAllFilesResult = [];

  for (const path of files) {
    const result = await runFile({
      options: { ...options, file: path },
      startedAt: performance.now(),
      collectSpecData,
      executedStepsCount,
    });

    testsRunProblemsStatus.push(result.hasProblems);
    runAllFilesResult.push(result);
  }

  return runAllFilesResult;
}

async function runFile({
  options,
  startedAt,
  executedStepsCount,
  collectSpecData,
}: {
  options: RunOptions;
  startedAt: number;
  executedStepsCount: ExecutedStepsCount;
  collectSpecData?: CollectFn;
}): Promise<RunFileResult> {
  const result = await runTestFile({ options, collectSpecData, executedStepsCount });

  const { executedWorkflows, ctx } = result;
  const totals = calculateTotals(executedWorkflows);
  const hasProblems = totals.workflows.failed > 0;
  const hasWarnings = totals.workflows.warnings > 0;
  const hasGlobalTimeoutError = executedWorkflows.some((workflow) => workflow.globalTimeoutError);

  if (totals.steps.failed > 0 || totals.steps.warnings > 0 || totals.steps.skipped > 0) {
    displayErrors(executedWorkflows, options.logger);
  }

  displaySummary({ startedAt, workflows: executedWorkflows, options });

  return {
    hasProblems,
    hasWarnings,
    file: options.file,
    executedWorkflows,
    options,
    ctx,
    totalTimeMs: performance.now() - startedAt,
    totalRequests: totals.totalRequests,
    globalTimeoutError: hasGlobalTimeoutError,
    ...(ctx.secretsReveal && { secretValues: Array.from(ctx.secretsSet) || [] }),
  };
}
