import { logger, HandledError } from '@redocly/openapi-core';
import { getReuniteUrl, RedoclyOAuthClient } from '@redocly/reunite-integration';

import type { CommandArgs } from '../wrapper.js';

export type LoginArgv = {
  residency?: string;
  verbose?: boolean;
};

export async function handleLogin({ argv, config, version }: CommandArgs<LoginArgv>) {
  const reuniteUrl = getReuniteUrl(config, argv.residency);
  try {
    const oauthClient = new RedoclyOAuthClient(version);

    if (argv.verbose) {
      logger.info(`OAuth client initialized.\n`);
      logger.info(`Local credentials file path: ${oauthClient.credentialsFilePath}\n`);
    }

    await oauthClient.login(reuniteUrl);
  } catch (error) {
    if (argv.verbose) {
      logger.error(`Residency: ${argv.residency}.\n`);
      logger.error(`Login URL: ${reuniteUrl}.\n`);
      logger.error(error.stack || error.message);
    }

    if (argv.residency) {
      throw new HandledError(`❌ Connection to ${reuniteUrl} failed.`);
    } else {
      throw new HandledError(`❌ Login failed. Please check your credentials and try again.`);
    }
  }
}
