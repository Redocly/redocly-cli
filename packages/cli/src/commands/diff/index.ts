import {
  bundle,
  formatProblems,
  getTotals,
  logger,
  type OutputFormat,
} from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';

import type { VerifyConfigOptions } from '../../types.js';
import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { DiffError, diffDocuments } from './engine/index.js';
import type { DiffResult } from './engine/types.js';
import { getDiffFailure, type DiffFailOn } from './fail-on.js';
import { htmlDiff } from './serializers/html.js';
import { jsonDiff } from './serializers/json.js';
import { markdownDiff } from './serializers/markdown.js';
import { breakingChangesToProblems } from './serializers/problems.js';
import { stylishDiff } from './serializers/stylish.js';

/** Formats rendered by this command from the full DiffResult. */
export type DiffOwnFormat = Extract<OutputFormat, 'stylish' | 'json' | 'markdown' | 'html'>;

/**
 * Formats delegated to core's lint formatters. They describe breaking changes
 * only, because a lint problem always carries a severity (see problems.ts).
 */
export type DiffProblemFormat = Extract<
  OutputFormat,
  'codeframe' | 'checkstyle' | 'codeclimate' | 'summary' | 'github-actions' | 'junit'
>;

export type DiffOutputFormat = DiffOwnFormat | DiffProblemFormat;
export type { DiffFailOn };

export type DiffArgv = {
  base: string;
  revision: string;
  format: DiffOutputFormat;
  output?: string;
  'fail-on': DiffFailOn;
} & VerifyConfigOptions;

const SERIALIZERS: Record<DiffOwnFormat, (result: DiffResult) => string> = {
  stylish: stylishDiff,
  json: jsonDiff,
  markdown: markdownDiff,
  html: htmlDiff,
};

function isOwnFormat(format: DiffOutputFormat): format is DiffOwnFormat {
  return format in SERIALIZERS;
}

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
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

  if (isOwnFormat(argv.format)) {
    const output = SERIALIZERS[argv.format](result);
    if (argv.output) {
      writeFileSync(argv.output, output);
      logger.info(`Diff report written to ${argv.output}.\n`);
    } else {
      logger.output(output + '\n');
    }
  } else {
    if (argv.output) {
      return exitWithError(
        `The ${argv.format} format prints to stdout and cannot be written with --output. Use one of: ${Object.keys(SERIALIZERS).join(', ')}.`
      );
    }
    const problems = breakingChangesToProblems(
      result,
      baseDocument.source,
      revisionDocument.source
    );
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
