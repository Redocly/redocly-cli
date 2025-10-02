import { collectXSecurityAuthTypes, transformSpecVersionError } from '../../utils/telemetry.js';

import type { ArazzoDefinition } from '@redocly/openapi-core';

describe('collectXSecurityAuthTypes', () => {
  it('should collect X-Security Auth types and schemeNames', () => {
    const respectXSecurityAuthTypesAndSchemeName: string[] = [];
    const arazzoDocument = {
      workflows: [
        {
          workflowId: 'workflow1',
          'x-security': [
            {
              scheme: {
                type: 'http',
                scheme: 'basic',
              },
              values: {
                username: 'username',
                password: 'password',
              },
            },
            {
              scheme: {
                type: 'apiKey',
                name: 'apiKey',
                in: 'header',
              },
              values: {
                value: 'apiKey-value',
              },
            },
          ],
          steps: [
            {
              stepId: 'step1',
              operationId: 'operation1',
              'x-security': [
                {
                  scheme: {
                    type: 'http',
                    scheme: 'bearer',
                  },
                  values: {
                    token: 'token',
                  },
                },
                {
                  scheme: {
                    type: 'oauth2',
                    flows: {
                      clientCredentials: {
                        tokenUrl: 'https://example.com/token',
                      },
                    },
                  },
                  values: {
                    accessToken: 'accessToken',
                  },
                },
              ],
            },
            {
              stepId: 'step2',
              operationId: 'operation2',
              'x-security': [
                {
                  schemeName: 'SomeSchemeName',
                  values: {
                    username: 'username',
                    password: 'password',
                  },
                },
              ],
            },
          ],
        },
      ],
    } as Partial<ArazzoDefinition>;
    collectXSecurityAuthTypes(arazzoDocument, respectXSecurityAuthTypesAndSchemeName);
    expect(respectXSecurityAuthTypesAndSchemeName).toEqual([
      'basic',
      'apiKey',
      'bearer',
      'oauth2',
      'SomeSchemeName',
    ]);
  });
});

describe('transformSpecVersionError', () => {
  it('should transform "Unsupported specification" error', () => {
    const result = transformSpecVersionError('Unsupported specification');
    expect(result).toBe('unsupported');
  });

  it('should transform AsyncAPI version errors', () => {
    const result1 = transformSpecVersionError('Unsupported AsyncAPI version: 2.1.1');
    expect(result1).toBe('unsupported-async-2.1.1');

    const result2 = transformSpecVersionError('Unsupported AsyncAPI version: 1.2.0');
    expect(result2).toBe('unsupported-async-1.2.0');
  });

  it('should transform OpenAPI version errors', () => {
    const result1 = transformSpecVersionError('Unsupported OpenAPI version: 3.2.0');
    expect(result1).toBe('unsupported-openapi-3.2.0');

    const result2 = transformSpecVersionError('Unsupported OpenAPI version: 2.1');
    expect(result2).toBe('unsupported-openapi-2.1');
  });

  it('should handle generic unsupported version errors', () => {
    const result = transformSpecVersionError('Unsupported Some API version: 1.0');
    expect(result).toBe('unsupported');
  });

  it('should transform invalid document errors', () => {
    const result = transformSpecVersionError('Document must be JSON object, got string');
    expect(result).toBe('unknown');
  });

  it('should transform invalid OpenAPI version format errors', () => {
    const result = transformSpecVersionError(
      'Invalid OpenAPI version: should be a string but got "number"'
    );
    expect(result).toBe('invalid-openapi-version');
  });

  it('should return "unknown" for empty or invalid input', () => {
    expect(transformSpecVersionError('')).toBe('unknown');
    expect(transformSpecVersionError(null as any)).toBe('unknown');
    expect(transformSpecVersionError(undefined as any)).toBe('unknown');
  });

  it('should be case insensitive', () => {
    const result1 = transformSpecVersionError('UNSUPPORTED SPECIFICATION');
    expect(result1).toBe('unsupported');

    const result2 = transformSpecVersionError('unsupported asyncapi version: 2.1.1');
    expect(result2).toBe('unsupported-async-2.1.1');
  });
});
