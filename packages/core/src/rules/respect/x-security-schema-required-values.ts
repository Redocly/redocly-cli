import { logger } from '../../logger.js';

import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const XSecuritySchemaRequiredValues: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location }: UserContext) {
        const extendedSecurity = step?.['x-security'];

        if (!extendedSecurity) {
          return;
        }

        const SchemeTypeToRequiredValueMapping = {
          apiKey: ['value'],
          basic: ['username', 'password'],
          bearer: ['token'],
          oauth2: ['accessToken'],
          digest: ['username', 'password'],
        };

        for (const securitySchema of extendedSecurity) {
          // TODO: Handle schemeName case, this will require bundled OpenAPI definitions
          if ('schemeName' in securitySchema) continue;
          if (!('scheme' in securitySchema)) continue;

          const { scheme, values } = securitySchema;
          if (!('type' in scheme)) continue;

          const { type } = scheme;
          const schemeName = type === 'http' ? scheme.scheme : type;

          if (schemeName === 'mutualTls') {
            logger.warn(
              'Please use CLI option to provide mutualTLS certificates for mutualTls authentication security schema.'
            );
            continue;
          }

          if (schemeName === 'openIdConnect') {
            report({
              message: `The \`${schemeName}\` is not supported by Respect.`,
              location: location.child(['x-security', extendedSecurity.indexOf(securitySchema)]),
            });
            continue;
          }

          const requiredValues =
            schemeName in SchemeTypeToRequiredValueMapping
              ? SchemeTypeToRequiredValueMapping[
                  schemeName as keyof typeof SchemeTypeToRequiredValueMapping
                ]
              : undefined;

          if (!requiredValues) continue;

          for (const requiredValue of requiredValues) {
            if (!values || !(requiredValue in values)) {
              report({
                message: `The \`${requiredValue}\` is required for ${schemeName} authentication security schema.`,
                location: location.child(['x-security', extendedSecurity.indexOf(securitySchema)]),
              });
            }
          }
        }
      },
    },
  };
};
