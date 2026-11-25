import type { PlatformCredentials } from '../api/auth-headers.js';
import { RedoclyOAuthClient } from './oauth-client.js';

// The API key from `REDOCLY_AUTHORIZATION` when it is set, otherwise the `redocly login` token;
// undefined when there is neither.
export async function getPlatformCredentials(
  platformUrl: string,
  version: string
): Promise<PlatformCredentials | undefined> {
  const apiKey = process.env.REDOCLY_AUTHORIZATION;
  if (apiKey) {
    return { apiKey };
  }

  const accessToken = await new RedoclyOAuthClient(version).getAccessToken(platformUrl);

  return accessToken ? { accessToken } : undefined;
}
