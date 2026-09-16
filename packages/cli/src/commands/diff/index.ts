import {
  breakingChangesToProblems,
  bundle,
  DiffError,
  diffDocuments,
  diffReportFormats,
  formatProblems,
  getTotals,
  logger,
  type DiffReportFormat,
  type DiffResult,
  type OutputFormat,
} from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';

import type { VerifyConfigOptions } from '../../types.js';
import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { getDiffFailure, type DiffFailOn } from './fail-on.js';

/**
 * Formats delegated to core's lint formatters. They describe breaking changes
 * only, because a lint problem always carries a severity (see core diff/format/problems.ts).
 */
export type DiffProblemFormat = Extract<
  OutputFormat,
  'codeframe' | 'checkstyle' | 'codeclimate' | 'summary' | 'github-actions' | 'junit'
>;

export type DiffOutputFormat = DiffReportFormat | DiffProblemFormat;
export type { DiffFailOn };

export type DiffArgv = {
  base: string;
  revision: string;
  format: DiffOutputFormat;
  output?: string;
  'fail-on': DiffFailOn;
} & VerifyConfigOptions;

function isReportFormat(format: DiffOutputFormat): format is DiffReportFormat {
  return format in diffReportFormats;
}

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  if (argv.output && !isReportFormat(argv.format)) {
    return exitWithError(
      `The ${argv.format} format prints to stdout only. To write a report to a file, use one of these formats: ${Object.keys(diffReportFormats).join(', ')}.`
    );
  }

  const startedAt = performance.now();
  const [{ path: basePath }] = await getFallbackApisOrExit([argv.base], config);
  const [{ path: revisionPath }] = await getFallbackApisOrExit([argv.revision], config);

  const { bundle: baseDocument } = await bundle({ config, ref: basePath });
  const { bundle: revisionDocument } = await bundle({ config, ref: revisionPath });
  collectSpecData?.(revisionDocument);

  let result: DiffResult;
  try {
    result = diffDocuments({ base: baseDocument, revision: revisionDocument, config });
  } catch (error) {
    if (error instanceof DiffError) {
      return exitWithError(error.message);
    }
    throw error;
  }

  if (isReportFormat(argv.format)) {
    const output = diffReportFormats[argv.format](result);
    if (argv.output) {
      writeFileSync(argv.output, output);
      logger.info(`Diff report written to ${argv.output}.\n`);
    } else {
      logger.output(output + '\n');
    }
  } else {
    const problems = breakingChangesToProblems(result);
    formatProblems(problems, {
      format: argv.format,
      totals: getTotals(problems),
      maxProblems: problems.length,
    });
  }

  printExecutionTime('diff', startedAt, `${basePath} vs ${revisionPath}`);

  const failure = getDiffFailure(result.summary, argv['fail-on']);
  if (failure) {
    logger.error(`${failure}\n`);
    throw new AbortFlowError('Diff failed.');
  }
}
