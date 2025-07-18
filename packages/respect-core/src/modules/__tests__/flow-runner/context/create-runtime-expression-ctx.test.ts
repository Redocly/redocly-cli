import { createConfig, logger } from '@redocly/openapi-core';
import { type Step, type AppOptions, type TestDescription } from '../../../../types.js';
import {
  createRuntimeExpressionCtx,
  createTestContext,
} from '../../../flow-runner/context/index.js';
import { ApiFetcher } from '../../../../utils/api-fetcher.js';

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

const options: AppOptions = {
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
};

describe('createRuntimeExpressionCtx', () => {
  it('should create limited runtime expression context when workflowId and step provided', async () => {
    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: context,
      workflowId: 'test',
      step: {
        stepId: 'test',
        'x-operation': {
          method: 'get',
          url: 'https://api.thecatapi.com/v1/images/search',
        },
        requestData: {
          headers: {
            accept: 'application/json',
          },
          method: 'get',
          url: 'https://api.thecatapi.com/v1/images/search',
        },
      } as unknown as Step,
    });

    expect(runtimeExpressionContext).toMatchSnapshot();
    expect(context.workflows).toBeDefined();
    expect((runtimeExpressionContext as any).workflows).toBeUndefined();
  });

  it('should create limited runtime expression context when workflowId is not provided', async () => {
    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: context,
      step: {
        stepId: 'test',
        workflowId: 'test',
      } as unknown as Step,
    });

    expect(runtimeExpressionContext).toMatchSnapshot();
    expect(context.workflows).toBeDefined();
    expect((runtimeExpressionContext as any).workflows).toBeUndefined();
  });
  it('should create limited runtime expression context when step is not provided', async () => {
    const apiClient = new ApiFetcher({});
    const context = await createTestContext(testDescription, options, apiClient);
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: context,
      workflowId: 'test',
    });

    expect(runtimeExpressionContext).toMatchSnapshot();
    expect(context.workflows).toBeDefined();
    expect((runtimeExpressionContext as any).workflows).toBeUndefined();
  });
});
