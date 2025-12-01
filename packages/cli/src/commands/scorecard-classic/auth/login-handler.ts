import { logger } from '@redocly/openapi-core';
import { blue } from 'colorette';
import { RedoclyOAuthClient } from '../../../auth/oauth-client.js';
import { getReuniteUrl } from '../../../reunite/api/index.js';
import { exitWithError } from '../../../utils/error.js';

import type { Config } from '@redocly/openapi-core';

export async function handleLoginAndFetchToken(config: Config): Promise<string | undefined> {
  const reuniteUrl = getReuniteUrl(config, config.resolvedConfig?.residency);
  const oauthClient = new RedoclyOAuthClient();
  const isAuthorized = await oauthClient.isAuthorized(reuniteUrl);

  if (!isAuthorized) {
    logger.info(`\n${blue('Authentication required to fetch remote scorecard configuration.')}\n`);
    logger.info(`Please login to continue:\n`);

    try {
      await oauthClient.login(reuniteUrl);
    } catch (error) {
      exitWithError(`Login failed. Please try again or check your connection to ${reuniteUrl}.`);
    }
  }

  const token = await oauthClient.getAccessToken(reuniteUrl);
  return token === null ? undefined : token;
}
