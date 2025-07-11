import {
  detectSpec,
  doesYamlFileExist,
  isPlainObject,
  logger,
  HandledError,
} from '@redocly/openapi-core';
import { version } from './utils/package.js';
import { loadConfigAndHandleErrors } from './utils/miscellaneous.js';
import { sendTelemetry, collectXSecurityAuthTypes } from './utils/telemetry.js';
import { AbortFlowError, exitWithError } from './utils/error.js';

import type { Arguments } from 'yargs';
import type { Config, CollectFn, ArazzoDefinition, Exact } from '@redocly/openapi-core';
import type { ExitCode } from './utils/miscellaneous.js';
import type { CommandArgv } from './types.js';

export type CommandArgs<T extends CommandArgv> = {
  argv: T;
  config: Config;
  version: string;
  collectSpecData?: CollectFn;
};

export function commandWrapper<T extends CommandArgv>(
  commandHandler?: (wrapperArgs: CommandArgs<T>) => Promise<unknown>
) {
  return async (argv: Arguments<T>) => {
    let code: ExitCode = 2;
    let telemetry;
    let specVersion: string | undefined;
    let specKeyword: string | undefined;
    let specFullVersion: string | undefined;
    let config: Config | undefined;
    const respectXSecurityAuthTypes: string[] = [];
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

      if (specVersion === 'arazzo1') {
        collectXSecurityAuthTypes(document as Partial<ArazzoDefinition>, respectXSecurityAuthTypes);
      }
    };

    try {
      if (argv.config && !doesYamlFileExist(argv.config)) {
        exitWithError('Please provide a valid path to the configuration file.');
      }
      config = await loadConfigAndHandleErrors(argv as Exact<T>, version);
      telemetry = config.resolvedConfig.telemetry;
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
      } else {
        logger.error(
          'An unexpected error occurred. This is likely a bug that should be reported.\n'
        );
        logger.error(err instanceof Error ? err.stack || err.message : String(err));
        logger.error('\n');
      }
    } finally {
      if (process.env.REDOCLY_TELEMETRY !== 'off' && telemetry !== 'off') {
        await sendTelemetry({
          config,
          argv,
          exit_code: code,
          spec_version: specVersion,
          spec_keyword: specKeyword,
          spec_full_version: specFullVersion,
          respect_x_security_auth_types: respectXSecurityAuthTypes,
        });
      }
      process.once('beforeExit', () => {
        process.exit(code);
      });
    }
  };
}
