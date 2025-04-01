import { detectSpec, doesYamlFileExist, isPlainObject, logger } from '@redocly/openapi-core';
import { version } from './utils/package.js';
import { loadConfigAndHandleErrors, sendTelemetry } from './utils/miscellaneous.js';
import { lintConfigCallback } from './commands/lint.js';
import { AbortFlowError, HandledError, exitWithError } from './utils/error.js';
import { HandledError as RespectHandledError } from '@redocly/respect-core';

import type { Arguments } from 'yargs';
import type { Config, CollectFn } from '@redocly/openapi-core';
import type { ExitCode } from './utils/miscellaneous.js';
import type { CommandOptions } from './types.js';

export type CommandArgs<T extends CommandOptions> = {
  argv: T;
  config: Config;
  version: string;
  collectSpecData?: CollectFn;
};

export function commandWrapper<T extends CommandOptions>(
  commandHandler?: (wrapperArgs: CommandArgs<T>) => Promise<unknown>
) {
  return async (argv: Arguments<T>) => {
    let code: ExitCode = 2;
    let hasConfig;
    let telemetry;
    let specVersion: string | undefined;
    let specKeyword: string | undefined;
    let specFullVersion: string | undefined;
    const collectSpecData: CollectFn = (document) => {
      specVersion = detectSpec(document);
      if (!isPlainObject(document)) return;
      specKeyword = document?.openapi
        ? 'openapi'
        : document?.swagger
        ? 'swagger'
        : document?.asyncapi
        ? 'asyncapi'
        : document?.arazzo
        ? 'arazzo'
        : document?.overlay
        ? 'overlay'
        : undefined;
      if (specKeyword) {
        specFullVersion = document[specKeyword] as string;
      }
    };
    try {
      if (argv.config && !doesYamlFileExist(argv.config)) {
        exitWithError('Please provide a valid path to the configuration file.');
      }
      const config: Config = (await loadConfigAndHandleErrors({
        configPath: argv.config,
        customExtends: argv.extends as string[] | undefined,
        processRawConfig: lintConfigCallback(argv as T & Record<string, undefined>, version),
      })) as Config;
      telemetry = config.telemetry;
      hasConfig = !config.styleguide.recommendedFallback;
      code = 1;
      if (typeof commandHandler === 'function') {
        await commandHandler({ argv, config, version, collectSpecData });
      }
      code = 0;
    } catch (err) {
      if (err instanceof AbortFlowError) {
        // do nothing
      } else if (err instanceof HandledError) {
        logger.error(err.message + '\n\n');
      } else if (err instanceof RespectHandledError) {
        logger.error(err.message + '\n');
        logger.output('\n');
      } else {
        logger.error(
          'An unexpected error occurred. This is likely a bug that should be reported.\n'
        );
        logger.error(err instanceof Error ? err.stack || err.message : String(err));
        logger.error('\n');
      }
    } finally {
      if (process.env.REDOCLY_TELEMETRY !== 'off' && telemetry !== 'off') {
        await sendTelemetry(argv, code, hasConfig, specVersion, specKeyword, specFullVersion);
      }
      process.once('beforeExit', () => {
        process.exit(code);
      });
    }
  };
}
