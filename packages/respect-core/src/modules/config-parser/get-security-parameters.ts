import type {
  ApiKeyAuth,
  BasicAuth,
  BearerAuth,
  OAuth2Auth,
  OpenIDAuth,
} from 'core/src/typings/openapi';
import type { ResolvedSecurity } from 'core/src/typings/arazzo';
import type { ParameterWithIn } from './parse-parameters';

export function getSecurityParameters(security: ResolvedSecurity): ParameterWithIn | undefined {
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

  if (isOpenIdConnectAuth(security)) {
    const { accessToken } = security.values;
    return getAuthHeader(`Bearer ${accessToken}`);
  }

  if (isOAuth2Auth(security)) {
    const { accessToken } = security.values;
    return getAuthHeader(`Bearer ${accessToken}`);
  }

  return undefined;
}

function getAuthHeader(value: string): ParameterWithIn {
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
