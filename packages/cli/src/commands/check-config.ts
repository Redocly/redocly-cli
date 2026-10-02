import {
  AbortFlowError,
  formatProblems,
  getTotals,
  HandledError,
  lintConfig,
  loadConfig,
  logger,
  pluralize,
  type Config,
  type Exact,
  type Plugin,
} from '@redocly/openapi-core';
import { green } from 'colorette';
import type { Arguments } from 'yargs';

import type { CommandArgv, Totals } from '../types.js';
import { getCommandNameFromArgs } from '../utils/get-command-name-from-args.js';

// Every command loads and checks the config before its handler, so the `check-config` command itself has no handler.
export async function loadAndCheckConfig(
  argv: Exact<CommandArgv>,
  version: string,
  plugins?: Plugin[]
): Promise<Config> {
  let config: Config;
  try {
    config = await loadConfig({
      configPath: argv.config,
      customExtends: argv.extends,
      plugins,
    });
  } catch (error) {
    throw new HandledError(`Failed to load the configuration file:\n\n  - ${error.message}`);
  }

  if (argv['lint-config'] === 'off' || config.document === undefined) {
    return config;
  }

  const problems = await lintConfig({
    config,
    severity: argv['lint-config'] || 'warn',
  });

  const totals = getTotals(problems);

  // Config problems go to stderr in one fixed format, so the `--format` output of the command stays intact.
  formatProblems(problems, {
    maxProblems: argv['max-problems'],
    totals,
    version,
    command: 'check-config',
  });

  printConfigLintTotals(totals, getCommandNameFromArgs(argv as Arguments));

  if (totals.errors > 0) {
    throw new AbortFlowError('Config check failed.');
  }

  return config;
}

export function printConfigLintTotals(totals: Totals, command?: string | number): void {
  if (totals.errors > 0) {
    logger.error(`❌ Your config has ${totals.errors} ${pluralize('error', totals.errors)}.\n`);
  } else if (totals.warnings > 0) {
    logger.warn(
      `⚠️ Your config has ${totals.warnings} ${pluralize('warning', totals.warnings)}.\n`
    );
  } else if (command === 'check-config') {
    logger.info(green('✅  Your config is valid.\n'));
  }
}
