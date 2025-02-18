import { type AppOptions, type TestDescription } from '../../../../types';
import { createRuntimeExpressionCtx, createTestContext } from '../../../flow-runner/context';
import { ApiFetcher } from '../../../../utils/api-fetcher';

const testDescription = {
  arazzo: '1.0.1',
  info: { title: 'API', version: '1.0' },
  sourceDescriptions: [
    { name: 'cats', type: 'openapi', url: '__tests__/respect/cat-fact-api/cats.yaml' },
    { name: 'catsTwo', type: 'openapi', url: '__tests__/respect/cat-fact-api/cats.yaml' },
    {
      name: 'externalWorkflow',
      type: 'arazzo',
      url: '__tests__/respect/cat-fact-api/auto-cat.yaml',
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
  workflowPath: 'test.test.yaml',
  workflow: undefined,
  harLogsFile: 'har-output',
  metadata: {},
  verbose: false,
} as AppOptions;

process.env.AUTH_TOKEN = '1234567890';

// Unmock @redocly/openapi-core
jest.unmock('@redocly/openapi-core');

describe('createRuntimeExpressionCtx', () => {
  it('should create limited runtime expression context when workflowId and step provided', async () => {
    const apiClient = new ApiFetcher({
      harLogs: undefined,
    });
    const context = await createTestContext(testDescription, options, apiClient);
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: context,
      workflowId: 'test',
      step: {
        stepId: 'test',
        requestBody: {
          header: {
            accept: 'application/json',
          },
          method: 'get',
          url: 'https://api.thecatapi.com/v1/images/search',
        },
      },
    });

    expect(runtimeExpressionContext).toMatchSnapshot();
    expect(context.workflows).toBeDefined();
    expect(runtimeExpressionContext.workflows).toBeUndefined();
  });

  it('should create limited runtime expression context when workflowId is not provided', async () => {
    const apiClient = new ApiFetcher({
      harLogs: undefined,
    });
    const context = await createTestContext(testDescription, options, apiClient);
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: context,
      step: {
        stepId: 'test',
      },
    });

    expect(runtimeExpressionContext).toMatchSnapshot();
    expect(context.workflows).toBeDefined();
    expect(runtimeExpressionContext.workflows).toBeUndefined();
  });
  it('should create limited runtime expression context when step is not provided', async () => {
    const apiClient = new ApiFetcher({
      harLogs: undefined,
    });
    const context = await createTestContext(testDescription, options, apiClient);
    const runtimeExpressionContext = createRuntimeExpressionCtx({
      ctx: context,
      workflowId: 'test',
    });

    expect(runtimeExpressionContext).toMatchSnapshot();
    expect(context.workflows).toBeDefined();
    expect(runtimeExpressionContext.workflows).toBeUndefined();
  });
});
