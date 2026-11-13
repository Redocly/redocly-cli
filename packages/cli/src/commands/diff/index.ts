import {
  AbortFlowError,
  diffDocuments,
  HandledError,
  formatProblems,
  getTotals,
  logger,
  type Config,
  type JudgedChange,
} from '@redocly/openapi-core';
import { green } from 'colorette';
import { writeFileSync } from 'node:fs';

import type { Entrypoint } from '../../types.js';
import {
  getAliasOrPath,
  getFallbackApisOrExit,
  handleError,
  printExecutionTime,
} from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { checkVersion } from './check-version.js';
import { getDiffFailure } from './fail-on.js';
import { printGithubActions } from './format/github-actions.js';
import { diffReportFormats } from './format/index.js';
import { GitRevisionResolver, isGitRevisionFile, locateRevisionFile } from './git-revision.js';
import type { DiffArgv } from './types.js';

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  if (argv.output && argv.format === 'github-actions') {
    throw new HandledError(
      `The github-actions format prints to stdout only. To write a report to a file, use one of these formats: ${Object.keys(diffReportFormats).join(', ')}.`
    );
  }

  const startedAt = performance.now();

  const [{ path: basePath }, { path: revisionPath, alias: revisionAlias }] = await Promise.all(
    [argv.base, argv.revision].map((api) => findEntrypoint(api, config))
  );

  const diffConfig = config.forAlias(revisionAlias);
  diffConfig.skipDiffRules(argv['skip-rule']);

  // One resolver loads both documents and resolves their `$ref`s, as lint does.
  const externalRefResolver = new GitRevisionResolver(config.resolve);
  const load = async (documentPath: string) => {
    try {
      const document = await externalRefResolver.resolveDocument(null, documentPath, true);
      if (document instanceof Error) throw document;
      return document;
    } catch (error) {
      handleError(error, documentPath);
    }
  };
  const [base, revision] = await Promise.all([load(basePath), load(revisionPath)]);

  collectSpecData?.(revision);

  const result = await diffDocuments({ base, revision, config: diffConfig, externalRefResolver });

  if (result.problems.length) {
    formatProblems(result.problems, {
      format: 'codeframe',
      totals: getTotals(result.problems),
      command: 'diff',
    });
    logger.warn(
      '⚠️  The problems above leave parts of the descriptions unresolved, so the diff may miss changes there or judge them without knowing whether they are in a request or a response.\n'
    );
  }

  const impacts = diffConfig.diff[result.specVersions.revision];
  if (impacts && Object.values(impacts).every((impact) => impact === 'off')) {
    logger.warn(
      '⚠️  No diff rules are on, so the command cannot find breaking changes. If your configuration file does not have diff-recommended in extends, add it there or use --extends=diff-recommended.\n'
    );
  }

  result.changes.sort(byPathAndProperty);

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
    getTotals(result.problems).errors > 0 &&
      '❌ The revision has errors, so the diff can miss breaking changes. Fix the problems above.',
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

// An alias or an existing file wins over a git revision, so an argument that named one still does.
async function findEntrypoint(api: string, config: Config): Promise<Entrypoint> {
  if (!config.resolvedConfig.apis?.[api] && isGitRevisionFile(api)) {
    const { revisionFile, localPath } = await locateRevisionFile(api);
    // The settings of an API apply to its root file in every revision.
    return { path: revisionFile, alias: getAliasOrPath(config, localPath).alias };
  }

  const [entrypoint] = await getFallbackApisOrExit([api], config);

  return entrypoint;
}

function byPathAndProperty(left: JudgedChange, right: JudgedChange): number {
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;

  const leftProperty = left.kind === 'modified' ? left.property : '';
  const rightProperty = right.kind === 'modified' ? right.property : '';

  if (leftProperty !== rightProperty) return leftProperty < rightProperty ? -1 : 1;

  return 0;
}
