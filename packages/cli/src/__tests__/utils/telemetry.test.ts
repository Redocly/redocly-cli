import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ANONYMOUS_ID_CACHE_FILE } from '../../utils/constants.js';
import {
  collectXSecurityAuthTypes,
  cacheAnonymousId,
  getCachedAnonymousId,
} from '../../utils/telemetry.js';

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

  it('should handle documents with no workflows', () => {
    const respectXSecurityAuthTypesAndSchemeName: string[] = [];
    const arazzoDocument = {} as Partial<ArazzoDefinition>;
    collectXSecurityAuthTypes(arazzoDocument, respectXSecurityAuthTypesAndSchemeName);
    expect(respectXSecurityAuthTypesAndSchemeName).toEqual([]);
  });

  it('should handle workflows with no x-security', () => {
    const respectXSecurityAuthTypesAndSchemeName: string[] = [];
    const arazzoDocument = {
      workflows: [
        {
          workflowId: 'workflow1',
          steps: [],
        },
      ],
    } as Partial<ArazzoDefinition>;
    collectXSecurityAuthTypes(arazzoDocument, respectXSecurityAuthTypesAndSchemeName);
    expect(respectXSecurityAuthTypesAndSchemeName).toEqual([]);
  });
});

describe('cacheAnonymousId and getCachedAnonymousId', () => {
  const anonymousIdFile = join(tmpdir(), ANONYMOUS_ID_CACHE_FILE);

  beforeEach(() => {
    if (existsSync(anonymousIdFile)) {
      unlinkSync(anonymousIdFile);
    }
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    if (existsSync(anonymousIdFile)) {
      unlinkSync(anonymousIdFile);
    }
    vi.unstubAllEnvs();
  });

  it('should cache and retrieve anonymous ID if it is not in CI', () => {
    process.env.CI = '';

    const testId = 'ann_test123';

    cacheAnonymousId(testId);
    const retrievedId = getCachedAnonymousId();

    expect(retrievedId).toBe(testId);
    expect(existsSync(anonymousIdFile)).toBe(true);
  });

  it('should not cache anonymous ID in CI environment', () => {
    process.env.CI = 'true';
    const testId = 'ann_test123';

    cacheAnonymousId(testId);

    expect(existsSync(anonymousIdFile)).toBe(false);
  });

  it('should not retrieve anonymous ID in CI environment', () => {
    const testId = 'ann_test123';
    cacheAnonymousId(testId);

    process.env.CI = 'true';
    const retrievedId = getCachedAnonymousId();

    expect(retrievedId).toBeUndefined();
  });

  it('should return undefined if no cached ID exists', () => {
    const retrievedId = getCachedAnonymousId();

    expect(retrievedId).toBeUndefined();
  });

  it('should not cache if anonymousId is empty', () => {
    cacheAnonymousId('');

    expect(existsSync(anonymousIdFile)).toBe(false);
  });
});
