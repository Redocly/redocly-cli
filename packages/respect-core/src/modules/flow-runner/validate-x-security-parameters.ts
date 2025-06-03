import type { Oas3SecurityScheme, ResolvedSecurity } from '@redocly/openapi-core';

const REQUIRED_VALUES_BY_AUTH_TYPE = {
  apiKey: ['apiKey'],
  basic: ['username', 'password'],
  digest: ['username', 'password'],
  bearer: ['token'],
  oauth2: ['accessToken'],
  openIdConnect: ['accessToken'],
  mutualTLS: [],
} as const;

type AuthType = keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE;

// TODO: This should be replaced with schema validation in Respect rules
export function validateXSecurityParameters({
  scheme,
  values,
}: {
  scheme: Oas3SecurityScheme;
  values: Record<string, string>;
}): ResolvedSecurity {
  const authType = scheme.type === 'http' ? scheme.scheme : scheme.type;
  const requiredKeys = REQUIRED_VALUES_BY_AUTH_TYPE[authType as AuthType];

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
