import { type Config, type CollectFn, type LoggerInterface } from '@redocly/openapi-core';
import { runTestFile } from '../modules/flow-runner/index.js';
import { displayErrors, displaySummary, calculateTotals } from '../modules/cli-output/index.js';
import { Timer } from '../modules/timeout-timer/timer.js';
import { type TestContext, type RunFileResult, type RunOptions } from '../types.js';

export type RespectOptions = {
  files: string[];
  input?: string;
  server?: string;
  workflow?: string[];
  skip?: string[];
  verbose?: boolean;
  severity?: string;
  config: Config;
  harOutput?: string;
  jsonOutput?: string;
  mtlsCerts?: Partial<TestContext['mtlsCerts']>;
  maxSteps: number;
  maxFetchTimeout: number;
  executionTimeout: number;
  collectSpecData?: CollectFn;
  envVariables: Record<string, string>;
  version?: string;
  logger: LoggerInterface;
};

export async function handleRun(options: RespectOptions): Promise<RunFileResult[]> {
  const { files, executionTimeout, collectSpecData } = options;

  Timer.getInstance(executionTimeout);

  const testsRunProblemsStatus: boolean[] = [];
  const runAllFilesResult = [];

  for (const path of files) {
    const result = await runFile({
      options: { ...options, file: path },
      startedAt: performance.now(),
      collectSpecData,
    });

    testsRunProblemsStatus.push(result.hasProblems);
    runAllFilesResult.push(result);
  }

  return runAllFilesResult;
}

async function runFile({
  options,
  startedAt,
  collectSpecData,
}: {
  options: RunOptions;
  startedAt: number;
  collectSpecData?: CollectFn;
}): Promise<RunFileResult> {
  const result = await runTestFile(options, collectSpecData);

  const { executedWorkflows, ctx, harLogs } = result;
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
    harLogs,
  };
}
