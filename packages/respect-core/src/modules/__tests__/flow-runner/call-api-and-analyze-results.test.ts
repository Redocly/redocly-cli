import type { TestContext } from '../../../types.js';

import {
  callAPIAndAnalyzeResults,
  DEFAULT_SEVERITY_CONFIGURATION,
} from '../../flow-runner/index.js';
import { ApiFetcher } from '../../../utils/api-fetcher.js';

const originalFetch = global.fetch;

beforeAll(() => {
  // Reset fetch mock before each test
  global.fetch = vi.fn();
});

afterAll(() => {
  // Restore original fetch after each test
  global.fetch = originalFetch;
});

describe('callAPIAndAnalyzeResults', () => {
  const apiClient = new ApiFetcher({});
  const ctx = {
    apiClient,
    $env: {
      REDOCLY_DOMAIN: 'redocly.com',
    },
    $faker: {
      address: {},
      date: {},
      number: {},
      string: {},
    },
    $descriptions: {
      cats: {
        paths: {
          '/breeds': {
            get: {
              tags: ['Breeds'],
              summary: 'Get a list of breeds',
              description: 'Returns a a list of breeds',
              operationId: 'getBreeds',
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  description: 'limit the amount of results returned',
                  required: false,
                  schema: {
                    type: 'integer',
                    format: 'int64',
                  },
                },
              ],
              responses: {
                '200': {
                  description: 'successful operation',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          title: 'Breed model',
                          description: 'Breed',
                          properties: {
                            breed: {
                              title: 'Breed',
                              description: 'Breed',
                              type: 'string',
                              format: 'string',
                            },
                            country: {
                              title: 'Country',
                              description: 'Country',
                              type: 'string',
                              format: 'string',
                            },
                            origin: {
                              title: 'Origin',
                              description: 'Origin',
                              type: 'string',
                              format: 'string',
                            },
                            coat: {
                              title: 'Coat',
                              description: 'Coat',
                              type: 'string',
                              format: 'string',
                            },
                            pattern: {
                              title: 'Pattern',
                              description: 'Pattern',
                              type: 'string',
                              format: 'string',
                            },
                          },
                          type: 'object',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '/fact': {
            get: {
              tags: ['Facts'],
              summary: 'Get Random Fact',
              description: 'Returns a random fact',
              operationId: 'getRandomFact',
              parameters: [
                {
                  name: 'max_length',
                  in: 'query',
                  description: 'maximum length of returned fact',
                  required: false,
                  schema: {
                    type: 'integer',
                    format: 'int64',
                  },
                },
              ],
              responses: {
                '200': {
                  description: 'successful operation',
                  content: {
                    'application/json': {
                      schema: {
                        title: 'CatFact model',
                        description: 'CatFact',
                        properties: {
                          fact: {
                            title: 'Fact',
                            description: 'Fact',
                            type: 'string',
                            format: 'string',
                          },
                          length: {
                            title: 'Length',
                            description: 'Length',
                            type: 'integer',
                            format: 'int32',
                          },
                        },
                        type: 'object',
                      },
                    },
                  },
                },
                '404': {
                  description: 'Fact not found',
                },
              },
            },
          },
          '/facts': {
            get: {
              tags: ['Facts'],
              summary: 'Get a list of facts',
              description: 'Returns a a list of facts',
              operationId: 'getFacts',
              parameters: [
                {
                  name: 'max_length',
                  in: 'query',
                  description: 'maximum length of returned fact',
                  required: false,
                  schema: {
                    type: 'integer',
                    format: 'int64',
                  },
                },
                {
                  name: 'limit',
                  in: 'query',
                  description: 'limit the amount of results returned',
                  required: false,
                  schema: {
                    type: 'integer',
                    format: 'int64',
                  },
                },
              ],
              responses: {
                '200': {
                  description: 'successful operation',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          title: 'CatFact model',
                          description: 'CatFact',
                          properties: {
                            fact: {
                              title: 'Fact',
                              description: 'Fact',
                              type: 'string',
                              format: 'string',
                            },
                            length: {
                              title: 'Length',
                              description: 'Length',
                              type: 'integer',
                              format: 'int32',
                            },
                          },
                          type: 'object',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        servers: [
          {
            url: 'https://catfact.ninja/',
          },
        ],
        info: {
          title: 'Cat Facts API',
          version: '1.0',
        },
      },
    },
    workflows: [
      {
        workflowId: 'get-breeds-workflow',
        steps: [
          {
            stepId: 'get-breeds-step',
            operationId: 'cats.getBreeds',
            checks: [],
            response: {
              body: {
                current_page: 1,
                data: [
                  {
                    breed: 'Abyssinian',
                    country: 'Ethiopia',
                    origin: 'Natural/Standard',
                    coat: 'Short',
                    pattern: 'Ticked',
                  },
                  {
                    breed: 'Aegean',
                    country: 'Greece',
                    origin: 'Natural/Standard',
                    coat: 'Semi-long',
                    pattern: 'Bi- or tri-colored',
                  },
                ],
                first_page_url: 'https://catfact.ninja/breeds?page=1',
                from: 1,
                last_page: 4,
                last_page_url: 'https://catfact.ninja/breeds?page=4',
                links: [
                  {
                    url: null,
                    label: 'Previous',
                    active: false,
                  },
                  {
                    url: 'https://catfact.ninja/breeds?page=1',
                    label: '1',
                    active: true,
                  },
                ],
                next_page_url: 'https://catfact.ninja/breeds?page=2',
                path: 'https://catfact.ninja/breeds',
                per_page: 25,
                prev_page_url: null,
                to: 25,
                total: 98,
              },
              code: 200,
              headers: {},
              contentType: 'application/json',
            },
            verboseLog: {},
            outputs: {
              'created-item-id': '1',
            },
          },
        ],
      },
    ],
    $workflows: {
      'get-breeds-workflow': {
        steps: {
          'get-breeds-step': {
            request: {
              headers: {},
              path: '/breeds',
              url: 'https://catfact.ninja/',
              method: 'get',
              queryParams: {},
              pathParams: {},
              headerParams: {},
            },
          },
        },
      },
    },
    $steps: {
      'get-breeds-step': {
        request: {
          headers: {},
          path: '/breeds',
          url: 'https://catfact.ninja/',
          method: 'get',
          queryParams: {},
          pathParams: {},
          headerParams: {},
        },
        outputs: {
          'created-item-id': '1',
        },
      },
    },
    options: {
      workflowPath: 'simple.yaml',
      metadata: {
        _: [],
        files: ['simple.yaml'],
        $0: 'respect',
        file: 'simple.yaml',
      },
      maxSteps: 2000,
      maxFetchTimeout: 40_000,
      executionTimeout: 3_600_000,
      fetch,
    },
    'x-serverUrl': 'https://catfact.ninja/',
    info: {
      title: 'Cat Facts API',
      version: '1.0',
    },
    arazzo: '1.0.1',
    severity: DEFAULT_SEVERITY_CONFIGURATION,
    sourceDescriptions: [
      {
        name: 'cats',
        type: 'openapi',
        url: 'api-samples/cats.yaml',
      },
    ],
    $outputs: {},
  } as unknown as TestContext;

  it('should call API and return checks result', async () => {
    const serverUrl = 'https://catfact.ninja/';
    const workflowId = 'get-breeds-workflow';
    const step = ctx.workflows[0].steps[0];

    const mockResponse = {
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 1 }),
      text: vi.fn().mockResolvedValue(JSON.stringify({ id: 1 })),
      headers: new Headers(),
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await callAPIAndAnalyzeResults({
      ctx,
      workflowId,
      step,
      requestData: {
        serverUrl: { url: serverUrl },
        path: '/breeds',
        method: 'get',
        parameters: [],
        requestBody: {},
        openapiOperation: undefined,
      },
    });
    expect(result).toEqual({
      schemaCheck: true,
      networkCheck: true,
      successCriteriaCheck: true,
    });
  });
});
