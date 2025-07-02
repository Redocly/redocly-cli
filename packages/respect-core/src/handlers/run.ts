import { blue, green } from 'colorette';
import { type CollectFn } from '@redocly/openapi-core';
import { runTestFile } from '../modules/flow-runner/index.js';
import {
  displayErrors,
  displaySummary,
  displayFilesSummaryTable,
  calculateTotals,
  composeJsonLogsFiles,
} from '../modules/cli-output/index.js';
import { DefaultLogger } from '../utils/logger/logger.js';
// import { exitWithError } from '../utils/exit-with-error.js';
import { writeFileSync } from 'node:fs';
import { indent } from '../utils/cli-outputs.js';
import { Timer } from '../modules/timeout-timer/timer.js';

import type { JsonLogs, CommandArgs, RunArgv } from '../types.js';

export type RespectOptions = {
  files: string[];
  input?: string;
  server?: string;
  workflow?: string[];
  skip?: string[];
  verbose?: boolean;
  'har-output'?: string;
  'json-output'?: string;
  'client-cert'?: string;
  'client-key'?: string;
  'ca-cert'?: string;
  'max-steps': number;
  severity?: string;
  config?: never;
  'max-fetch-timeout': number;
  'execution-timeout': number;
};

const logger = DefaultLogger.getInstance();
export async function handleRun({ argv, collectSpecData }: CommandArgs<RespectOptions>) {
  const harOutputFile = argv['har-output'];
  const jsonOutputFile = argv['json-output'];

  // try {
  Timer.getInstance(argv['execution-timeout']);
  const startedAt = performance.now();
  const testsRunProblemsStatus: boolean[] = [];
  const { files } = argv;
  const runAllFilesResult = [];

  if (files.length > 1 && harOutputFile) {
    // TODO: implement multiple run files HAR output
    throw new Error(
      'Currently only a single file can be run with --har-output. Please run a single file at a time.'
    );
  }

  for (const path of files) {
    const result = await runFile(
      { ...argv, file: path },
      performance.now(),
      {
        harFile: harOutputFile,
      },
      collectSpecData
    );
    testsRunProblemsStatus.push(result.hasProblems);
    runAllFilesResult.push(result);
  }

  const hasProblems = runAllFilesResult.some((result) => result.hasProblems);
  const hasWarnings = runAllFilesResult.some((result) => result.hasWarnings);

  logger.printNewLine();
  displayFilesSummaryTable(runAllFilesResult);
  logger.printNewLine();

  if (jsonOutputFile) {
    writeFileSync(
      jsonOutputFile,
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
    logger.log(blue(indent(`JSON logs saved in ${green(jsonOutputFile)}`, 2)));
    logger.printNewLine();
    logger.printNewLine();
  }

  if (hasProblems) {
    throw new Error(' Tests exited with error ');
  }
  // } catch (err) {
  //   console.log("err ==>", err);
  //   // throw new Error((err as Error)?.message ?? err);
  //   exitWithError((err as Error)?.message ?? err);
  // }
}

async function runFile(
  argv: RunArgv,
  startedAt: number,
  output: { harFile: string | undefined },
  collectSpecData?: CollectFn
) {
  const { executedWorkflows, ctx } = await runTestFile(argv, output, collectSpecData);

  const totals = calculateTotals(executedWorkflows);
  const hasProblems = totals.workflows.failed > 0;
  const hasWarnings = totals.workflows.warnings > 0;
  const hasGlobalTimeoutError = executedWorkflows.some((workflow) => workflow.globalTimeoutError);

  if (totals.steps.failed > 0 || totals.steps.warnings > 0 || totals.steps.skipped > 0) {
    displayErrors(executedWorkflows);
  }

  displaySummary(startedAt, executedWorkflows, argv);

  return {
    hasProblems,
    hasWarnings,
    file: argv.file,
    executedWorkflows,
    argv,
    ctx,
    totalTimeMs: performance.now() - startedAt,
    totalRequests: totals.totalRequests,
    globalTimeoutError: hasGlobalTimeoutError,
  };
}
