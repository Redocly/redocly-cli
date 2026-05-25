import type { OAuth2Auth } from '@redocly/openapi-core';
import type { TestContext } from 'respect-core/src/types.js';

import { exchangeOAuth2Token } from '../../oauth2/exchange-oauth2-token.js';

function makeCtx(fetchImpl: typeof fetch): TestContext {
  return {
    secretsSet: new Set<string>(),
    options: {
      fetch: fetchImpl,
      maxFetchTimeout: 30_000,
    },
  } as unknown as TestContext;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('exchangeOAuth2Token', () => {
  it('exchanges credentials for an access token using the clientCredentials flow', async () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'Read access', write: 'Write access' },
        },
      },
    };

    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ access_token: 'cc-token', token_type: 'Bearer' })
    ) as unknown as typeof fetch;
    const ctx = makeCtx(fetchMock);

    const token = await exchangeOAuth2Token({
      scheme,
      values: { clientId: 'id', clientSecret: 'secret' },
      ctx,
    });

    expect(token).toBe('cc-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://example.com/oauth/token');
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(headers.authorization).toBe(`Basic ${btoa('id:secret')}`);

    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('scope')).toBe('read write');

    expect(ctx.secretsSet.has('secret')).toBe(true);
    expect(ctx.secretsSet.has('cc-token')).toBe(true);
  });

  it('sends credentials in the body when clientAuthMethod is "body"', async () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    const fetchMock = vi.fn(async () =>
      jsonResponse({ access_token: 'body-token' })
    ) as unknown as typeof fetch;
    const ctx = makeCtx(fetchMock);

    await exchangeOAuth2Token({
      scheme,
      values: { clientId: 'id', clientSecret: 'secret', clientAuthMethod: 'body' },
      ctx,
    });

    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();

    const body = new URLSearchParams(init.body as string);
    expect(body.get('client_id')).toBe('id');
    expect(body.get('client_secret')).toBe('secret');
  });

  it('exchanges credentials for an access token using the password flow', async () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    const fetchMock = vi.fn(async () =>
      jsonResponse({ access_token: 'pwd-token' })
    ) as unknown as typeof fetch;
    const ctx = makeCtx(fetchMock);

    const token = await exchangeOAuth2Token({
      scheme,
      values: { username: 'alice', password: 'hunter2' },
      ctx,
    });

    expect(token).toBe('pwd-token');

    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('password');
    expect(body.get('username')).toBe('alice');
    expect(body.get('password')).toBe('hunter2');

    expect(ctx.secretsSet.has('hunter2')).toBe(true);
    expect(ctx.secretsSet.has('pwd-token')).toBe(true);
  });

  it('caches the token so a second call does not re-fetch', async () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    const fetchMock = vi.fn(async () =>
      jsonResponse({ access_token: 'cached-token' })
    ) as unknown as typeof fetch;
    const ctx = makeCtx(fetchMock);

    const first = await exchangeOAuth2Token({
      scheme,
      values: { clientId: 'id', clientSecret: 'secret' },
      ctx,
    });
    const second = await exchangeOAuth2Token({
      scheme,
      values: { clientId: 'id', clientSecret: 'secret' },
      ctx,
    });

    expect(first).toBe('cached-token');
    expect(second).toBe('cached-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws a typed error on a non-2xx response', async () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    const fetchMock = vi.fn(
      async () => new Response('invalid_client', { status: 401 })
    ) as unknown as typeof fetch;
    const ctx = makeCtx(fetchMock);

    await expect(
      exchangeOAuth2Token({
        scheme,
        values: { clientId: 'id', clientSecret: 'wrong' },
        ctx,
      })
    ).rejects.toThrow('OAuth2 clientCredentials token exchange failed with status 401');
  });

  it('throws when the response is missing access_token', async () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/oauth/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    const fetchMock = vi.fn(async () =>
      jsonResponse({ token_type: 'Bearer' })
    ) as unknown as typeof fetch;
    const ctx = makeCtx(fetchMock);

    await expect(
      exchangeOAuth2Token({
        scheme,
        values: { clientId: 'id', clientSecret: 'secret' },
        ctx,
      })
    ).rejects.toThrow('missing the `access_token` field');
  });
});
