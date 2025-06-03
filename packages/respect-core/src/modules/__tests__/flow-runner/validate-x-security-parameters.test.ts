import type { Oas3SecurityScheme, ApiKeyAuth, BasicAuth, BearerAuth } from '@redocly/openapi-core';
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

  it('should throw an error for unsupported security scheme type', () => {
    const scheme = { type: 'unknown' } as unknown as Oas3SecurityScheme;
    const values = { accessToken: 'xyz' };

    expect(() => validateXSecurityParameters({ scheme, values })).toThrow(
      'Unsupported security scheme type: unknown'
    );
  });
});
