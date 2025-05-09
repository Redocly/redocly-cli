import type { BasicAuth, BearerAuth, ApiKeyAuth } from 'core/src/typings/openapi';
import type { ResolvedSecurity } from 'core/src/typings/arazzo';
import type { ParameterWithIn } from './parse-parameters';

export function getSecurityParameters(security: ResolvedSecurity): ParameterWithIn {
  if (isBasicAuth(security)) {
    const { username, password } = security.values;

    return authHeader(`Basic ${btoa(`${username}:${password}`)}`);
  }

  if (isBearerAuth(security)) {
    return authHeader(`Bearer ${security.values.token}`);
  }

  if (isApiKeyAuth(security)) {
    return {
      in: security.scheme.in,
      name: security.scheme.name,
      value: security.values.value,
    };
  }

  return authHeader(`Bearer ${security.values.accessToken}`);
}

function authHeader(value: string): ParameterWithIn {
  return {
    in: 'header',
    name: 'Authorization',
    value,
  };
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

function isApiKeyAuth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: ApiKeyAuth }> {
  return security.scheme.type === 'apiKey';
}
