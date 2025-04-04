import { blue, gray } from 'colorette';
import { performance } from 'perf_hooks';
import {
  formatProblems,
  getMergedConfig,
  getTotals,
  lint,
  lintConfig,
  pluralize,
  ConfigValidationError,
  logger,
} from '@redocly/openapi-core';
import {
  checkIfRulesetExist,
  exitWithError,
  formatPath,
  getExecutionTime,
  getFallbackApisOrExit,
  handleError,
  notifyAboutIncompatibleConfigOptions,
  printConfigLintTotals,
  printLintTotals,
  printUnusedWarnings,
} from '../utils/miscellaneous.js';
import { getCommandNameFromArgs } from '../utils/getCommandNameFromArgs.js';

import type { Arguments } from 'yargs';
import type { OutputFormat, ProblemSeverity, RawConfigProcessor } from '@redocly/openapi-core';
import type { CommandOptions, Totals, VerifyConfigOptions } from '../types.js';
import type { CommandArgs } from '../wrapper.js';

export type LintOptions = {
  apis?: string[];
  'max-problems': number;
  extends?: string[];
  format: OutputFormat;
  'generate-ignore-file'?: boolean;
  'skip-rule'?: string[];
  'skip-preprocessor'?: string[]; // FIXME: do we need this?
} & VerifyConfigOptions;

export async function handleLint({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<LintOptions>) {
  const apis = await getFallbackApisOrExit(argv.apis, config);

  if (!apis.length) {
    exitWithError('No APIs were provided.');
  }

  if (argv['generate-ignore-file']) {
    config.styleguide.ignore = {}; // clear ignore
  }
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const { path, alias } of apis) {
    try {
      const startedAt = performance.now();
      const resolvedConfig = getMergedConfig(config, alias);
      const { styleguide } = resolvedConfig;

      checkIfRulesetExist(styleguide.rules);

      styleguide.skipRules(argv['skip-rule']);
      styleguide.skipPreprocessors(argv['skip-preprocessor']);

      if (styleguide.recommendedFallback) {
        logger.info(
          `No configurations were provided -- using built in ${blue(
            'recommended'
          )} configuration by default.\n\n`
        );
      }
      logger.info(gray(`validating ${formatPath(path)}...\n`));
      const results = await lint({
        ref: path,
        config: resolvedConfig,
        collectSpecData,
      });

      const fileTotals = getTotals(results);
      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      if (argv['generate-ignore-file']) {
        for (const m of results) {
          config.styleguide.addIgnore(m);
          totalIgnored++;
        }
      } else {
        formatProblems(results, {
          format: argv.format,
          maxProblems: argv['max-problems'],
          totals: fileTotals,
          version,
        });
      }

      const elapsed = getExecutionTime(startedAt);
      logger.info(gray(`${formatPath(path)}: validated in ${elapsed}\n\n`));
    } catch (e) {
      handleError(e, path);
    }
  }

  if (argv['generate-ignore-file']) {
    config.styleguide.saveIgnore();
    logger.info(
      `Generated ignore file with ${totalIgnored} ${pluralize('problem', totalIgnored)}.\n\n`
    );
  } else {
    printLintTotals(totals, apis.length);
  }

  printUnusedWarnings(config.styleguide);

  if (!(totals.errors === 0 || argv['generate-ignore-file'])) {
    throw new Error('Lint failed.');
  }
}

export function lintConfigCallback(
  argv: CommandOptions & Record<string, undefined>,
  version: string
): RawConfigProcessor | undefined {
  if (argv['lint-config'] === 'off') {
    return;
  }

  if (argv.format === 'json') {
    // we can't print config lint results as it will break json output
    return;
  }

  return async ({ document, resolvedRefMap, config, parsed: { theme = {} } }) => {
    const command = argv ? getCommandNameFromArgs(argv as Arguments) : undefined;

    if (command === 'check-config') {
      notifyAboutIncompatibleConfigOptions(theme.openapi);
    }

    const problems = await lintConfig({
      document,
      resolvedRefMap,
      config,
      severity: (argv['lint-config'] || 'warn') as ProblemSeverity,
    });

    const fileTotals = getTotals(problems);

    formatProblems(problems, {
      format: argv.format,
      maxProblems: argv['max-problems'],
      totals: fileTotals,
      version,
    });

    printConfigLintTotals(fileTotals, command);

    if (fileTotals.errors > 0) {
      throw new ConfigValidationError();
    }
  };
}
