import { logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient } from '../../../auth/oauth-client.js';
import { getReuniteUrl } from '../../../reunite/api/index.js';
import { exitWithError } from '../../../utils/error.js';
import type { Config } from '@redocly/openapi-core';

export async function handleLoginAndFetchToken(
  config: Config,
  verbose = false
): Promise<string | null> {
  const reuniteUrl = getReuniteUrl(config, config.resolvedConfig?.residency);

  const oauthClient = new RedoclyOAuthClient();
  let accessToken = await oauthClient.getAccessToken(reuniteUrl);

  if (accessToken) {
    if (verbose) {
      logger.info(`Using existing access token.\n`);
    }
    return accessToken;
  }

  if (verbose) {
    logger.warn(`No valid access token found or refresh token expired. Attempting login...\n`);
  }

  try {
    await oauthClient.login(reuniteUrl);
    accessToken = await oauthClient.getAccessToken(reuniteUrl);
  } catch (error) {
    if (verbose) {
      logger.error(`❌ Login failed.\n`);
      logger.error(`Error details: ${error.message}\n`);
    }
    exitWithError(`Login failed. Please try again or check your connection to ${reuniteUrl}.`);
  }

  return accessToken;
}
