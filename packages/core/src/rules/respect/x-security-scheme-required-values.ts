import { logger } from '../../logger.js';
import type { ExtendedSecurity } from '../../typings/arazzo.js';
import type { OAuth2Auth } from '../../typings/openapi.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const REQUIRED_VALUES_BY_AUTH_TYPE = {
  apiKey: ['apiKey'],
  basic: ['username', 'password'],
  digest: ['username', 'password'],
  bearer: ['token'],
  openIdConnect: ['accessToken'],
  mutualTLS: [],
} as const;

type AuthType = keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE | 'oauth2';

function getOAuth2RequiredValues(
  flows: OAuth2Auth['flows'] | undefined,
  values: Record<string, unknown> | undefined
): readonly string[] {
  if (values && 'accessToken' in values) {
    return ['accessToken'];
  }
  if (flows?.clientCredentials) {
    return ['clientId', 'clientSecret'];
  }
  if (flows?.password) {
    return ['username', 'password'];
  }
  return ['accessToken'];
}

function validateSecuritySchemas(
  extendedSecurity: ExtendedSecurity[] | undefined,
  { report, location }: UserContext
) {
  if (!extendedSecurity) {
    return;
  }

  for (const securitySchema of extendedSecurity) {
    // TODO: Handle schemeName case, this will require bundled OpenAPI definitions
    if ('schemeName' in securitySchema) {
      continue;
    }

    const { scheme, values } = securitySchema;
    // TODO: Struct rule does not check before this point, so we need to check it here. Investigate if we can move this check to the Struct rule.
    const authType = (scheme?.type === 'http' ? scheme.scheme : scheme?.type) as AuthType;

    if (authType === 'mutualTLS') {
      logger.warn(
        'Please use CLI option to provide mutualTLS certificates for mutualTls authentication security schema.'
      );
      continue;
    }

    const requiredValues =
      authType === 'oauth2'
        ? getOAuth2RequiredValues((scheme as OAuth2Auth)?.flows, values as Record<string, unknown>)
        : REQUIRED_VALUES_BY_AUTH_TYPE[authType as keyof typeof REQUIRED_VALUES_BY_AUTH_TYPE];

    if (requiredValues) {
      for (const requiredValue of requiredValues) {
        if (!values || !(requiredValue in values)) {
          report({
            message: `The \`${requiredValue}\` is required when using the ${authType} authentication security schema.`,
            location: location.child(['x-security', extendedSecurity.indexOf(securitySchema)]),
          });
        }
      }
    } else {
      report({
        message: `The \`${authType}\` authentication security schema is not supported.`,
        location: location.child(['x-security', extendedSecurity.indexOf(securitySchema)]),
      });
    }
  }
}

export const XSecuritySchemaRequiredValues: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, context) {
        validateSecuritySchemas(step?.['x-security'], context);
      },
    },
    Workflow: {
      enter(workflow, context) {
        validateSecuritySchemas(workflow?.['x-security'], context);
      },
    },
  };
};
