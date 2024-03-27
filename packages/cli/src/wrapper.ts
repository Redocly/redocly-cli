import { Config, Region, doesYamlFileExist } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './utils/update-version-notifier';
import {
  ExitCode,
  exitWithError,
  loadConfigAndHandleErrors,
  sendTelemetry,
} from './utils/miscellaneous';
import { lintConfigCallback } from './commands/lint';
import type { CommandOptions } from './types';

type CommandHandler<T extends CommandOptions> =
  | ((argv: T, config: Config, version: string) => Promise<void>)
  | ((argv: T, config: Config) => Promise<void>);

export function commandWrapper<T extends CommandOptions>(
  commandHandler?: CommandHandler<T>,
) {
  return async (argv: Arguments<T>) => {
    let code: ExitCode = 2;
    let hasConfig;
    let telemetry;
    try {
      if (argv.config && !doesYamlFileExist(argv.config)) {
        exitWithError('Please, provide valid path to the configuration file');
      }
      const config: Config = (await loadConfigAndHandleErrors({
        configPath: argv.config,
        customExtends: argv.extends as string[] | undefined,
        region: argv.region as Region,
        files: argv.files as string[] | undefined,
        processRawConfig: lintConfigCallback(argv as T & Record<string, undefined>, version),
      })) as Config;
      telemetry = config.telemetry;
      hasConfig = !config.styleguide.recommendedFallback;
      code = 1;
      if (typeof commandHandler === 'function') {
        if (hasVersionParameter(commandHandler)) {
          await commandHandler(argv, config, version);
        } else {
          await (commandHandler as (argv: T, config: Config) => Promise<void>)(argv, config);
        }
      }
      code = 0;
    } catch (err) {
      // Do nothing
    } finally {
      if (process.env.REDOCLY_TELEMETRY !== 'off' && telemetry !== 'off') {
        await sendTelemetry(argv, code, hasConfig);
      }
      process.once('beforeExit', () => {
        process.exit(code);
      });
    }
  };
}

function hasVersionParameter(fn: CommandHandler<never>) {
  return fn.length === 3;
}