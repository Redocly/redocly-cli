import type { Oas3SecurityScheme } from 'core/src/typings/openapi';
import type { ResolvedSecurity } from 'core/src/typings/arazzo';

const REQUIRED_VALUES_BY_AUTH_TYPE = {
  apiKey: ['value'],
  basic: ['username', 'password'],
  digest: ['username', 'password'],
  bearer: ['token'],
} as const;

type AuthType = keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE;

// TODO: This should be replaced with schema validation in Respect rules
export function resolveXSecurity({
  scheme,
  values,
}: {
  scheme: Oas3SecurityScheme;
  values: Record<string, string>;
}): ResolvedSecurity {
  const authType = scheme.type === 'http' ? scheme.scheme : scheme.type;

  const requiredKeys =
    authType in REQUIRED_VALUES_BY_AUTH_TYPE
      ? REQUIRED_VALUES_BY_AUTH_TYPE[authType as AuthType]
      : ['accessToken']; // Default fallback

  if (requiredKeys) {
    for (const key of requiredKeys) {
      if (!values?.[key]) {
        throw new Error(`Missing required value \`${key}\` for ${authType} security scheme`);
      }
    }
  }

  return { scheme, values } as ResolvedSecurity;
}
