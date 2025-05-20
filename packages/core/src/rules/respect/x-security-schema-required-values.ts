import { logger } from '../../logger.js';

import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const REQUIRED_VALUES_BY_AUTH_TYPE = {
  apiKey: ['value'],
  basic: ['username', 'password'],
  digest: ['username', 'password'],
  bearer: ['token'],
  oauth2: ['accessToken'],
  openIdConnect: ['accessToken'],
  mutualTLS: [],
} as const;

type AuthType = keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE;

export const XSecuritySchemaRequiredValues: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location }: UserContext) {
        const extendedSecurity = step?.['x-security'];

        if (!extendedSecurity) {
          return;
        }

        for (const securitySchema of extendedSecurity) {
          // TODO: Handle schemeName case, this will require bundled OpenAPI definitions
          if ('schemeName' in securitySchema) {
            continue;
          }

          if (!('scheme' in securitySchema)) {
            continue;
          }

          const { scheme, values } = securitySchema;

          if (!('type' in scheme)) {
            continue;
          }

          const { type } = scheme;
          const authType = type === 'http' ? scheme.scheme : type;

          if (authType === 'mutualTLS') {
            logger.warn(
              'Please use CLI option to provide mutualTLS certificates for mutualTls authentication security schema.'
            );
            continue;
          }

          const requiredValues = REQUIRED_VALUES_BY_AUTH_TYPE[authType as AuthType];

          if (!requiredValues) {
            report({
              message: `The \`${authType}\` authentication security schema is not supported.`,
              location: location.child(['x-security', extendedSecurity.indexOf(securitySchema)]),
            });
            continue;
          }

          for (const requiredValue of requiredValues) {
            if (!values || !(requiredValue in values)) {
              report({
                message: `The \`${requiredValue}\` is required for ${authType} authentication security schema.`,
                location: location.child(['x-security', extendedSecurity.indexOf(securitySchema)]),
              });
            }
          }
        }
      },
    },
  };
};
