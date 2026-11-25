export type PlatformCredentials = { apiKey: string } | { accessToken: string };

export function createAuthHeaders(credentials: PlatformCredentials): Record<string, string> {
  if ('apiKey' in credentials) {
    return { Authorization: `Bearer ${credentials.apiKey}` };
  }

  return { Cookie: `accessToken=${credentials.accessToken}` };
}
