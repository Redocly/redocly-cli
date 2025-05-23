import { describe, it, expect } from 'vitest';
import { getSecurityParameters } from '../../context-parser/get-security-parameters';

import type { TestContext } from '../../../types';

describe('getSecurityParameters', () => {
  const ctx = {
    secretFields: new Set(),
  } as TestContext;

  it('should return security parameters for API Key Auth', () => {
    const result = getSecurityParameters(ctx, {
      scheme: {
        type: 'apiKey',
        in: 'query',
        name: 'api_key',
      },
      values: {
        value: '12345678-ABCD-90EF-GHIJ-1234567890KL',
      },
    });

    expect(result).toEqual({
      in: 'query',
      name: 'api_key',
      value: '12345678-ABCD-90EF-GHIJ-1234567890KL',
    });
  });

  it('should return security parameters for Basic Auth', () => {
    const result = getSecurityParameters(ctx, {
      scheme: {
        type: 'http',
        scheme: 'basic',
      },
      values: {
        username: 'username',
        password: 'password',
      },
    });

    expect(result).toEqual({
      in: 'header',
      name: 'Authorization',
      value: `Basic dXNlcm5hbWU6cGFzc3dvcmQ=`,
    });
  });

  it('should return security parameters for Bearer Auth', () => {
    const result = getSecurityParameters(ctx, {
      scheme: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      values: {
        token:
          'eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiBEb2UifQ.LlTGHPZRXbci-y349jXXN0byQniQQqwKGybzQCFIgY0',
      },
    });

    expect(result).toEqual({
      in: 'header',
      name: 'Authorization',
      value:
        'Bearer eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiBEb2UifQ.LlTGHPZRXbci-y349jXXN0byQniQQqwKGybzQCFIgY0',
    });
  });

  it('should return security parameters for OpenID Auth', () => {
    const result = getSecurityParameters(ctx, {
      scheme: {
        type: 'openIdConnect',
        openIdConnectUrl: 'https://example.com',
      },
      values: {
        accessToken: 'openid-token',
      },
    });

    expect(result).toEqual({
      in: 'header',
      name: 'Authorization',
      value: 'Bearer openid-token',
    });
  });

  it('should return security parameters for OAuth2 Auth', () => {
    const result = getSecurityParameters(ctx, {
      scheme: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://example.com/authorize',
            tokenUrl: 'https://example.com/token',
            scopes: {
              read: 'Read access',
              write: 'Write access',
            },
          },
        },
      },
      values: {
        accessToken: 'oauth2-token',
      },
    });

    expect(result).toEqual({
      in: 'header',
      name: 'Authorization',
      value: 'Bearer oauth2-token',
    });
  });

  it('should return undefined for unknown security scheme', () => {
    const result = getSecurityParameters(ctx, {
      scheme: {
        type: 'mutualTLS',
      },
      values: {},
    });

    expect(result).toBeUndefined();
  });
});
