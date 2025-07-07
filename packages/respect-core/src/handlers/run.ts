import { type Config, type CollectFn } from '@redocly/openapi-core';
import { runTestFile } from '../modules/flow-runner/index.js';
import {
  displayErrors,
  displaySummary,
  calculateTotals,
  maskSecrets,
} from '../modules/cli-output/index.js';
import { Timer } from '../modules/timeout-timer/timer.js';
import { writeFileSync } from 'node:fs';
import { blue, green } from 'colorette';
import { DefaultLogger } from '../utils/logger/logger.js';

import type { RunFileResult, RunOptions } from '../types.js';

const logger = DefaultLogger.getInstance();

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
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
  maxSteps: number;
  maxFetchTimeout: number;
  executionTimeout: number;
  collectSpecData?: CollectFn;
};

export async function handleRun(options: RespectOptions): Promise<RunFileResult[]> {
  const { files, executionTimeout, harOutput, collectSpecData } = options;

  Timer.getInstance(executionTimeout);

  const testsRunProblemsStatus: boolean[] = [];
  const runAllFilesResult = [];

  for (const path of files) {
    const result = await runFile({
      options: { ...options, file: path },
      startedAt: performance.now(),
      output: {
        harFile: harOutput,
      },
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
  output,
  collectSpecData,
}: {
  options: RunOptions;
  startedAt: number;
  output: { harFile: string | undefined };
  collectSpecData?: CollectFn;
}): Promise<RunFileResult> {
  const result = await runTestFile(options, collectSpecData);

  //TODO: move to the upper level
  if (output?.harFile && Object.keys(result.harLogs).length) {
    const parsedHarLogs = maskSecrets(result.harLogs, result.ctx.secretFields || new Set());
    writeFileSync(output.harFile, JSON.stringify(parsedHarLogs, null, 2), 'utf-8');
    logger.log(blue(`Har logs saved in ${green(output.harFile)}`));
    logger.printNewLine();
    logger.printNewLine();
  }

  const { executedWorkflows, ctx } = result;
  const totals = calculateTotals(executedWorkflows);
  const hasProblems = totals.workflows.failed > 0;
  const hasWarnings = totals.workflows.warnings > 0;
  const hasGlobalTimeoutError = executedWorkflows.some((workflow) => workflow.globalTimeoutError);

  if (totals.steps.failed > 0 || totals.steps.warnings > 0 || totals.steps.skipped > 0) {
    displayErrors(executedWorkflows);
  }

  displaySummary(startedAt, executedWorkflows, options);

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
  };
}
