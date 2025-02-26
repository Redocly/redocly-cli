import { Oas3SecurityScheme } from 'core/src/typings/openapi';
import { generateSecurityInputsArazzoComponents } from '../../arazzo-description-generator';

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
            username: { type: 'string', description: 'Username for basic authentication' },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password for basic authentication',
            },
          },
          required: ['username', 'password'],
        },
      },
    });
  });
});
