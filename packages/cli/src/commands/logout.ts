import { logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient } from '@redocly/platform-integration';

export async function handleLogout({ version }: { version: string }) {
  const oauthClient = new RedoclyOAuthClient(version);
  oauthClient.logout();

  logger.output('Logged out from the Redocly account. ✋ \n');
}
