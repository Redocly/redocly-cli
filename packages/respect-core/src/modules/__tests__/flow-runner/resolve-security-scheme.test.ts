import { resolveSecurityScheme } from '../../flow-runner/resolve-security-scheme.js';

import type { TestContext, ExtendedSecurity } from '../../../types.js';

describe('resolveSecurityScheme', () => {
  const ctx = {
    $sourceDescriptions: {
      'museum-api': {
        components: {
          securitySchemes: {
            MuseumPlaceholderAuth: { type: 'http', scheme: 'basic' },
            ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
          },
        },
      },
    },
  } as unknown as TestContext;

  it('should return inline scheme when provided directly', () => {
    const scheme = resolveSecurityScheme({
      ctx,
      security: { scheme: { type: 'http', scheme: 'bearer' } } as ExtendedSecurity,
    });

    expect(scheme).toEqual({ type: 'http', scheme: 'bearer' });
  });

  it('should resolve scheme by schemeName link from $sourceDescriptions', () => {
    const scheme = resolveSecurityScheme({
      ctx,
      security: {
        schemeName: '$sourceDescriptions.museum-api.MuseumPlaceholderAuth',
      } as ExtendedSecurity,
    });

    expect(scheme).toEqual({ type: 'http', scheme: 'basic' });
  });

  it('should resolve scheme by schemeName from operation.securitySchemes for step x-security', () => {
    const operation = {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'query', name: 'api_key' },
      },
    } as any;

    const scheme = resolveSecurityScheme({
      ctx,
      security: { schemeName: 'ApiKeyAuth' } as ExtendedSecurity,
      operation,
    });

    expect(scheme).toEqual({ type: 'apiKey', in: 'query', name: 'api_key' });
  });
});
