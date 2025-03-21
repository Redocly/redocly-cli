import { generateWorkflowSecurityParameters } from '../../arazzo-description-generator/index.js';

describe('generateWorkflowSecurityParameters', () => {
  it('should return the correct workflow security parameters for Basic authentication', () => {
    const inputsComponents = {
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
    };

    const security = [{ basicAuth: [] }];

    const securitySchemes = {
      basicAuth: {
        type: 'http',
        scheme: 'basic',
      },
    } as any;

    const result = generateWorkflowSecurityParameters(inputsComponents, security, securitySchemes);

    expect(result).toEqual([
      {
        name: 'Authorization',
        value: `Basic {$inputs.basicAuth}`,
        in: 'header',
      },
    ]);
  });

  it('should return the correct workflow security parameters for Bearer authentication', () => {
    const inputsComponents = {
      inputs: {
        bearerAuth: {
          type: 'string',
          description: 'Bearer token',
          format: 'password',
        },
      },
    };

    const security = [{ bearerAuth: [] }];

    const securitySchemes = {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    } as any;

    const result = generateWorkflowSecurityParameters(inputsComponents, security, securitySchemes);

    expect(result).toEqual([
      {
        name: 'Authorization',
        value: `Bearer {$inputs.bearerAuth}`,
        in: 'header',
      },
    ]);
  });

  it('should return the correct workflow security parameters for ApiKey authentication', () => {
    const inputsComponents = {
      inputs: {
        apiKey: {
          type: 'string',
          description: 'ApiKey token',
          format: 'password',
        },
      },
    };

    const security = [{ apiKey: [] }];

    const securitySchemes = {
      apiKey: {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
    } as any;

    const result = generateWorkflowSecurityParameters(inputsComponents, security, securitySchemes);

    expect(result).toEqual([
      {
        name: 'X-API-Key',
        value: `$inputs.apiKey`,
        in: 'header',
      },
    ]);
  });

  it('should return an empty array if there are no security parameters', () => {
    const inputsComponents = {};
    const security = [] as any;
    const securitySchemes = {};

    const result = generateWorkflowSecurityParameters(inputsComponents, security, securitySchemes);

    expect(result).toEqual([]);
  });

  it('should return an empty array if the security scheme is not supported', () => {
    const inputsComponents = {
      inputs: {
        oauth2Auth: {
          type: 'string',
          description: 'OAuth2 token',
        },
      },
    };
    const security = [{ oauth2Auth: [] }] as any;
    const securitySchemes = {
      oauth2Auth: {
        type: 'oauth2',
      },
    } as any;

    const result = generateWorkflowSecurityParameters(inputsComponents, security, securitySchemes);

    expect(result).toEqual([]);
  });
});
