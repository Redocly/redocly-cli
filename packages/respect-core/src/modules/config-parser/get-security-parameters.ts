import type { ApiKeyAuth, BasicAuth, BearerAuth } from 'core/src/typings/openapi';
import type { ResolvedSecurity } from 'core/src/typings/arazzo';
import type { ParameterWithIn } from './parse-parameters';

export function getSecurityParameters(security: ResolvedSecurity): ParameterWithIn {
  if (isApiKeyAuth(security)) {
    return {
      in: security.scheme.in,
      name: security.scheme.name,
      value: security.values.value,
    };
  }

  if (isBasicAuth(security)) {
    const { username, password } = security.values;

    return getAuthHeader(`Basic ${btoa(`${username}:${password}`)}`);
  }

  if (isBearerAuth(security)) {
    return getAuthHeader(`Bearer ${security.values.token}`);
  }

  return getAuthHeader(`Bearer ${security.values.accessToken}`);
}

function getAuthHeader(value: string): ParameterWithIn {
  return {
    in: 'header',
    name: 'Authorization',
    value,
  };
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
