import { type ArazzoDefinition, type Oas3SecurityScheme } from '@redocly/openapi-core';

export function generateSecurityInputsArazzoComponents(
  securitySchemes: Record<string, Oas3SecurityScheme>
) {
  const inputs: NonNullable<ArazzoDefinition['components']>['inputs'] = {};

  for (const [name, securityScheme] of Object.entries(securitySchemes)) {
    const httpScheme =
      securityScheme.type === 'http' ? securityScheme.scheme?.toLowerCase() : undefined;

    if (httpScheme === 'basic' || httpScheme === 'digest') {
      // The input names carry the scheme name, like every other scheme type:
      // Respect maps provided inputs to all workflows, so a bare "username"
      // would force every basic/digest scheme onto one credential pair.
      inputs[name] = {
        type: 'object',
        properties: {
          [`${name}_username`]: {
            type: 'string',
            description: `Username for ${name}`,
          },
          [`${name}_password`]: {
            type: 'string',
            description: `Password for ${name}`,
            format: 'password',
          },
        },
      };
    } else if (httpScheme === 'bearer') {
      inputs[name] = {
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            description: securityScheme?.description || `JWT Authentication token for ${name}`,
            format: 'password',
          },
        },
      };
    } else if (securityScheme.type === 'oauth2' || securityScheme.type === 'openIdConnect') {
      inputs[name] = {
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            description: securityScheme?.description || `Access token for ${name}`,
            format: 'password',
          },
        },
      };
    } else if (securityScheme.type === 'apiKey' || httpScheme) {
      inputs[name] = {
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            description: securityScheme?.description || `Authentication token for ${name}`,
            format: 'password',
          },
        },
      };
    }
    // mutualTLS and unknown scheme types cannot be satisfied by a value input.
  }

  return { inputs };
}
