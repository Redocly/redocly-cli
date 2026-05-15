import type { ArazzoDefinition } from '@redocly/openapi-core';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ANONYMOUS_ID_CACHE_FILE } from '../../utils/constants.js';
import {
  collectXSecurityAuthTypes,
  cacheAnonymousId,
  getCachedAnonymousId,
  collectSourceDescriptionTypes,
  collectCriterionObjectTypes,
} from '../../utils/telemetry.js';

describe('collectXSecurityAuthTypes', () => {
  it('should collect X-Security Auth types and schemeNames', () => {
    const respectXSecurityAuthTypesAndSchemeName = new Set<string>();
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
    expect([...respectXSecurityAuthTypesAndSchemeName]).toEqual([
      'basic',
      'apiKey',
      'bearer',
      'oauth2',
      'SomeSchemeName',
    ]);
  });

  it('should handle documents with no workflows', () => {
    const respectXSecurityAuthTypesAndSchemeName = new Set<string>();
    const arazzoDocument = {} as Partial<ArazzoDefinition>;
    collectXSecurityAuthTypes(arazzoDocument, respectXSecurityAuthTypesAndSchemeName);
    expect([...respectXSecurityAuthTypesAndSchemeName]).toEqual([]);
  });

  it('should handle workflows with no x-security', () => {
    const respectXSecurityAuthTypesAndSchemeName = new Set<string>();
    const arazzoDocument = {
      workflows: [
        {
          workflowId: 'workflow1',
          steps: [],
        },
      ],
    } as Partial<ArazzoDefinition>;
    collectXSecurityAuthTypes(arazzoDocument, respectXSecurityAuthTypesAndSchemeName);
    expect([...respectXSecurityAuthTypesAndSchemeName]).toEqual([]);
  });
});

describe('collectSourceDescriptionTypes', () => {
  it('should collect source description types', () => {
    const respectSourceDescriptionTypes = new Set<string>();
    const arazzoDocument = {
      sourceDescriptions: [
        {
          type: 'openapi',
          url: 'https://example.com/openapi.yaml',
        },
        {
          type: 'arazzo',
          url: 'https://example.com/arazzo.yaml',
        },
        {
          type: 'asyncapi',
          url: 'https://example.com/asyncapi.yaml',
        },
      ],
    } as Partial<ArazzoDefinition>;
    collectSourceDescriptionTypes(arazzoDocument, respectSourceDescriptionTypes);
    expect([...respectSourceDescriptionTypes]).toEqual(['openapi', 'arazzo', 'asyncapi']);
  });

  it('should handle documents with no source descriptions', () => {
    const respectSourceDescriptionTypes = new Set<string>();
    const arazzoDocument = {} as Partial<ArazzoDefinition>;
    collectSourceDescriptionTypes(arazzoDocument, respectSourceDescriptionTypes);
    expect([...respectSourceDescriptionTypes]).toEqual([]);
  });
});

describe('collectCriterionObjectTypes', () => {
  it('should collect criterion object types from all criteria locations', () => {
    const respectCriterionObjectTypes = new Set<string>();
    const arazzoDocument = {
      workflows: [
        {
          workflowId: 'workflow1',
          successActions: [
            {
              name: 'workflow-success',
              type: 'end',
              criteria: [{ condition: '$response.body.id', type: 'jsonpath' }],
            },
          ],
          failureActions: [
            {
              name: 'workflow-failure',
              type: 'end',
              criteria: [{ condition: 'Problem', type: 'regex' }],
            },
          ],
          steps: [
            {
              stepId: 'step1',
              operationId: 'operation1',
              successCriteria: [{ condition: '$statusCode == 200', type: 'simple' }],
              onSuccess: [
                {
                  name: 'step-success',
                  type: 'end',
                  criteria: [
                    {
                      condition: '$.data',
                      context: '$response.body',
                      type: {
                        type: 'jsonpath',
                        version: 'draft-goessner-dispatch-jsonpath-00',
                      },
                    },
                  ],
                },
              ],
              onFailure: [
                {
                  name: 'step-failure',
                  type: 'end',
                  criteria: [
                    {
                      condition: '//error',
                      context: '$response.body',
                      type: {
                        type: 'xpath',
                        version: 'xpath-30',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      components: {
        successActions: {
          ReusableSuccess: {
            name: 'reusable-success',
            type: 'end',
            criteria: [{ condition: '$statusCode == 201' }],
          },
        },
        failureActions: {
          ReusableFailure: {
            name: 'reusable-failure',
            type: 'end',
            criteria: [{ condition: '$statusCode == 500', type: 'regex' }],
          },
        },
      },
    } as Partial<ArazzoDefinition>;

    collectCriterionObjectTypes(arazzoDocument, respectCriterionObjectTypes);

    expect([...respectCriterionObjectTypes]).toEqual(['jsonpath', 'regex', 'simple', 'xpath']);
  });

  it('should handle documents with no criterion objects', () => {
    const respectCriterionObjectTypes = new Set<string>();
    const arazzoDocument = {} as Partial<ArazzoDefinition>;
    collectCriterionObjectTypes(arazzoDocument, respectCriterionObjectTypes);
    expect([...respectCriterionObjectTypes]).toEqual([]);
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
