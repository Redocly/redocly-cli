import { generateStepSecurity } from '../../arazzo-description-generator/index.js';

function inputsComponentsFor(name: string) {
  return {
    inputs: {
      [name]: {
        type: 'object',
        properties: {
          [name]: { type: 'string', format: 'password' },
        },
      },
    },
  };
}

describe('generateStepSecurity', () => {
  it('should generate x-security with username and password for Basic authentication', () => {
    const result = generateStepSecurity(inputsComponentsFor('basicAuth'), [{ basicAuth: [] }], {
      basicAuth: { type: 'http', scheme: 'basic' },
    } as any);

    expect(result).toEqual({
      xSecurity: [
        {
          schemeName: 'basicAuth',
          values: {
            username: '$inputs.basicAuth_username',
            password: '$inputs.basicAuth_password',
          },
        },
      ],
      parameters: [],
    });
  });

  it('should generate x-security with a token for Bearer authentication', () => {
    const result = generateStepSecurity(inputsComponentsFor('bearerAuth'), [{ bearerAuth: [] }], {
      bearerAuth: { type: 'http', scheme: 'bearer' },
    } as any);

    expect(result).toEqual({
      xSecurity: [{ schemeName: 'bearerAuth', values: { token: '$inputs.bearerAuth' } }],
      parameters: [],
    });
  });

  it('should generate x-security with an apiKey for ApiKey authentication', () => {
    const result = generateStepSecurity(inputsComponentsFor('apiKey'), [{ apiKey: [] }], {
      apiKey: { type: 'apiKey', name: 'X-API-Key', in: 'header' },
    } as any);

    expect(result).toEqual({
      xSecurity: [{ schemeName: 'apiKey', values: { apiKey: '$inputs.apiKey' } }],
      parameters: [],
    });
  });

  it('should generate x-security with an accessToken for OAuth2 authentication', () => {
    const result = generateStepSecurity(
      inputsComponentsFor('OAuth2'),
      [{ OAuth2: ['menu:write'] }],
      {
        OAuth2: { type: 'oauth2', flows: {} },
      } as any
    );

    expect(result).toEqual({
      xSecurity: [{ schemeName: 'OAuth2', values: { accessToken: '$inputs.OAuth2' } }],
      parameters: [],
    });
  });

  it('should fall back to an Authorization parameter for an HTTP scheme Respect does not support', () => {
    const result = generateStepSecurity(
      inputsComponentsFor('negotiateAuth'),
      [{ negotiateAuth: [] }],
      {
        negotiateAuth: { type: 'http', scheme: 'negotiate' },
      } as any
    );

    expect(result).toEqual({
      xSecurity: [],
      parameters: [
        { name: 'Authorization', value: 'negotiate {$inputs.negotiateAuth}', in: 'header' },
      ],
    });
  });

  it('should generate nothing when the scheme cannot be satisfied by a value input', () => {
    const result = generateStepSecurity(inputsComponentsFor('mtls'), [{ mtls: [] }], {
      mtls: { type: 'mutualTLS' },
    } as any);

    expect(result).toEqual({ xSecurity: [], parameters: [] });
  });

  it('should generate nothing when there are no security requirements', () => {
    const result = generateStepSecurity({ inputs: {} }, [], {});

    expect(result).toEqual({ xSecurity: [], parameters: [] });
  });
});
