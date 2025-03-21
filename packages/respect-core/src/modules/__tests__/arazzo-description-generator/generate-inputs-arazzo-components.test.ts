import { type Oas3SecurityScheme } from '@redocly/openapi-core/src/typings/openapi.js';
import { generateSecurityInputsArazzoComponents } from '../../arazzo-description-generator/index.js';

describe('generateSecurityInputsArazzoComponents', () => {
  it('should generate empty inputs for the security schemes if there are no security schemes', () => {
    const securitySchemes = {};
    const result = generateSecurityInputsArazzoComponents(securitySchemes);
    expect(result).toEqual({ inputs: {} });
  });

  it('should generate the correct inputs for the Basic auth security scheme', () => {
    const securitySchemes = {
      basicAuth: {
        type: 'http' as const,
        scheme: 'basic',
      } as Oas3SecurityScheme,
    };
    const result = generateSecurityInputsArazzoComponents(securitySchemes);
    expect(result).toEqual({
      inputs: {
        basicAuth: {
          type: 'object',
          properties: {
            basicAuth: {
              type: 'string',
              description: 'Basic authentication',
              format: 'password',
            },
          },
        },
      },
    });
  });

  it('should generate the correct inputs for the Bearer auth security scheme', () => {
    const securitySchemes = {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
      } as Oas3SecurityScheme,
    };
    const result = generateSecurityInputsArazzoComponents(securitySchemes);
    expect(result).toEqual({
      inputs: {
        bearerAuth: {
          type: 'object',
          properties: {
            bearerAuth: {
              type: 'string',
              description: 'JWT Authentication token for ${name}',
              format: 'password',
            },
          },
        },
      },
    });
  });

  it('should generate the correct inputs for the ApiKey auth security scheme', () => {
    const securitySchemes = {
      apiKey: {
        type: 'apiKey' as const,
        name: 'X-API-Key',
        in: 'header',
      } as Oas3SecurityScheme,
    };
    const result = generateSecurityInputsArazzoComponents(securitySchemes);
    expect(result).toEqual({
      inputs: {
        apiKey: {
          type: 'object',
          properties: {
            apiKey: {
              type: 'string',
              description: 'Authentication token for apiKey',
              format: 'password',
            },
          },
        },
      },
    });
  });
});
