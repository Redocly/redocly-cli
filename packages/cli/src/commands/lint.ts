import {
  formatProblems,
  getTotals,
  lint,
  lintConfig,
  pluralize,
  ConfigValidationError,
  isAbsoluteUrl,
  logger,
  type Config,
  type Exact,
  type OutputFormat,
} from '@redocly/openapi-core';
import { blue, gray } from 'colorette';
import * as fs from 'node:fs';
import { performance } from 'perf_hooks';
import type { Arguments } from 'yargs';

import type { CommandArgv, Totals, VerifyConfigOptions } from '../types.js';
import { AbortFlowError, exitWithError } from '../utils/error.js';
import { getCommandNameFromArgs } from '../utils/get-command-name-from-args.js';
import {
  checkIfRulesetExist,
  formatPath,
  getExecutionTime,
  getFallbackApisOrExit,
  handleError,
  printConfigLintTotals,
  printLintTotals,
  printUnusedWarnings,
} from '../utils/miscellaneous.js';
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

  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;
  const isAggregatedXmlFormat = argv.format === 'checkstyle' || argv.format === 'junit';
  const aggregatedResults: Awaited<ReturnType<typeof lint>> = [];

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const { path, alias } of apis) {
    try {
      const startedAt = performance.now();
      const aliasConfig = config.forAlias(alias);

      checkIfRulesetExist(aliasConfig.rules);

      aliasConfig.skipRules(argv['skip-rule']);
      aliasConfig.skipPreprocessors(argv['skip-preprocessor']);

      if (typeof config.document?.parsed === 'undefined' && !argv.extends) {
        logger.info(
          `No configurations were provided -- using built in ${blue(
            'recommended'
          )} configuration by default.\n\n`
        );
      }
      if (alias === undefined) {
        logger.info(gray(`validating ${formatPath(path)}...\n`));
      } else {
        logger.info(
          gray(`validating ${formatPath(path)} using lint rules for api '${alias}'...\n`)
        );
      }

      assertSupportedProtobufEntrypoint(path);

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
        config.clearIgnoreForRef(path);
        for (const m of results) {
          config.addIgnore(m);
          totalIgnored++;
        }
      } else if (isAggregatedXmlFormat) {
        aggregatedResults.push(...results);
      } else {
        formatProblems(results, {
          format: argv.format,
          maxProblems: argv['max-problems'],
          totals: fileTotals,
          version,
          command: 'lint',
        });
      }

      const elapsed = getExecutionTime(startedAt);
      logger.info(gray(`${formatPath(path)}: validated in ${elapsed}\n\n`));
    } catch (e) {
      handleError(e, path);
    }
  }

  if (isAggregatedXmlFormat && !argv['generate-ignore-file']) {
    formatProblems(aggregatedResults, {
      format: argv.format,
      maxProblems: argv['max-problems'],
      totals,
      version,
      command: 'lint',
    });
  }

  if (argv['generate-ignore-file']) {
    config.saveIgnore();
    logger.info(`Explicitly ignored ${totalIgnored} ${pluralize('problem', totalIgnored)}.\n\n`);
  } else {
    printLintTotals(totals, apis.length);
  }

  printUnusedWarnings(config);

  if (!(totals.errors === 0 || argv['generate-ignore-file'])) {
    throw new AbortFlowError('Lint failed.');
  }
}

function isProtoPath(path: string): boolean {
  return path.toLowerCase().endsWith('.proto');
}

function assertSupportedProtobufEntrypoint(path: string): void {
  if (isProtoPath(path) && isAbsoluteUrl(path)) {
    exitWithError(
      'Remote .proto URLs are not supported yet. Use a local .proto file or glob instead.'
    );
  }

  if (!isAbsoluteUrl(path) && isLocalDirectory(path) && directoryContainsProto(path)) {
    exitWithError(
      'Directory inputs containing .proto files are not supported yet. Use explicit .proto files or a glob instead.'
    );
  }
}

function isLocalDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function directoryContainsProto(dir: string): boolean {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = `${dir}/${entry.name}`;
    if (entry.isFile() && isProtoPath(entry.name)) {
      return true;
    }

    if (entry.isDirectory() && directoryContainsProto(entryPath)) {
      return true;
    }
  }

  return false;
}

export async function handleLintConfig(argv: Exact<CommandArgv>, version: string, config: Config) {
  if (argv['lint-config'] === 'off' || config.document === undefined) {
    return;
  }

  if (argv.format === 'json' || argv.format === 'junit' || argv.format === 'checkstyle') {
    // these are single-document formats, so a separate config-lint document would break the output
    return;
  }

  const command = argv ? getCommandNameFromArgs(argv as Arguments) : undefined;

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
    command: 'check-config',
  });

  printConfigLintTotals(fileTotals, command);

  if (fileTotals.errors > 0) {
    throw new ConfigValidationError();
  }
}
