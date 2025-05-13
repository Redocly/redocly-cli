import type { Oas3SecurityScheme } from 'core/src/typings/openapi';
import type { ResolvedSecurity } from 'core/src/typings/arazzo';

const REQUIRED_VALUES_MAP = {
  apiKey: ['value'],
  basic: ['username', 'password'],
  digest: ['username', 'password'],
  bearer: ['token'],
  oauth2: ['accessToken'],
};

export function validateXSecurityParameters({
  scheme,
  values,
}: {
  scheme: Oas3SecurityScheme;
  values: Record<string, string>;
}): ResolvedSecurity {
  const schemeType = scheme.type === 'http' ? scheme.scheme : scheme.type;

  const requiredKeys = REQUIRED_VALUES_MAP[schemeType as keyof typeof REQUIRED_VALUES_MAP];

  if (requiredKeys) {
    for (const key of requiredKeys) {
      if (!values?.[key]) {
        throw new Error(`Missing required value \`${key}\` for ${schemeType} security scheme`);
      }
    }
  }

  return { scheme, values } as ResolvedSecurity;
}
