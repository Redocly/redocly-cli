import type {
  ApiKeyAuth,
  BasicAuth,
  BearerAuth,
  OAuth2Auth,
  OpenIDAuth,
  ResolvedSecurity,
} from '@redocly/openapi-core';
import type { TestContext } from '../../types';
import type { ParameterWithIn } from './parse-parameters';

export function getSecurityParameter(
  security: ResolvedSecurity,
  ctx: TestContext
): ParameterWithIn | undefined {
  if (isApiKeyAuth(security)) {
    return {
      in: security.scheme.in,
      name: security.scheme.name,
      value: security.values.value,
    };
  }

  if (isBasicAuth(security)) {
    const { username, password } = security.values;

    return getAuthHeader(ctx, `Basic ${btoa(`${username}:${password}`)}`);
  }

  if (isBearerAuth(security)) {
    return getAuthHeader(ctx, `Bearer ${security.values.token}`);
  }

  if (isOpenIdConnectAuth(security)) {
    const { accessToken } = security.values;
    return getAuthHeader(ctx, `Bearer ${accessToken}`);
  }

  if (isOAuth2Auth(security)) {
    const { accessToken } = security.values;
    return getAuthHeader(ctx, `Bearer ${accessToken}`);
  }

  return undefined;
}

function getAuthHeader(ctx: TestContext, value: string): ParameterWithIn {
  ctx.secretFields.add(value);

  return {
    in: 'header',
    name: 'Authorization',
    value,
  };
}

function isOAuth2Auth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: OAuth2Auth }> {
  return security.scheme.type === 'oauth2';
}

function isOpenIdConnectAuth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: OpenIDAuth }> {
  return security.scheme.type === 'openIdConnect';
}

function isApiKeyAuth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: ApiKeyAuth }> {
  return security.scheme.type === 'apiKey';
}

function isBasicAuth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: BasicAuth }> {
  return security.scheme.type === 'http' && security.scheme.scheme === 'basic';
}

function isBearerAuth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: BearerAuth }> {
  return security.scheme.type === 'http' && security.scheme.scheme === 'bearer';
}
