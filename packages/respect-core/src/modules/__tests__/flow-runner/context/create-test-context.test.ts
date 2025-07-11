import { createConfig, logger } from '@redocly/openapi-core';
import type { TestDescription, AppOptions, TestContext, Step } from '../../../../types.js';

import { ApiFetcher } from '../../../../utils/api-fetcher.js';
import {
  createTestContext,
  DEFAULT_SEVERITY_CONFIGURATION,
  collectSecretFields,
} from '../../../../modules/flow-runner/index.js';

describe('createTestContext', () => {
  it('should create context', async () => {
    const testDescription = {
      arazzo: '1.0.1',
      info: { title: 'API', version: '1.0' },
      sourceDescriptions: [
        { name: 'cats', type: 'openapi', url: '../../__tests__/respect/cat-fact-api/cats.yaml' },
        { name: 'catsTwo', type: 'openapi', url: '../../__tests__/respect/cat-fact-api/cats.yaml' },
        {
          name: 'externalWorkflow',
          type: 'arazzo',
          url: '../../__tests__/respect/cat-fact-api/auto-cat.arazzo.yaml',
        },
      ],
      workflows: [
        {
          workflowId: 'test',
          inputs: {
            type: 'object',
            properties: {
              env: {
                type: 'object',
                properties: {
                  AUTH_TOKEN: { type: 'string' },
                },
              },
            },
          },
          steps: [
            {
              stepId: 'test',
              operationId: 'getCat',
              successCriteria: [{ condition: '$statusCode == 200' }],
            },
          ],
        },
      ],
    } as unknown as TestDescription;

    const options = {
      workflowPath: 'modules/description-parser/test.test.yaml',
      workflow: undefined,
      metadata: {},
      verbose: false,
      maxSteps: 2000,
      maxFetchTimeout: 40_000,
      executionTimeout: 3_600_000,
      config: await createConfig({}),
      requestFileLoader: {
        getFileBody: async (filePath: string) => {
          return new Blob([filePath]);
        },
      },
      envVariables: {
        AUTH_TOKEN: '1234567890',
      },
      logger,
      fetch,
    } as AppOptions;

    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);

    expect(context).toMatchObject({
      $components: {},
      $faker: expect.any(Object),
      executedSteps: [],
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
                    schema: { type: 'integer', format: 'int64' },
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
                    schema: { type: 'integer', format: 'int64' },
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    description: 'limit the amount of results returned',
                    required: false,
                    schema: { type: 'integer', format: 'int64' },
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
                    schema: { type: 'integer', format: 'int64' },
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
                  '404': { description: 'Fact not found' },
                },
              },
            },
          },
          servers: [
            {
              url: 'https://catfact.ninja/',
            },
          ],
          info: { title: 'Cat Facts API', version: '1.0' },
        },
        catsTwo: {
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
                    schema: { type: 'integer', format: 'int64' },
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
                    schema: { type: 'integer', format: 'int64' },
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    description: 'limit the amount of results returned',
                    required: false,
                    schema: { type: 'integer', format: 'int64' },
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
                    schema: { type: 'integer', format: 'int64' },
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
                  '404': { description: 'Fact not found' },
                },
              },
            },
          },
          servers: [
            {
              url: 'https://catfact.ninja/',
            },
          ],
          info: { title: 'Cat Facts API', version: '1.0' },
        },
        externalWorkflow: {
          info: {
            title: 'Cat Facts API',
            version: '1.0',
          },
          sourceDescriptions: [
            {
              name: 'cats',
              type: 'openapi',
              url: 'cats.yaml',
            },
          ],
          workflows: [
            {
              steps: [
                {
                  operationId: '$sourceDescriptions.cats.getBreeds',
                  stepId: 'get-breeds-step',
                },
              ],
              workflowId: 'get-breeds-workflow',
            },
            {
              steps: [
                {
                  operationId: '$sourceDescriptions.cats.getRandomFact',
                  stepId: 'get-fact-step',
                },
              ],
              workflowId: 'get-fact-workflow',
            },
            {
              steps: [
                {
                  operationId: '$sourceDescriptions.cats.getFacts',
                  stepId: 'get-facts-step',
                },
              ],
              workflowId: 'get-facts-workflow',
            },
          ],
          arazzo: '1.0.1',
        },
      },
      workflows: [
        {
          workflowId: 'test',
          inputs: {
            type: 'object',
            properties: {
              env: {
                type: 'object',
                properties: {
                  AUTH_TOKEN: { type: 'string' },
                },
              },
            },
          },
          steps: [
            {
              stepId: 'test',
              operationId: 'getCat',
              successCriteria: [{ condition: '$statusCode == 200' }],
              checks: [],
            },
          ],
        },
      ],
      $steps: {},
      $outputs: {},
      $workflows: {
        test: {
          inputs: {
            env: {
              AUTH_TOKEN: '1234567890',
            },
          },
          outputs: undefined,
          steps: {
            test: {},
          },
        },
      },
      $inputs: {
        env: {},
      },
      options: {
        workflowPath: 'modules/description-parser/test.test.yaml',
        workflow: undefined,
        metadata: {},
        verbose: false,
      },
      info: { title: 'API', version: '1.0' },
      arazzo: '1.0.1',
      secretFields: {},
      severity: DEFAULT_SEVERITY_CONFIGURATION,
      sourceDescriptions: [
        { name: 'cats', type: 'openapi', url: '../../__tests__/respect/cat-fact-api/cats.yaml' },
        { name: 'catsTwo', type: 'openapi', url: '../../__tests__/respect/cat-fact-api/cats.yaml' },
        {
          name: 'externalWorkflow',
          type: 'arazzo',
          url: '../../__tests__/respect/cat-fact-api/auto-cat.arazzo.yaml',
        },
      ],
      apiClient: expect.any(ApiFetcher),
    });
  });

  it('should clean environment variables', async () => {
    const testDescription: TestDescription = {
      arazzo: '1.0.1',
      info: { title: 'API', version: '1.0' },
      workflows: [
        {
          workflowId: 'test',
          steps: [{ stepId: 'test', operationId: 'getCat' } as unknown as Step],
        },
      ],
    };

    const options: AppOptions = {
      workflowPath: 'test.test.yaml',
      workflow: undefined,
      metadata: {},
      verbose: false,
      maxSteps: 2000,
      maxFetchTimeout: 40_000,
      executionTimeout: 3_600_000,
      config: await createConfig({}),
      requestFileLoader: {
        getFileBody: async (filePath: string) => {
          return new Blob([filePath]);
        },
      },
      envVariables: {
        TEST_VAR: 'test value',
        ANOTHER_VAR: 'another value',
      },
      logger,
      fetch,
    };

    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);

    expect(context.$workflows.test.inputs).toEqual(undefined);
  }, 8000);

  it('should handle workflows with inputs and env variables', async () => {
    const testDescription: TestDescription = {
      arazzo: '1.0.1',
      info: { title: 'API', version: '1.0' },
      workflows: [
        {
          workflowId: 'test',
          inputs: {
            type: 'object',
            properties: {
              testInput: { type: 'string' },
            },
          },
          steps: [
            {
              stepId: 'test',
              operationId: 'getCat',
            } as unknown as Step,
          ],
        },
      ],
    };

    const options: AppOptions = {
      workflowPath: 'test.test.yaml',
      input: JSON.stringify({ testInput: 'testValue' }),
      workflow: undefined,
      skip: undefined,
      metadata: {},
      verbose: false,
      maxSteps: 2000,
      maxFetchTimeout: 40_000,
      executionTimeout: 3_600_000,
      config: await createConfig({}),
      requestFileLoader: {
        getFileBody: async (filePath: string) => {
          return new Blob([filePath]);
        },
      },
      envVariables: {},
      logger: logger,
      fetch,
    };

    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);

    expect(context.$workflows).toMatchObject({
      test: {
        inputs: {
          testInput: 'testValue',
        },
        outputs: undefined,
        steps: {
          test: expect.any(Object),
        },
      },
    });
  });

  it('should handle multiple workflows and set public workflows correctly', async () => {
    const testDescription = {
      arazzo: '1.0.1',
      info: { title: 'API', version: '1.0' },
      workflows: [
        {
          workflowId: 'workflow1',
          inputs: {
            type: 'object',
            properties: {
              input1: { type: 'string' },
            },
          },
          outputs: {
            output1: { type: 'string' },
          },
          steps: [
            {
              stepId: 'step1',
              operationId: 'operation1',
            },
          ],
        },
        {
          workflowId: 'workflow2',
          steps: [
            {
              stepId: 'step2',
              operationId: 'operation2',
            },
          ],
        },
      ],
    } as unknown as TestDescription;

    const options = {
      workflowPath: 'test.test.yaml',
      input: JSON.stringify({ input1: 'value1' }),
    } as unknown as AppOptions;

    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);

    expect(context.$workflows).toEqual({
      workflow1: {
        inputs: {
          input1: 'value1',
        },
        outputs: {
          output1: { type: 'string' },
        },
        steps: {
          step1: {},
        },
      },
      workflow2: {
        inputs: undefined,
        outputs: undefined,
        steps: {
          step2: {},
        },
      },
    });
  });

  it('should handle workflows without inputs', async () => {
    const testDescription = {
      arazzo: '1.0.1',
      info: { title: 'API', version: '1.0' },
      workflows: [
        {
          workflowId: 'workflow1',
          steps: [{ stepId: 'step1', operationId: 'operation1' }],
        },
      ],
    } as unknown as TestDescription;

    const options = {
      workflowPath: 'test.test.yaml',
    } as unknown as AppOptions;

    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);

    expect(context.$workflows.workflow1.inputs).toEqual(undefined);
  });

  it('should handle env variables', async () => {
    const testDescription = {
      arazzo: '1.0.1',
      info: { title: 'API', version: '1.0' },
      workflows: [
        {
          workflowId: 'workflow1',
          inputs: {
            type: 'object',
            properties: {
              env: {
                type: 'object',
                properties: {
                  ENV_VAR: { type: 'string' },
                },
              },
            },
          },
          steps: [{ stepId: 'step1', operationId: 'operation1' }],
        },
      ],
    } as unknown as TestDescription;

    const options = {
      workflowPath: 'test.test.yaml',
      envVariables: {
        ENV_VAR: 'value',
      },
    } as unknown as AppOptions;

    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);

    expect(context.$workflows.workflow1?.inputs?.env?.ENV_VAR).toBe('value');
  });
});

describe('storeSecretFields', () => {
  it('should store secret fields with inputs', () => {
    const ctx = {
      secretFields: new Set<string>(),
    } as unknown as TestContext;

    const schema = {
      type: 'object',
      properties: {
        password: { type: 'string', format: 'password' },
        nested: {
          type: 'object',
          properties: {
            password: { type: 'string', format: 'password' },
          },
        },
      },
    };

    const inputs = {
      password: 'password',
      nested: {
        password: 'nested-password',
      },
    };

    collectSecretFields(ctx, schema, inputs);

    expect(ctx.secretFields).toEqual(new Set(['password', 'nested-password']));
  });

  it('should store secret env fields', () => {
    const ctx = {
      secretFields: new Set<string>(),
    } as unknown as TestContext;

    const schema = {
      type: 'object',
      properties: {
        env: {
          type: 'object',
          properties: {
            password: { type: 'string', format: 'password' },
            nested: {
              type: 'object',
              properties: {
                password: { type: 'string', format: 'password' },
              },
            },
          },
        },
      },
    };

    const inputs = {
      env: {
        password: 'password',
        nested: {
          password: 'nested-password',
        },
      },
    };

    collectSecretFields(ctx, schema, inputs);

    expect(ctx.secretFields).toEqual(new Set(['password', 'nested-password']));
  });

  it('should not store secret fields if not password format', () => {
    const ctx = {
      secretFields: new Set<string>(),
    } as unknown as TestContext;

    const schema = {
      type: 'object',
      properties: {
        password: { type: 'string' },
        nested: {
          type: 'object',
          properties: {
            password: { type: 'string' },
          },
        },
      },
    };

    const inputs = {
      password: 'password',
      nested: {
        password: 'nested-password',
      },
    };

    collectSecretFields(ctx, schema, inputs);

    expect(ctx.secretFields).toEqual(new Set());
  });

  it('should store secret field with format password in object', () => {
    const ctx = {
      secretFields: new Set<string>(),
    } as unknown as TestContext;

    const schema = {
      type: 'string',
      format: 'password',
    };

    const inputs = {
      tocken: 'secret-token',
    };

    collectSecretFields(ctx, schema, inputs, ['tocken']);

    expect(ctx.secretFields).toEqual(new Set(['secret-token']));
  });
});
