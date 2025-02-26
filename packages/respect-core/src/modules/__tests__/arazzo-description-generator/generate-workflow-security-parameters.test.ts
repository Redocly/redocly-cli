import { generateWorkflowSecurityParameters } from '../../arazzo-description-generator';

describe('generateWorkflowSecurityParameters', () => {
  it('should return the correct workflow security parameters for Basic authentication', () => {
    const inputsComponents = {
      inputs: {
        basicAuth: {
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
        value: `Basic ....`,
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
