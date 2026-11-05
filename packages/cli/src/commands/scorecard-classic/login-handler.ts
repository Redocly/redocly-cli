import { logger, HandledError, type Config } from '@redocly/openapi-core';
import { getPlatformUrl, RedoclyOAuthClient } from '@redocly/platform-integration';
import { green } from 'colorette';

import { printDeviceCode } from '../../utils/print-device-code.js';

export async function handleLoginAndFetchToken(
  config: Config,
  version: string,
  verbose = false
): Promise<string | null> {
  const platformUrl = getPlatformUrl(config, config.resolvedConfig?.residency);

  const oauthClient = new RedoclyOAuthClient(version);
  let accessToken = await oauthClient.getAccessToken(platformUrl);

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
    await oauthClient.login(platformUrl, printDeviceCode);
    logger.output(green('✅ Logged in\n\n'));
    accessToken = await oauthClient.getAccessToken(platformUrl);
  } catch (error) {
    if (verbose) {
      logger.error(`❌ Login failed.\n`);
      logger.error(`Error details: ${error.message}\n`);
    }
    throw new HandledError(
      `Login failed. Please try again or check your connection to ${platformUrl}.`
    );
  }

  return accessToken;
}
