import { RedoclyOAuthClient } from '../../../auth/oauth-client.js';
import { getReuniteUrl } from '../../../reunite/api/index.js';
import { exitWithError } from '../../../utils/error.js';

import type { Config } from '@redocly/openapi-core';

export async function handleLoginAndFetchToken(config: Config): Promise<string | undefined> {
  const reuniteUrl = getReuniteUrl(config, config.resolvedConfig?.residency);

  const oauthClient = new RedoclyOAuthClient();
  let accessToken = await oauthClient.getAccessToken(reuniteUrl);

  if (!accessToken) {
    try {
      await oauthClient.login(reuniteUrl);
      accessToken = await oauthClient.getAccessToken(reuniteUrl);
    } catch {
      exitWithError(`Login failed. Please try again or check your connection to ${reuniteUrl}.`);
    }
  }

  return accessToken === null ? undefined : accessToken;
}
