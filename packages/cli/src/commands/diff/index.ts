import {
  AbortFlowError,
  BaseResolver,
  diffDocuments,
  HandledError,
  formatProblems,
  getTotals,
  logger,
  type JudgedChange,
} from '@redocly/openapi-core';
import { green } from 'colorette';
import { writeFileSync } from 'node:fs';

import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { checkVersion } from './check-version.js';
import { getDiffFailure } from './fail-on.js';
import { printGithubActions } from './format/github-actions.js';
import { diffReportFormats } from './format/index.js';
import type { DiffArgv } from './types.js';

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  if (argv.output && argv.format === 'github-actions') {
    throw new HandledError(
      `The github-actions format prints to stdout only. To write a report to a file, use one of these formats: ${Object.keys(diffReportFormats).join(', ')}.`
    );
  }

  const startedAt = performance.now();

  config.skipDiffRules(argv['skip-rule']);

  const [{ path: basePath }] = await getFallbackApisOrExit([argv.base], config);
  const [{ path: revisionPath }] = await getFallbackApisOrExit([argv.revision], config);

  // One resolver loads both documents and resolves their `$ref`s, as lint does.
  const externalRefResolver = new BaseResolver(config.resolve);
  const load = async (documentPath: string) => {
    const document = await externalRefResolver.resolveDocument(null, documentPath, true);
    if (document instanceof Error) throw document;
    return document;
  };
  const [base, revision] = await Promise.all([load(basePath), load(revisionPath)]);

  collectSpecData?.(revision);

  const result = await diffDocuments({ base, revision, config, externalRefResolver });

  if (result.problems.length) {
    formatProblems(result.problems, {
      format: 'codeframe',
      totals: getTotals(result.problems),
      command: 'bundle',
    });
    logger.warn(
      '⚠️  The problems above leave parts of the descriptions unresolved, so the diff may miss changes there or judge them without knowing whether they are in a request or a response.\n'
    );
  }

  result.changes.sort(byKeyAndProperty);

  if (argv.format === 'github-actions') {
    printGithubActions(result);
  } else if (argv.output) {
    writeFileSync(argv.output, diffReportFormats[argv.format](result));
    logger.info(`Diff report written to ${argv.output}.\n`);
  } else {
    logger.output(diffReportFormats[argv.format](result) + '\n');
  }

  printExecutionTime('diff', startedAt, `${basePath} vs ${revisionPath}`);

  const failures = [
    getDiffFailure(result.summary, argv['fail-on']),
    argv['check-version'] &&
      checkVersion({
        base: result.infoVersions.base,
        revision: result.infoVersions.revision,
        required: result.bump,
      }),
  ].filter((failure) => typeof failure === 'string');

  if (failures.length) {
    for (const failure of failures) logger.error(`${failure}\n`);

    throw new AbortFlowError('Diff failed.');
  }

  logger.info(green('✅ Diff passed.\n'));
}

function byKeyAndProperty(left: JudgedChange, right: JudgedChange): number {
  if (left.key !== right.key) return left.key < right.key ? -1 : 1;

  const leftProperty = left.kind === 'modified' ? left.property : '';
  const rightProperty = right.kind === 'modified' ? right.property : '';
  if (leftProperty !== rightProperty) return leftProperty < rightProperty ? -1 : 1;

  return 0;
}
