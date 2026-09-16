import {
  bundle,
  DiffError,
  diffDocuments,
  diffReportFormats,
  diffToProblems,
  formatProblems,
  getTotals,
  logger,
  type DiffResult,
} from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';

import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { checkVersion, getDeclaredVersion } from './check-version.js';
import { getDiffFailure } from './fail-on.js';
import type { DiffArgv } from './types.js';

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  if (argv.output && argv.format === 'github-actions') {
    return exitWithError(
      `The github-actions format prints to stdout only. To write a report to a file, use one of these formats: ${Object.keys(diffReportFormats).join(', ')}.`
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

  if (argv.format === 'github-actions') {
    const problems = diffToProblems(result);
    formatProblems(problems, {
      format: 'github-actions',
      totals: getTotals(problems),
      maxProblems: problems.length,
    });
  } else {
    const output = diffReportFormats[argv.format](result);
    if (argv.output) {
      writeFileSync(argv.output, output);
      logger.info(`Diff report written to ${argv.output}.\n`);
    } else {
      logger.output(output + '\n');
    }
  }

  printExecutionTime('diff', startedAt, `${basePath} vs ${revisionPath}`);

  const failures: string[] = [];
  const thresholdFailure = getDiffFailure(result.summary, argv['fail-on']);
  if (thresholdFailure) failures.push(thresholdFailure);

  if (argv['check-version']) {
    const versionCheck = checkVersion({
      base: getDeclaredVersion(baseDocument),
      revision: getDeclaredVersion(revisionDocument),
      required: result.bump,
    });
    if (versionCheck.status === 'skipped') logger.warn(`${versionCheck.message}\n`);
    if (versionCheck.status === 'failed') failures.push(versionCheck.message);
  }

  if (failures.length) {
    for (const failure of failures) logger.error(`${failure}\n`);
    throw new AbortFlowError('Diff failed.');
  }
}
