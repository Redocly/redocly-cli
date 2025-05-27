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
      value: security.values.apiKey,
    };
  }

  if (isBasicAuth(security)) {
    const { username, password } = security.values;
    const value = btoa(`${username}:${password}`);

    ctx.secretFields.add(value);

    return getAuthHeader(`Basic ${value}`, ctx);
  }

  if (isBearerAuth(security)) {
    const { token } = security.values;

    ctx.secretFields.add(token);

    return getAuthHeader(`Bearer ${token}`, ctx);
  }

  if (isOpenIdConnectAuth(security)) {
    const { accessToken } = security.values;

    ctx.secretFields.add(accessToken);

    return getAuthHeader(`Bearer ${accessToken}`, ctx);
  }

  if (isOAuth2Auth(security)) {
    const { accessToken } = security.values;

    ctx.secretFields.add(accessToken);

    return getAuthHeader(`Bearer ${accessToken}`, ctx);
  }

  return undefined;
}

function getAuthHeader(value: string, _ctx: TestContext): ParameterWithIn {
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
