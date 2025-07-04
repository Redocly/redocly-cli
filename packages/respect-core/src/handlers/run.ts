import { blue, green } from 'colorette';
import { type Config, type CollectFn } from '@redocly/openapi-core';
import { runTestFile } from '../modules/flow-runner/index.js';
import {
  displayErrors,
  displaySummary,
  displayFilesSummaryTable,
  calculateTotals,
  composeJsonLogsFiles,
} from '../modules/cli-output/index.js';
import { DefaultLogger } from '../utils/logger/logger.js';
import { writeFileSync } from 'node:fs';
import { indent } from '../utils/cli-outputs.js';
import { Timer } from '../modules/timeout-timer/timer.js';

import type { JsonLogs, RunOptions } from '../types.js';

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

const logger = DefaultLogger.getInstance();
export async function handleRun(options: RespectOptions) {
  const { files, executionTimeout, harOutput, jsonOutput, collectSpecData } = options;
  Timer.getInstance(executionTimeout);
  const startedAt = performance.now();
  const testsRunProblemsStatus: boolean[] = [];
  const runAllFilesResult = [];

  if (files.length > 1 && harOutput) {
    // TODO: implement multiple run files HAR output
    throw new Error(
      'Currently only a single file can be run with --har-output. Please run a single file at a time.'
    );
  }

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

  const hasProblems = runAllFilesResult.some((result) => result.hasProblems);
  const hasWarnings = runAllFilesResult.some((result) => result.hasWarnings);

  logger.printNewLine();
  displayFilesSummaryTable(runAllFilesResult);
  logger.printNewLine();

  if (jsonOutput) {
    writeFileSync(
      jsonOutput,
      JSON.stringify(
        {
          files: composeJsonLogsFiles(runAllFilesResult),
          status: hasProblems ? 'error' : hasWarnings ? 'warn' : 'success',
          totalTime: performance.now() - startedAt,
        } as JsonLogs,
        null,
        2
      ),
      'utf-8'
    );
    logger.log(blue(indent(`JSON logs saved in ${green(jsonOutput)}`, 2)));
    logger.printNewLine();
    logger.printNewLine();
  }

  if (hasProblems) {
    throw new Error(' Tests exited with error ');
  }
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
}) {
  const { executedWorkflows, ctx } = await runTestFile(options, output, collectSpecData);

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
