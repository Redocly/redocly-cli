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

export type CommandArgs<T extends CommandOptions> = {
  argv: T;
  config: Config;
  version: string;
  collectSpecVersion?: (version: string) => void;
};

export function commandWrapper<T extends CommandOptions>(
  commandHandler?: (wrapperArgs: CommandArgs<T>) => Promise<unknown>
) {
  return async (argv: Arguments<T>) => {
    let code: ExitCode = 2;
    let hasConfig;
    let telemetry;
    let specVersion: string | undefined;
    const collectSpecVersion = (version: string) => {
      specVersion = version;
    };
    try {
      if (argv.config && !doesYamlFileExist(argv.config)) {
        exitWithError('Please provide a valid path to the configuration file.');
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
        await commandHandler({ argv, config, version, collectSpecVersion });
      }
      code = 0;
    } catch (err) {
      // Do nothing
    } finally {
      if (process.env.REDOCLY_TELEMETRY !== 'off' && telemetry !== 'off') {
        await sendTelemetry(argv, code, hasConfig, specVersion);
      }
      process.once('beforeExit', () => {
        process.exit(code);
      });
    }
  };
}
