import { logger, HandledError } from '@redocly/openapi-core';
import { getPlatformUrl, RedoclyOAuthClient } from '@redocly/platform-integration';
import { green } from 'colorette';

import { printDeviceCode } from '../utils/print-device-code.js';
import type { CommandArgs } from '../wrapper.js';

export type LoginArgv = {
  residency?: string;
  verbose?: boolean;
};

export async function handleLogin({ argv, config, version }: CommandArgs<LoginArgv>) {
  const platformUrl = getPlatformUrl(config, argv.residency);
  try {
    const oauthClient = new RedoclyOAuthClient(version);

    if (argv.verbose) {
      logger.info(`OAuth client initialized.\n`);
      logger.info(`Local credentials file path: ${oauthClient.credentialsFilePath}\n`);
    }

    await oauthClient.login(platformUrl, printDeviceCode);
    logger.output(green('✅ Logged in\n\n'));
  } catch (error) {
    if (argv.verbose) {
      logger.error(`Residency: ${argv.residency}.\n`);
      logger.error(`Login URL: ${platformUrl}.\n`);
      logger.error(error.stack || error.message);
    }

    if (argv.residency) {
      throw new HandledError(`❌ Connection to ${platformUrl} failed.`);
    } else {
      throw new HandledError(`❌ Login failed. Please check your credentials and try again.`);
    }
  }
}
