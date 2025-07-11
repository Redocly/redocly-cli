import { blue, gray } from 'colorette';
import { performance } from 'perf_hooks';
import {
  formatProblems,
  getTotals,
  lint,
  lintConfig,
  pluralize,
  ConfigValidationError,
  logger,
} from '@redocly/openapi-core';
import {
  checkIfRulesetExist,
  formatPath,
  getExecutionTime,
  getFallbackApisOrExit,
  handleError,
  notifyAboutIncompatibleConfigOptions,
  printConfigLintTotals,
  printLintTotals,
  printUnusedWarnings,
} from '../utils/miscellaneous.js';
import { AbortFlowError, exitWithError } from '../utils/error.js';
import { getCommandNameFromArgs } from '../utils/get-command-name-from-args.js';

import type { Arguments } from 'yargs';
import type { Config, Exact, OutputFormat } from '@redocly/openapi-core';
import type { CommandArgv, Totals, VerifyConfigOptions } from '../types.js';
import type { CommandArgs } from '../wrapper.js';

export type LintArgv = {
  apis?: string[];
  'max-problems': number;
  extends?: string[];
  format: OutputFormat;
  'generate-ignore-file'?: boolean;
  'skip-rule'?: string[];
  'skip-preprocessor'?: string[];
} & VerifyConfigOptions;

export async function handleLint({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<LintArgv>) {
  const apis = await getFallbackApisOrExit(argv.apis, config);

  if (!apis.length) {
    exitWithError('No APIs were provided.');
  }

  if (argv['generate-ignore-file']) {
    config.ignore = {}; // clear ignore
  }
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const { path, alias } of apis) {
    try {
      const startedAt = performance.now();
      const aliasConfig = config.forAlias(alias);

      checkIfRulesetExist(aliasConfig.rules);

      aliasConfig.skipRules(argv['skip-rule']);
      aliasConfig.skipPreprocessors(argv['skip-preprocessor']);

      if (typeof config.document?.parsed === 'undefined') {
        logger.info(
          `No configurations were provided -- using built in ${blue(
            'recommended'
          )} configuration by default.\n\n`
        );
      }
      logger.info(gray(`validating ${formatPath(path)}...\n`));
      const results = await lint({
        ref: path,
        config: aliasConfig,
        collectSpecData,
      });

      const fileTotals = getTotals(results);
      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      if (argv['generate-ignore-file']) {
        for (const m of results) {
          config.addIgnore(m);
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
    config.saveIgnore();
    logger.info(
      `Generated ignore file with ${totalIgnored} ${pluralize('problem', totalIgnored)}.\n\n`
    );
  } else {
    printLintTotals(totals, apis.length);
  }

  printUnusedWarnings(config);

  if (!(totals.errors === 0 || argv['generate-ignore-file'])) {
    throw new AbortFlowError('Lint failed.');
  }
}

export async function handleLintConfig(argv: Exact<CommandArgv>, version: string, config: Config) {
  if (argv['lint-config'] === 'off' || config.document === undefined) {
    return;
  }

  if (argv.format === 'json') {
    // we can't print config lint results as it will break json output
    return;
  }

  const command = argv ? getCommandNameFromArgs(argv as Arguments) : undefined;

  if (command === 'check-config') {
    notifyAboutIncompatibleConfigOptions(config.resolvedConfig?.theme?.openapi);
  }

  const problems = await lintConfig({
    config,
    severity: argv['lint-config'] || 'warn',
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
}
