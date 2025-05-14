import type { ApiKeyAuth, BasicAuth, BearerAuth, OAuth2Auth } from 'core/src/typings/openapi';
import { validateXSecurityParameters } from '../../flow-runner/validate-x-security-parameters.js';

describe('validateXSecurityParameters', () => {
  it('should validate apiKey scheme', () => {
    const scheme: ApiKeyAuth = { type: 'apiKey', name: 'api_key', in: 'header' };
    const values = { value: '123' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw for missing value in apiKey scheme', () => {
    const scheme: ApiKeyAuth = { type: 'apiKey', name: 'api_key', in: 'header' };

    expect(() => validateXSecurityParameters({ scheme, values: {} })).toThrow(
      'Missing required value `value` for apiKey security scheme'
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

  it('should fall back to default accessToken for unknown types', () => {
    const scheme: OAuth2Auth = { type: 'oauth2', flows: {} };
    const values = { accessToken: 'xyz' };

    const result = validateXSecurityParameters({ scheme, values });
    expect(result).toEqual({ scheme, values });
  });

  it('should throw for missing accessToken in unknown types', () => {
    const scheme: OAuth2Auth = { type: 'oauth2', flows: {} };

    expect(() => validateXSecurityParameters({ scheme, values: {} })).toThrow(
      'Missing required value `accessToken` for oauth2 security scheme'
    );
  });
});
