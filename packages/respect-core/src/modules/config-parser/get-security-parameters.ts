import type {
  BasicAuth,
  BearerAuth,
  ApiKeyAuth,
  OpenIDAuth,
  OAuth2Auth,
} from 'core/src/typings/openapi';
import type { ResolvedSecurity } from 'core/src/typings/arazzo';
import type { ParameterWithIn } from './parse-parameters';

export function getSecurityParameters(resolvedSecurity: ResolvedSecurity): ParameterWithIn {
  if (isBasicAuth(resolvedSecurity)) {
    const { username, password } = resolvedSecurity.values;

    return {
      in: 'header',
      name: 'Authorization',
      value: `Basic ${btoa(`${username}:${password}`)}`,
    };
  }

  if (isBearerAuth(resolvedSecurity)) {
    const { token } = resolvedSecurity.values;

    return {
      in: 'header',
      name: 'Authorization',
      value: `Bearer ${token}`,
    };
  }

  if (isApiKeyAuth(resolvedSecurity)) {
    const { value } = resolvedSecurity.values;

    return {
      in: resolvedSecurity.scheme.in,
      name: resolvedSecurity.scheme.name,
      value,
    };
  }

  if (isOpenIDAuth(resolvedSecurity) || isOAuth2Auth(resolvedSecurity)) {
    return {
      in: 'header',
      name: 'Authorization',
      value: `Bearer ${resolvedSecurity.values.accessToken}`,
    };
  }

  throw new Error('Unsupported security scheme');
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

function isOpenIDAuth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: OpenIDAuth }> {
  return security.scheme.type === 'openIdConnect';
}

function isOAuth2Auth(
  security: ResolvedSecurity
): security is Extract<ResolvedSecurity, { scheme: OAuth2Auth }> {
  return security.scheme.type === 'oauth2';
}
