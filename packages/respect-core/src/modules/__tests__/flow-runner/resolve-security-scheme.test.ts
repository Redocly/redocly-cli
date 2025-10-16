import { resolveSecurityScheme } from '../../flow-runner/resolve-security-scheme.js';

import type { TestContext, ExtendedSecurity } from '../../../types.js';
import { Oas3SecurityScheme } from 'core/src/typings/openapi.js';
import { OperationDetails } from '../../description-parser/get-operation-from-description.js';

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
      security: { scheme: { type: 'http', scheme: 'bearer' }, values: {} },
    });

    expect(scheme).toEqual({ type: 'http', scheme: 'bearer' });
  });

  it('should resolve scheme by schemeName reference from $sourceDescriptions', () => {
    const scheme = resolveSecurityScheme({
      ctx,
      security: {
        schemeName: '$sourceDescriptions.museum-api.MuseumPlaceholderAuth',
        values: {},
      },
    });

    expect(scheme).toEqual({ type: 'http', scheme: 'basic' });
  });

  it('should resolve scheme by schemeName from operation.securitySchemes for step x-security', () => {
    const operation = {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'query', name: 'api_key' },
      },
    } as unknown as OperationDetails & { securitySchemes?: Record<string, Oas3SecurityScheme> };

    const scheme = resolveSecurityScheme({
      ctx,
      security: { schemeName: 'ApiKeyAuth', values: {} },
      operation,
    });

    expect(scheme).toEqual({ type: 'apiKey', in: 'query', name: 'api_key' });
  });
});
