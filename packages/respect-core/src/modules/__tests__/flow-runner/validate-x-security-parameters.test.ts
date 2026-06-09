import type {
  Oas3SecurityScheme,
  ApiKeyAuth,
  BasicAuth,
  BearerAuth,
  OAuth2Auth,
} from '@redocly/openapi-core';

import { validateXSecurityParameters } from '../../flow-runner/validate-x-security-parameters.js';

describe('validateXSecurityParameters', () => {
  it('should validate apiKey scheme', () => {
    const scheme: ApiKeyAuth = { type: 'apiKey', name: 'api_key', in: 'header' };
    const values = { apiKey: '123' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw for missing value in apiKey scheme', () => {
    const scheme: ApiKeyAuth = { type: 'apiKey', name: 'api_key', in: 'header' };

    expect(() => validateXSecurityParameters({ scheme, values: {} })).toThrow(
      'Missing required value `apiKey` for apiKey security scheme'
    );
  });

  it('should validate basic scheme', () => {
    const scheme: BasicAuth = { type: 'http', scheme: 'basic' };
    const values = { username: 'user', password: 'password' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw for missing username in basic scheme', () => {
    const scheme: BasicAuth = { type: 'http', scheme: 'basic' };
    const values = { username: 'user' };

    expect(() => validateXSecurityParameters({ scheme, values })).toThrow(
      'Missing required value `password` for basic security scheme'
    );
  });

  it('should validate bearer scheme', () => {
    const scheme: BearerAuth = { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' };
    const values = {
      token:
        'eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiBEb2UifQ.LlTGHPZRXbci-y349jXXN0byQniQQqwKGybzQCFIgY0',
    };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw for missing token in bearer scheme', () => {
    const scheme: BearerAuth = { type: 'http', scheme: 'bearer' };

    expect(() => validateXSecurityParameters({ scheme, values: {} })).toThrow(
      'Missing required value `token` for bearer security scheme'
    );
  });

  it('should throw an error for unsupported security http scheme', () => {
    const scheme = { type: 'http', scheme: 'unknown' } as unknown as Oas3SecurityScheme;
    const values = { accessToken: 'xyz' };

    expect(() => validateXSecurityParameters({ scheme, values })).toThrow(
      'Unsupported security scheme type: unknown'
    );
  });

  it('should validate oauth2 scheme with pre-fetched accessToken (workaround)', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };
    const values = { accessToken: 'pre-fetched-token' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should validate oauth2 clientCredentials with clientId + clientSecret', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };
    const values = { clientId: 'id', clientSecret: 'secret' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw when clientId is missing for oauth2 clientCredentials flow', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    expect(() =>
      validateXSecurityParameters({ scheme, values: { clientSecret: 'secret' } })
    ).toThrow('Missing required value `clientId` for oauth2 security scheme');
  });

  it('should validate oauth2 password flow with username + password', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };
    const values = { username: 'alice', password: 'hunter2' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw when password is missing for oauth2 password flow', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };

    expect(() => validateXSecurityParameters({ scheme, values: { username: 'alice' } })).toThrow(
      'Missing required value `password` for oauth2 security scheme'
    );
  });

  it('should accept username + password for oauth2 when both flows are declared', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
        password: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };
    const values = { username: 'alice', password: 'hunter2' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should accept clientId + clientSecret for oauth2 when both flows are declared', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
        password: {
          tokenUrl: 'https://example.com/token',
          scopes: { read: 'Read access' },
        },
      },
    };
    const values = { clientId: 'id', clientSecret: 'secret' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should require accessToken for oauth2 implicit flow', () => {
    const scheme: OAuth2Auth = {
      type: 'oauth2',
      flows: {
        implicit: {
          authorizationUrl: 'https://example.com/auth',
          scopes: { read: 'Read access' },
        },
      },
    };

    expect(() => validateXSecurityParameters({ scheme, values: {} })).toThrow(
      'Missing required value `accessToken` for oauth2 security scheme'
    );
  });

  it('should throw an error for unsupported security scheme type', () => {
    const scheme = { type: 'unknown' } as unknown as Oas3SecurityScheme;
    const values = { accessToken: 'xyz' };

    expect(() => validateXSecurityParameters({ scheme, values })).toThrow(
      'Unsupported security scheme type: unknown'
    );
  });
});
