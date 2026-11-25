import { DEFAULT_FETCH_TIMEOUT } from '../utils/constants.js';
import { OidcCredentialsApi, PlatformApiClient, PlatformApiError } from './api-client.js';

const EXPIRY_MARGIN_MS = 60_000;

export type ApiKeyTarget = {
  domain: string;
  organization: string;
  project: string;
  command: 'push' | 'push-status';
  version?: string;
};

type OidcCredential = { apiKey: string; expiresAt: Date };

const credentials = new Map<string, OidcCredential>();

/**
 * @deprecated Use `getApiKey`, which also gets a key in a GitHub Actions workflow without one.
 */
export function getApiKeys() {
  if (process.env.REDOCLY_AUTHORIZATION) {
    return process.env.REDOCLY_AUTHORIZATION;
  }

  throw new Error('No api key provided, please use environment variable REDOCLY_AUTHORIZATION.');
}

/**
 * Returns the API key for the project: `REDOCLY_AUTHORIZATION` when it is set, otherwise a
 * short-lived key that the GitHub Actions OIDC token is exchanged for. An exchanged key is reused
 * until 60 seconds before it expires. Throws when neither source is available.
 */
export async function getApiKey(target: ApiKeyTarget): Promise<string> {
  if (process.env.REDOCLY_AUTHORIZATION) {
    return process.env.REDOCLY_AUTHORIZATION;
  }

  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

  if (!requestUrl || !requestToken) {
    throw new Error(
      'No api key provided. Set the environment variable REDOCLY_AUTHORIZATION. In a GitHub Actions workflow, you can also grant the job `permissions: id-token: write` and trust the repository on the CI/CD access tab of Remote content in the project.'
    );
  }

  const cacheKey = JSON.stringify([target.domain, target.organization, target.project]);
  const cached = credentials.get(cacheKey);

  if (cached && cached.expiresAt.getTime() - EXPIRY_MARGIN_MS > Date.now()) {
    return cached.apiKey;
  }

  const client = new PlatformApiClient(target.command, target.version);
  const audience = new URL(target.domain).origin;
  const idToken = await requestGitHubIdToken(client, requestUrl, requestToken, audience);
  const { apiKey, expiresAt } = await new OidcCredentialsApi(client, target.domain, {}).exchange(
    target.organization,
    target.project,
    idToken
  );

  credentials.set(cacheKey, { apiKey, expiresAt: new Date(expiresAt) });

  return apiKey;
}

async function requestGitHubIdToken(
  client: PlatformApiClient,
  requestUrl: string,
  requestToken: string,
  audience: string
): Promise<string> {
  const url = new URL(requestUrl);
  url.searchParams.set('audience', audience);

  try {
    const response = await client.request(url.toString(), {
      method: 'GET',
      headers: { Authorization: `bearer ${requestToken}` },
      timeout: DEFAULT_FETCH_TIMEOUT,
      redirect: 'error',
    });

    if (!response.ok) {
      throw new PlatformApiError(`${response.statusText || 'Unknown error'}.`, response.status);
    }

    const { value } = await response.json();

    if (typeof value !== 'string' || !value) {
      throw new Error('The response has no token.');
    }

    return value;
  } catch (err) {
    const message = `Failed to get the GitHub OIDC token. ${err.message}`;

    throw err instanceof PlatformApiError
      ? new PlatformApiError(message, err.status)
      : new Error(message);
  }
}
