import type { OAuth2Auth } from '@redocly/openapi-core';

import type { TestContext } from '../../../types.js';
import { getOAuth2AccessToken } from '../get-oauth2-access-token.js';

const tokenUrl = 'https://api.cafe.redocly.com/oauth2/token';
const scopes = { 'orders:read': 'Read access to orders' };
const scheme: OAuth2Auth = {
  type: 'oauth2',
  flows: {
    password: { tokenUrl, scopes },
    clientCredentials: { tokenUrl, scopes },
  },
};

function createContext(tokenResponse: Record<string, unknown>, status = 200) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(tokenResponse), { status })
  );
  const ctx = {
    options: { fetch: fetchMock, maxFetchTimeout: 1000 },
    oauth2TokenCache: new Map(),
    secretsSet: new Set<string>(),
  } as unknown as TestContext;

  return { ctx, fetchMock };
}

describe('getOAuth2AccessToken', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the access token from the values without a token request', async () => {
    const { ctx, fetchMock } = createContext({});

    const accessToken = await getOAuth2AccessToken({
      ctx,
      scheme,
      values: { accessToken: 'given-token', clientId: 'cafe-client', clientSecret: 'secret' },
    });

    expect(accessToken).toBe('given-token');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should request a token with the client credentials form-urlencoded in the Basic header', async () => {
    const { ctx, fetchMock } = createContext({ access_token: 'new-token', token_type: 'Bearer' });

    const accessToken = await getOAuth2AccessToken({
      ctx,
      scheme,
      values: { clientId: 'cafe client', clientSecret: 'a+b%2F:c€', scope: 'orders:read' },
    });

    expect(accessToken).toBe('new-token');
    expect(fetchMock).toHaveBeenCalledWith(
      tokenUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${btoa('cafe+client:a%2Bb%252F%3Ac%E2%82%AC')}`,
        },
        body: 'grant_type=client_credentials&scope=orders%3Aread',
        redirect: 'error',
      })
    );
  });

  it('should request a token with the user credentials and the ID of a client without a secret', async () => {
    const { ctx, fetchMock } = createContext({ access_token: 'new-token' });

    await getOAuth2AccessToken({
      ctx,
      scheme,
      values: { username: 'barista@example.com', password: 'p@ss word', clientId: 'cafe-client' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      tokenUrl,
      expect.objectContaining({
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=password&username=barista%40example.com&password=p%40ss+word&client_id=cafe-client',
      })
    );
  });

  it('should resolve a relative token URL against the server URL', async () => {
    const { ctx, fetchMock } = createContext({ access_token: 'new-token' });

    await getOAuth2AccessToken({
      ctx,
      scheme: {
        type: 'oauth2',
        flows: { clientCredentials: { tokenUrl: '/oauth2/token', scopes } },
      },
      values: { clientId: 'cafe-client', clientSecret: 'secret' },
      serverUrl: 'https://api.cafe.redocly.com/v1',
    });

    expect(fetchMock).toHaveBeenCalledWith(tokenUrl, expect.anything());
  });

  it('should add the credentials of the token request and the tokens of the response to the secrets', async () => {
    const { ctx } = createContext({ access_token: 'new-token', refresh_token: 'refresh-token' });

    await getOAuth2AccessToken({
      ctx,
      scheme,
      values: {
        username: 'barista@example.com',
        password: 'p@ss word',
        clientId: 'cafe-client',
        clientSecret: 'secret',
      },
    });

    expect(ctx.secretsSet).toEqual(
      new Set(['p@ss word', btoa('cafe-client:secret'), 'new-token', 'refresh-token'])
    );
  });

  it('should reuse the token until it is about to expire', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { ctx, fetchMock } = createContext({ access_token: 'new-token', expires_in: 60 });
    const values = { clientId: 'cafe-client', clientSecret: 'secret' };

    await getOAuth2AccessToken({ ctx, scheme, values });
    await getOAuth2AccessToken({ ctx, scheme, values });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(55_000);
    await getOAuth2AccessToken({ ctx, scheme, values });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should report the error of a failed token request', async () => {
    const { ctx } = createContext(
      { error: 'invalid_client', error_description: 'Client authentication failed' },
      401
    );

    await expect(
      getOAuth2AccessToken({
        ctx,
        scheme,
        values: { clientId: 'cafe-client', clientSecret: 'wrong-secret' },
      })
    ).rejects.toThrow(
      `The OAuth2 token request to ${tokenUrl} failed with status 401 (invalid_client: Client authentication failed).`
    );
  });

  it('should report the cause of a token request that got no response', async () => {
    const { ctx, fetchMock } = createContext({});
    fetchMock.mockRejectedValue(
      new TypeError('fetch failed', { cause: new Error('unexpected redirect') })
    );

    await expect(
      getOAuth2AccessToken({
        ctx,
        scheme,
        values: { clientId: 'cafe-client', clientSecret: 'secret' },
      })
    ).rejects.toThrow(`The OAuth2 token request to ${tokenUrl} failed: unexpected redirect`);
  });

  it('should reject a token of a type other than Bearer', async () => {
    const { ctx } = createContext({ access_token: 'new-token', token_type: 'mac' });

    await expect(
      getOAuth2AccessToken({
        ctx,
        scheme,
        values: { clientId: 'cafe-client', clientSecret: 'secret' },
      })
    ).rejects.toThrow(
      `The OAuth2 token response from ${tokenUrl} has the token type \`mac\`, but Respect supports only \`Bearer\`.`
    );
  });

  it('should list the accepted values when none of the options is complete', async () => {
    const { ctx } = createContext({});

    await expect(
      getOAuth2AccessToken({ ctx, scheme, values: { username: 'barista@example.com' } })
    ).rejects.toThrow(
      'Missing required values for oauth2 security scheme: `accessToken`, or `username` and `password` for the password flow, or `clientId` and `clientSecret` for the clientCredentials flow'
    );
  });
});
