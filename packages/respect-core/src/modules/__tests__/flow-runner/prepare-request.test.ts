import type { TestContext, Step } from '../../../types.js';

import { prepareRequest } from '../../flow-runner/index.js';
import { ApiFetcher } from '../../../utils/api-fetcher.js';

describe('prepareRequest', () => {
  const apiClient = new ApiFetcher({});
  const ctx = {
    $env: {
      REDOCLY_DOMAIN: 'redocly.com',
    },
    $faker: {
      address: {},
      date: {},
      number: {},
      string: {},
    },
    $sourceDescriptions: {
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
    },
    'x-serverUrl': '',
    info: {
      title: 'Cat Facts API',
      version: '1.0',
    },
    arazzo: '1.0.1',
    sourceDescriptions: [
      {
        name: 'cats',
        type: 'openapi',
        url: 'api-samples/cats.yaml',
      },
    ],
    $outputs: {},
    apiClient,
  } as unknown as TestContext;
  const workflowName = 'get-breeds-workflow';
  const step = ctx.workflows[0].steps[0];

  it('should set apiClient step params', async () => {
    const { path, method, parameters, requestBody, openapiOperation, serverUrl } =
      await prepareRequest(ctx, step, workflowName);

    expect(path).toEqual('/breeds');
    expect(method).toEqual('get');
    expect(parameters).toEqual([
      {
        value: 'application/json',
        in: 'header',
        name: 'accept',
      },
    ]);
    expect(openapiOperation).toEqual({
      description: 'Returns a a list of breeds',
      descriptionName: 'cats',
      method: 'get',
      operationId: 'getBreeds',
      parameters: [
        {
          description: 'limit the amount of results returned',
          in: 'query',
          name: 'limit',
          required: false,
          schema: {
            format: 'int64',
            type: 'integer',
          },
        },
      ],
      path: '/breeds',
      pathParameters: [
        {
          description: 'limit the amount of results returned',
          in: 'query',
          name: 'limit',
          required: false,
          schema: {
            format: 'int64',
            type: 'integer',
          },
        },
      ],
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: {
                items: {
                  description: 'Breed',
                  properties: {
                    breed: {
                      description: 'Breed',
                      format: 'string',
                      title: 'Breed',
                      type: 'string',
                    },
                    coat: {
                      description: 'Coat',
                      format: 'string',
                      title: 'Coat',
                      type: 'string',
                    },
                    country: {
                      description: 'Country',
                      format: 'string',
                      title: 'Country',
                      type: 'string',
                    },
                    origin: {
                      description: 'Origin',
                      format: 'string',
                      title: 'Origin',
                      type: 'string',
                    },
                    pattern: {
                      description: 'Pattern',
                      format: 'string',
                      title: 'Pattern',
                      type: 'string',
                    },
                  },
                  title: 'Breed model',
                  type: 'object',
                },
                type: 'array',
              },
            },
          },
          description: 'successful operation',
        },
      },
      servers: [{ url: 'https://catfact.ninja/' }],
      summary: 'Get a list of breeds',
      tags: ['Breeds'],
    });
    expect(serverUrl).toEqual({ url: 'https://catfact.ninja/', parameters: [] });
    expect(requestBody).toEqual(undefined);
  });

  it('should set apiClient step params when descriptionOperation not provided', async () => {
    const step = {
      stepId: 'get-breeds-step',
      'x-operation': {
        url: 'http://localhost:3000/breeds',
        method: 'get',
      },
      response: {},
      checks: [],
    } as unknown as Step;

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
      $descriptions: {},
      workflows: [
        {
          workflowId: 'get-breeds-workflow',
          steps: [
            {
              stepId: 'get-breeds-step',
              'x-operation': {
                url: 'http://localhost:3000/breeds',
                method: 'get',
              },
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
      },
      'x-serverUrl': 'https://catfact.ninja/',
      info: {
        title: 'Cat Facts API',
        version: '1.0',
      },
      arazzo: '1.0.1',
      sourceDescriptions: [
        {
          name: 'cats',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
      ],
      $outputs: {},
    } as unknown as TestContext;

    const { path, method, openapiOperation } = await prepareRequest(ctx, step, workflowName);

    expect(path).toEqual('');
    expect(method).toEqual('get');
    expect(openapiOperation).toEqual(undefined);
  });

  it('should set $steps and steps in $workflows items to ctx', async () => {
    const step = {
      stepId: 'get-breeds-step',
      'x-operation': {
        url: 'http://localhost:3000/breeds',
        method: 'get',
      },
      response: {},
      checks: [],
    } as unknown as Step;

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
      $descriptions: {},
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
            },
          ],
        },
      ],
      $workflows: {
        'get-breeds-workflow': {
          steps: {
            'get-breeds-step': {
              request: {},
              response: {},
              outputs: {},
            },
          },
        },
      },
      $steps: {},
      options: {
        workflowPath: 'simple.yaml',
        metadata: {
          _: [],
          files: ['simple.yaml'],
          $0: 'respect',
          file: 'simple.yaml',
        },
      },
      info: {
        title: 'Cat Facts API',
        version: '1.0',
      },
      arazzo: '1.0.1',
      sourceDescriptions: [
        {
          name: 'cats',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
      ],
      $outputs: {},
    } as unknown as TestContext;

    const { path, method, openapiOperation } = await prepareRequest(ctx, step, workflowName);

    expect(path).toEqual('');
    expect(method).toEqual('get');
    expect(openapiOperation).toEqual(undefined);
  });

  it('should throw an error when serverUrl not defined', async () => {
    const step = {
      stepId: 'get-breeds-step',
      operationId: 'cats.getBreeds',
      response: {},
      checks: [],
    } as unknown as Step;

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
          },
          servers: [],
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
            },
          ],
        },
      ],
      $workflows: {
        'get-breeds-workflow': {
          steps: {
            'get-breeds-step': {
              request: {},
              response: {},
              outputs: {},
            },
          },
        },
      },
      $steps: {},
      options: {
        workflowPath: 'simple.yaml',
        metadata: {
          _: [],
          files: ['simple.yaml'],
          $0: 'respect',
          file: 'simple.yaml',
        },
      },
      'x-serverUrl': '',
      info: {
        title: 'Cat Facts API',
        version: '1.0',
      },
      arazzo: '1.0.1',
      sourceDescriptions: [
        {
          name: 'cats',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
        {
          name: 'dogs',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
      ],
      $sourceDescriptions: {
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
          },
          servers: [],
          info: {
            title: 'Cat Facts API',
            version: '1.0',
          },
        },
      },
      $outputs: {},
    } as unknown as TestContext;

    await expect(prepareRequest(ctx, step, workflowName)).rejects.toThrow(
      'No servers found in API description'
    );
  });

  it('should through an error when method missing', async () => {
    const step = {
      stepId: 'get-breeds-step',
      'x-operation': {
        url: 'https://catfact.ninja/breeds',
        method: '',
      },
      response: {},
      checks: [],
    } as unknown as Step;

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
      $descriptions: {},
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
            },
          ],
        },
      ],
      $workflows: {
        'get-breeds-workflow': {
          steps: {},
        },
      },
      $steps: {},
      options: {
        workflowPath: 'simple.yaml',
        metadata: {
          _: [],
          files: ['simple.yaml'],
          $0: 'respect',
          file: 'simple.yaml',
        },
      },
      'x-serverUrl': '',
      info: {
        title: 'Cat Facts API',
        version: '1.0',
      },
      arazzo: '1.0.1',
      sourceDescriptions: [
        {
          name: 'cats',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
        {
          name: 'cats-legacy',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
      ],
      $outputs: {},
    } as unknown as TestContext;

    try {
      await prepareRequest(ctx, step, workflowName);
    } catch (e) {
      expect(e.message).toEqual('"method" is required to make a request');
    }
  });

  it('should merge workflow and step level params with reference property without duplicates prefer step params', async () => {
    const localCtx = {
      ...ctx,
      ...{
        workflows: [
          {
            workflowId: 'get-breeds-workflow',
            parameters: [
              {
                reference: '$components.parameters.page',
                value: 100,
              },
            ],
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
              },
            ],
          },
        ],
        $workflows: {
          'get-breeds-workflow': {
            parameters: [
              {
                reference: '$components.parameters.page',
                value: 100,
              },
            ],
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
        $components: {
          parameters: {
            page: {
              name: 'page',
              in: 'header',
              value: 1,
            },
            pageSize: {
              name: 'pageSize',
              in: 'header',
              value: 100,
            },
          },
        },
      },
    } as unknown as TestContext;

    const step = {
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
      parameters: [
        {
          reference: '$components.parameters.page',
        },
      ],
    } as unknown as Step;

    const { path, method, parameters } = await prepareRequest(localCtx, step, workflowName);

    expect(path).toEqual('/breeds');
    expect(method).toEqual('get');
    expect(parameters).toEqual([
      {
        value: 'application/json',
        in: 'header',
        name: 'accept',
      },
      {
        value: 1,
        in: 'header',
        name: 'page',
      },
    ]);
  });

  it('should merge workflow and step level unique reference params', async () => {
    const localCtx = {
      ...ctx,
      ...{
        workflows: [
          {
            workflowId: 'get-breeds-workflow',
            parameters: [
              {
                name: 'pageSize',
                in: 'header',
                value: 100,
              },
            ],
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
              },
            ],
          },
        ],
        $workflows: {
          'get-breeds-workflow': {
            parameters: [
              {
                name: 'pageSize',
                in: 'header',
                value: 100,
              },
            ],
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
        $components: {
          parameters: {
            page: {
              name: 'page',
              in: 'header',
              value: 1,
            },
            pageSize: {
              name: 'pageSize',
              in: 'header',
              value: 100,
            },
          },
        },
      },
    } as unknown as TestContext;

    const step = {
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
      parameters: [
        {
          reference: '$components.parameters.page',
        },
      ],
    } as unknown as Step;

    const { path, method, parameters } = await prepareRequest(localCtx, step, workflowName);

    expect(path).toEqual('/breeds');
    expect(method).toEqual('get');
    expect(parameters).toEqual([
      {
        value: 'application/json',
        in: 'header',
        name: 'accept',
      },
      {
        value: 100,
        in: 'header',
        name: 'pageSize',
      },
      {
        value: 1,
        in: 'header',
        name: 'page',
      },
    ]);
  });

  it('should merge cookie parameters from workflow and step', async () => {
    const localCtx = {
      ...ctx,
      ...{
        workflows: [
          {
            workflowId: 'get-breeds-workflow',
            parameters: [
              {
                name: 'pageSize',
                in: 'header',
                value: 100,
              },
              {
                name: 'cookie',
                in: 'header',
                value: 'sessionId=32;userId=32;workflow-cookie=32',
              },
              {
                name: 'token-from-workflow',
                in: 'cookie',
                value: '32',
              },
            ],
            steps: [
              {
                stepId: 'get-breeds-step',
                operationId: 'cats.getBreeds',
                parameters: [
                  {
                    name: 'step-header',
                    in: 'header',
                    value: 'step-header-value',
                  },
                  {
                    name: 'token-from-step',
                    in: 'cookie',
                    value: '42',
                  },
                  {
                    name: 'cookie',
                    in: 'header',
                    value: 'sessionId=42;stepСookie=42',
                  },
                ],
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
              },
            ],
          },
        ],
        $workflows: {
          'get-breeds-workflow': {
            parameters: [
              {
                name: 'pageSize',
                in: 'header',
                value: 100,
              },
            ],
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
        $components: {
          parameters: {
            page: {
              name: 'page',
              in: 'header',
              value: 1,
            },
            pageSize: {
              name: 'pageSize',
              in: 'header',
              value: 100,
            },
          },
        },
      },
    } as unknown as TestContext;

    const step = {
      stepId: 'get-breeds-step',
      operationId: 'cats.getBreeds',
      checks: [],
    } as unknown as Step;

    const { parameters } = await prepareRequest(localCtx, step, workflowName);

    expect(parameters).toEqual([
      {
        value: 'application/json',
        in: 'header',
        name: 'accept',
      },
      {
        value: 100,
        in: 'header',
        name: 'pageSize',
      },
      {
        value: '32',
        in: 'cookie',
        name: 'sessionId',
      },
      {
        value: '32',
        in: 'cookie',
        name: 'userId',
      },
      {
        value: '32',
        in: 'cookie',
        name: 'workflow-cookie',
      },
      {
        value: '32',
        in: 'cookie',
        name: 'token-from-workflow',
      },
    ]);
  });
});
