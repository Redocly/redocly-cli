import { type ArazzoDefinition, type Oas3SecurityScheme } from '@redocly/openapi-core';

export function generateSecurityInputsArazzoComponents(
  securitySchemes: Record<string, Oas3SecurityScheme>
) {
  const inputs: NonNullable<ArazzoDefinition['components']>['inputs'] = {};

  for (const [name, securityScheme] of Object.entries(securitySchemes)) {
    if (securityScheme.type !== 'http' && securityScheme.type !== 'apiKey') {
      continue;
    }

    if (securityScheme.type === 'http' && securityScheme.scheme?.toLowerCase() === 'basic') {
      inputs[name] = {
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            description: 'Basic authentication',
            format: 'password',
          },
        },
      };
    } else if (
      securityScheme.type === 'http' &&
      securityScheme.scheme?.toLowerCase() === 'bearer'
    ) {
      inputs[name] = {
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            description: 'JWT Authentication token for ${name}',
            format: 'password',
          },
        },
      };
    } else {
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
  }

  return { inputs };
}
