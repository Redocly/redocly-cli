import { bgRed, red } from 'colorette';
import { runTestFile } from '../modules/flow-runner';
import {
  displayErrors,
  displaySummary,
  displayFilesSummaryTable,
  calculateTotals,
} from '../modules/output';
import { DefaultLogger } from '../utils/logger/logger';

import type { RunArgv } from '../types';

const logger = DefaultLogger.getInstance();
export async function handleRun(argv: any) {
  const harOutputFile = argv['har-output'];
  if (harOutputFile && !harOutputFile.endsWith('.har')) {
    exitWithErrorMsg('File for HAR logs should be in .har format', 1);
  }

  const jsonOutputFile = argv['json-output'];
  if (jsonOutputFile && !jsonOutputFile.endsWith('.json')) {
    exitWithErrorMsg('File for JSON logs should be in .json format', 1);
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

    if (files.length > 1 && (jsonOutputFile || harOutputFile)) {
      // TODO: implement multiple run files logs output
      exitWithErrorMsg(
        'Currently only a single file can be run with --har-output or --json-output. Please run a single file at a time.',
        1
      );
    }

    for (const path of files) {
      const result = await runFile({ ...argv, file: path }, startedAt, {
        harFile: harOutputFile,
        jsonFile: jsonOutputFile,
      });
      testsRunProblemsStatus.push(result.hasProblems);
      runAllFilesResult.push(result);
    }

    logger.printNewLine();
    displayFilesSummaryTable(runAllFilesResult);
    logger.printNewLine();

    if (testsRunProblemsStatus.some((problems) => problems)) {
      exitWithErrorMsg(' Tests exited with error ', 1); // todo check this
    }
  } catch (err) {
    exitWithErrorMsg((err as Error)?.message ?? err, 1);
  }
}

async function runFile(
  argv: RunArgv,
  startedAt: number,
  output: { harFile: string | undefined; jsonFile: string | undefined }
) {
  const { workflows } = await runTestFile(argv as RunArgv, output);

  const totals = calculateTotals(workflows);
  const hasProblems = totals.workflows.failed > 0;

  if (totals.steps.failed > 0 || totals.steps.warnings > 0 || totals.steps.skipped > 0) {
    displayErrors(workflows);
  }

  displaySummary(startedAt, workflows, argv);

  return { hasProblems, file: argv.file, workflows, argv };
}

const exitWithErrorMsg = (message: string, code: 0 | 1 = 1) => {
  logger.error(bgRed(message));
  logger.printNewLine();
  process.exit(code);
};
