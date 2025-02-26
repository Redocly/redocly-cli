import { type Oas3SecurityScheme } from 'core/src/typings/openapi';

export function generateSecurityInputsArazzoComponents(
  securitySchemes: Record<string, Oas3SecurityScheme>
) {
  const inputs: {
    [key: string]: {
      [key: string]: any;
    };
  } = {};

  for (const [name, securityScheme] of Object.entries(securitySchemes)) {
    if (securityScheme.type !== 'http' && securityScheme.type !== 'apiKey') {
      return;
    }

    if (securityScheme?.scheme?.toLowerCase() === 'basic') {
      inputs[name] = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'Username for basic authentication',
          },
          password: {
            type: 'string',
            description: 'Password for basic authentication',
            format: 'password',
          },
        },
        required: ['username', 'password'],
      };
    } else if (securityScheme?.scheme?.toLowerCase() === 'bearer') {
      inputs[name] = {
        type: 'string',
        description: securityScheme?.description || `JWT Authentication token for ${name}`,
        format: 'password',
      };
    } else {
      // TODO: clarify this
      inputs[name] = {
        type: 'string',
        description: securityScheme?.description || `Authentication token for ${name}`,
        format: 'password',
      };
    }
  }

  return { inputs };
}
