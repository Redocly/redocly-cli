import type { OAuth2Auth, Oas3SecurityScheme, ResolvedSecurity } from '@redocly/openapi-core';

const REQUIRED_VALUES_BY_AUTH_TYPE = {
  apiKey: ['apiKey'],
  basic: ['username', 'password'],
  digest: ['username', 'password'],
  bearer: ['token'],
  openIdConnect: ['accessToken'],
  mutualTLS: [],
} as const;

type AuthType = keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE | 'oauth2';

// TODO: This should be replaced with schema validation in Respect rules
export function validateXSecurityParameters({
  scheme,
  values,
}: {
  scheme: Oas3SecurityScheme;
  values: Record<string, string>;
}): ResolvedSecurity {
  const authType = (scheme.type === 'http' ? scheme.scheme : scheme.type) as AuthType;

  if (authType === 'oauth2') {
    const requiredKeys = getRequiredValuesForOAuth2((scheme as OAuth2Auth).flows, values);
    for (const key of requiredKeys) {
      if (!values?.[key]) {
        throw new Error(`Missing required value \`${key}\` for oauth2 security scheme`);
      }
    }
    return { scheme, values } as ResolvedSecurity;
  }

  const requiredKeys =
    REQUIRED_VALUES_BY_AUTH_TYPE[authType as keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE];

  if (!requiredKeys) {
    throw new Error(`Unsupported security scheme type: ${authType}`);
  }

  for (const key of requiredKeys) {
    if (!values?.[key]) {
      throw new Error(`Missing required value \`${key}\` for ${authType} security scheme`);
    }
  }

  return { scheme, values } as ResolvedSecurity;
}

// It returns required value keys for an OAuth2 scheme based on its declared flow.
export function getRequiredValuesForOAuth2(
  flows: OAuth2Auth['flows'] | undefined,
  values: Record<string, unknown> | undefined
): string[] {
  if (values?.accessToken) {
    return [];
  }

  if (flows?.clientCredentials) {
    return ['clientId', 'clientSecret'];
  }

  if (flows?.password) {
    return ['username', 'password'];
  }

  return ['accessToken'];
}
