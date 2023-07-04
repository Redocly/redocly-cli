import { Config, Region, doesYamlFileExist } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { ExitCode, exitWithError, loadConfigAndHandleErrors, sendTelemetry } from './utils';
import { lintConfigCallback } from './commands/lint';
import type { CommandOptions } from './types';

export function commandWrapper<T extends CommandOptions>(
  commandHandler: (argv: T, config: Config, version: string) => Promise<void>
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
      await commandHandler(argv, config, version);
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
