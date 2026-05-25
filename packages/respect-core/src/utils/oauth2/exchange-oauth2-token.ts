import type { OAuth2Auth } from '@redocly/openapi-core';

import { UnexpectedError } from '../../modules/checks/checks.js';
import { type TestContext } from '../../types.js';

export type OAuth2ExchangeableFlow = 'clientCredentials' | 'password';

type OAuth2FlowConfig = NonNullable<OAuth2Auth['flows']['clientCredentials' | 'password']>;

export function pickOAuth2ExchangeableFlow(
  scheme: OAuth2Auth,
  values: Record<string, unknown>
): { flow: OAuth2ExchangeableFlow; config: OAuth2FlowConfig } | undefined {
  const flows = scheme.flows ?? {};

  if (flows.clientCredentials && (values.clientId || values.clientSecret)) {
    return { flow: 'clientCredentials', config: flows.clientCredentials };
  }
  if (flows.password && (values.username || values.password)) {
    return { flow: 'password', config: flows.password };
  }
  if (flows.clientCredentials) {
    return { flow: 'clientCredentials', config: flows.clientCredentials };
  }
  if (flows.password) {
    return { flow: 'password', config: flows.password };
  }
  return undefined;
}

function buildScope(
  values: Record<string, unknown>,
  scopes: Record<string, string> | undefined
): string | undefined {
  if (typeof values.scope === 'string' && values.scope.length > 0) {
    return values.scope;
  }
  if (scopes && Object.keys(scopes).length > 0) {
    return Object.keys(scopes).join(' ');
  }
  return undefined;
}

export async function exchangeOAuth2Token({
  scheme,
  values,
  ctx,
}: {
  scheme: OAuth2Auth;
  values: Record<string, unknown>;
  ctx: TestContext;
}): Promise<string> {
  const picked = pickOAuth2ExchangeableFlow(scheme, values);
  if (!picked) {
    throw new UnexpectedError(
      'OAuth2 token exchange requires a `password` or `clientCredentials` flow to be defined on the security scheme.'
    );
  }

  const { flow, config } = picked;
  const tokenUrl = config.tokenUrl;
  if (!tokenUrl) {
    throw new UnexpectedError(
      `OAuth2 ${flow} flow is missing required \`tokenUrl\` on the security scheme.`
    );
  }

  const clientId = typeof values.clientId === 'string' ? values.clientId : undefined;
  const clientSecret = typeof values.clientSecret === 'string' ? values.clientSecret : undefined;
  const scope = buildScope(values, config.scopes);
  const clientAuthMethod = values.clientAuthMethod === 'body' ? 'body' : 'header';

  const cacheKey = [
    flow,
    tokenUrl,
    clientId ?? '',
    flow === 'password' ? (values.username ?? '') : '',
    scope ?? '',
  ].join('|');

  if (!ctx.oauth2TokenCache) {
    ctx.oauth2TokenCache = new Map();
  }
  const cached = ctx.oauth2TokenCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const body = new URLSearchParams();
  if (flow === 'clientCredentials') {
    body.set('grant_type', 'client_credentials');
  } else {
    body.set('grant_type', 'password');
    if (typeof values.username !== 'string' || typeof values.password !== 'string') {
      throw new UnexpectedError(
        'OAuth2 password flow requires both `username` and `password` in `x-security.values`.'
      );
    }
    body.set('username', values.username);
    body.set('password', values.password);
  }
  if (scope) {
    body.set('scope', scope);
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  };

  if (clientId !== undefined && clientAuthMethod === 'body') {
    body.set('client_id', clientId);
    if (clientSecret !== undefined) {
      body.set('client_secret', clientSecret);
    }
  } else if (clientId !== undefined || clientSecret !== undefined) {
    const basic = btoa(`${clientId ?? ''}:${clientSecret ?? ''}`);
    headers.authorization = `Basic ${basic}`;
  } else if (flow === 'clientCredentials') {
    throw new UnexpectedError(
      'OAuth2 clientCredentials flow requires `clientId` (and usually `clientSecret`) in `x-security.values`.'
    );
  }

  if (clientSecret) {
    ctx.secretsSet.add(clientSecret);
  }
  if (flow === 'password' && typeof values.password === 'string') {
    ctx.secretsSet.add(values.password);
  }

  const fetcher = ctx.options.fetch ?? fetch;
  let response: Response;
  try {
    response = await fetcher(tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
      redirect: 'follow',
      signal: AbortSignal.timeout(ctx.options.maxFetchTimeout),
    });
  } catch (error) {
    throw new UnexpectedError(`OAuth2 ${flow} token exchange failed: ${(error as Error).message}`);
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new UnexpectedError(
      `OAuth2 ${flow} token exchange failed with status ${response.status}: ${responseText}`
    );
  }

  let payload: { access_token?: string };
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new UnexpectedError(
      `OAuth2 ${flow} token exchange returned a non-JSON response: ${responseText}`
    );
  }

  if (!payload.access_token) {
    throw new UnexpectedError(
      `OAuth2 ${flow} token exchange response is missing the \`access_token\` field.`
    );
  }

  ctx.secretsSet.add(payload.access_token);
  ctx.oauth2TokenCache.set(cacheKey, payload.access_token);

  return payload.access_token;
}
