import { Config, Region, doesYamlFileExist } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { exitWithError, loadConfigAndHandleErrors, sendTelemetry } from './utils';
import { lintConfigCallback } from './commands/lint';
import type { CommandOptions } from './types';

export function commandWrapper<T extends CommandOptions>(
  commandHandler: (argv: T, config: Config, version: string) => Promise<void>
) {
  return async (argv: Arguments<T>) => {
    let code: 0 | 1 = 0;
    let hasConfig;
    let telemetry;
    try {
      if (argv.config && !doesYamlFileExist(argv.config)) {
        return exitWithError('Please, provide valid path to the configuration file');
      }
      const config: Config = await loadConfigAndHandleErrors({
        configPath: argv.config,
        customExtends: argv.extends as string[] | undefined,
        region: argv.region as Region,
        files: argv.file as string[] | undefined,
        processRawConfig: lintConfigCallback(argv as T & Record<string, undefined>, version),
      });
      telemetry = config.telemetry;
      hasConfig = !!(config.styleguide && !config.styleguide.recommendedFallback);
      await commandHandler(argv, config, version);
    } catch (err) {
      code = 1;
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
