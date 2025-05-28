import { collectXSecurityAuthTypes } from '../../utils/telemetry.js';

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
