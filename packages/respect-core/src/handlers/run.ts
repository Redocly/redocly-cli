import { blue, green, red } from 'colorette';
import { type CollectFn } from '@redocly/openapi-core/src/utils';
import { runTestFile } from '../modules/flow-runner';
import {
  displayErrors,
  displaySummary,
  displayFilesSummaryTable,
  calculateTotals,
  composeJsonLogsFiles,
} from '../modules/cli-output';
import { DefaultLogger } from '../utils/logger/logger';
import { exitWithError } from '../utils/exit-with-error';
import { writeFileSync } from 'node:fs';
import { indent } from '../utils/cli-outputs';
import { isTimedOut } from '../modules/timeout-timer';
import { type JsonLogs, type CommandArgs, type RunArgv } from '../types';

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
  'max-steps'?: number;
  severity?: string;
  config?: never;
};

const logger = DefaultLogger.getInstance();
export async function handleRun({ argv, collectSpecData }: CommandArgs<RespectOptions>) {
  const harOutputFile = argv['har-output'];
  if (harOutputFile && !harOutputFile.endsWith('.har')) {
    throw new Error('File for HAR logs should be in .har format');
  }

  const jsonOutputFile = argv['json-output'];
  if (jsonOutputFile && !jsonOutputFile.endsWith('.json')) {
    throw new Error('File for JSON logs should be in .json format');
  }

  const { skip, workflow } = argv;

  if (skip && workflow) {
    logger.printNewLine();
    logger.log(red(`Cannot use both --skip and --workflow flags at the same time.`));
    return;
  }

  try {
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
        startedAt,
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
            globalTimeoutError: isTimedOut(startedAt),
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
  } catch (err) {
    exitWithError((err as Error)?.message ?? err);
  }
}

async function runFile(
  argv: RunArgv,
  startedAt: number,
  output: { harFile: string | undefined },
  sessionStartTime: number,
  collectSpecData?: CollectFn
) {
  const { executedWorkflows, ctx } = await runTestFile(
    argv,
    output,
    sessionStartTime,
    collectSpecData
  );
  const totals = calculateTotals(executedWorkflows);
  const hasProblems = totals.workflows.failed > 0;
  const hasWarnings = totals.workflows.warnings > 0;

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
    globalTimeoutError: isTimedOut(sessionStartTime),
  };
}
