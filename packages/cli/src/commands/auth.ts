import { logger } from '@redocly/openapi-core';
import { exitWithError } from '../utils/error.js';
import { RedoclyOAuthClient } from '../auth/oauth-client.js';
import { getReuniteUrl } from '../reunite/api/index.js';

import type { CommandArgs } from '../wrapper.js';

export type LoginArgv = {
  residency?: string;
  config?: string;
  verbose?: boolean;
};

export async function handleLogin({ argv, config }: CommandArgs<LoginArgv>) {
  const reuniteUrl = getReuniteUrl(config, argv.residency);
  try {
    const oauthClient = new RedoclyOAuthClient();

    if (argv.verbose) {
      logger.info(`OAuth client initialized.\n`);
      logger.info(`CredentialsFilePath: ${oauthClient.credentialsFilePath}\n`);
    }

    await oauthClient.login(reuniteUrl);
  } catch (e) {
    if (argv.verbose) {
      logger.error(`Login to ${reuniteUrl} failed.\n`);
      logger.error(`Residency: ${argv.residency}\n`);
      logger.errorWithStack(e);
    }

    if (argv.residency) {
      exitWithError(`❌ Connection to ${reuniteUrl} failed.`);
    } else {
      exitWithError(`❌ Login failed. Please check your credentials and try again.`);
    }
  }
}

export type LogoutArgv = {
  config?: string;
};

export async function handleLogout() {
  const oauthClient = new RedoclyOAuthClient();
  oauthClient.logout();

  logger.output('Logged out from the Redocly account. ✋ \n');
}
