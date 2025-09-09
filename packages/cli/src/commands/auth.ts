import { logger } from '@redocly/openapi-core';
import { exitWithError } from '../utils/error.js';
import { RedoclyOAuthClient } from '../auth/oauth-client.js';
import { getReuniteUrl } from '../reunite/api/index.js';

import type { CommandArgs } from '../wrapper.js';

export type LoginArgv = {
  residency?: string;
  config?: string;
};

export async function handleLogin({ argv, config }: CommandArgs<LoginArgv>) {
  const reuniteUrl = getReuniteUrl(config, argv.residency);
  try {
    const oauthClient = new RedoclyOAuthClient();
    await oauthClient.login(reuniteUrl);
  } catch {
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
