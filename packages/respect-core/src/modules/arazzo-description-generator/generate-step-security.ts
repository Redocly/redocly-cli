import {
  type ArazzoDefinition,
  type Oas3SecurityRequirement,
  type Oas3SecurityScheme,
} from '@redocly/openapi-core';

import { type ExtendedSecurity, type Parameter } from '../../types.js';

export type GeneratedStepSecurity = {
  xSecurity: ExtendedSecurity[];
  parameters: Parameter[];
};

/**
 * Express an operation's security requirements the way Respect can execute
 * them: an `x-security` entry with `$inputs` values for every scheme type
 * Respect supports (see flow-runner/validate-x-security-parameters.ts), a
 * plain Authorization header parameter for other HTTP schemes, and nothing
 * for schemes that a value input cannot satisfy (such as mutualTLS).
 */
export function generateStepSecurity(
  inputsComponents: NonNullable<ArazzoDefinition['components']>,
  security: Oas3SecurityRequirement[],
  securitySchemes: Record<string, Oas3SecurityScheme>
): GeneratedStepSecurity {
  const xSecurity: ExtendedSecurity[] = [];
  const parameters: Parameter[] = [];

  for (const securityRequirement of security ?? []) {
    for (const securityName of Object.keys(securityRequirement)) {
      if (!inputsComponents?.inputs?.[securityName]) {
        continue;
      }

      const securityScheme = securitySchemes[securityName];
      const httpScheme =
        securityScheme?.type === 'http' ? securityScheme.scheme?.toLowerCase() : undefined;

      if (securityScheme?.type === 'apiKey') {
        xSecurity.push({
          schemeName: securityName,
          values: { apiKey: `$inputs.${securityName}` },
        });
      } else if (securityScheme?.type === 'oauth2' || securityScheme?.type === 'openIdConnect') {
        xSecurity.push({
          schemeName: securityName,
          values: { accessToken: `$inputs.${securityName}` },
        });
      } else if (httpScheme === 'bearer') {
        xSecurity.push({
          schemeName: securityName,
          values: { token: `$inputs.${securityName}` },
        });
      } else if (httpScheme === 'basic' || httpScheme === 'digest') {
        xSecurity.push({
          schemeName: securityName,
          values: {
            username: `$inputs.${securityName}_username`,
            password: `$inputs.${securityName}_password`,
          },
        });
      } else if (securityScheme?.type === 'http' && securityScheme.scheme) {
        // Respect's x-security does not know this HTTP scheme; an RFC 7235
        // Authorization header with the scheme's own prefix still expresses it.
        parameters.push({
          name: 'Authorization',
          value: `${securityScheme.scheme} {$inputs.${securityName}}`,
          in: 'header',
        });
      }
      // Anything else cannot be determined from the description; skip it.
    }
  }

  return { xSecurity, parameters };
}
