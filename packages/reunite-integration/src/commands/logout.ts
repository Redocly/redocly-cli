import { logger } from '@redocly/openapi-core';

import { RedoclyOAuthClient } from '../auth/oauth-client.js';

export async function handleLogout({ version }: { version: string }) {
  const oauthClient = new RedoclyOAuthClient(version);
  oauthClient.logout();

  logger.output('Logged out from the Redocly account. ✋ \n');
}
