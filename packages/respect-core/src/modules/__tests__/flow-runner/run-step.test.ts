import type {
  Step,
  TestContext,
  ResponseContext,
  Check,
  WorkflowExecutionResult,
} from '../../../types.js';
import { createConfig, logger } from '@redocly/openapi-core';
import {
  runStep,
  callAPIAndAnalyzeResults,
  checkCriteria,
  runWorkflow,
  resolveWorkflowContext,
  DEFAULT_SEVERITY_CONFIGURATION,
  CHECKS,
} from '../../flow-runner/index.js';
import { createHarLog } from '../../../utils/har-logs/index.js';
import { ApiFetcher } from '../../../utils/api-fetcher.js';
import { displayChecks } from '../../cli-output/index.js';
import { cleanColors } from '../../../utils/clean-colors.js';
import { Timer } from '../../timeout-timer/timer.js';

vi.mock('../../flow-runner/call-api-and-analyze-results.js', () => ({
  callAPIAndAnalyzeResults: vi.fn(),
}));

vi.mock('../../cli-output/index.js', async () => {
  const actual = await vi.importActual('../../cli-output/index.js');

  return {
    ...actual,
    displayChecks: vi.fn(),
  };
});

vi.mock('../../flow-runner/success-criteria/index.js', () => ({
  checkCriteria: vi.fn(),
}));

vi.mock('../../flow-runner/runner.js', () => ({
  runWorkflow: vi.fn(),
  resolveWorkflowContext: vi.fn(),
}));

vi.mock('../../timeout-timer/timer.js', async () => {
  const actual = await vi.importActual('../../timeout-timer/timer.js');
  return {
    ...actual,
  };
});

const harLogs = createHarLog({ version: '1.0.0' });
const apiClient = new ApiFetcher({
  harLogs,
});
const basicCTX = {
  apiClient,
  $request: undefined,
  $response: undefined,
  $env: {},
  $faker: {
    address: {},
    date: {},
    number: {},
    string: {},
  },
  executedSteps: [],
  severity: DEFAULT_SEVERITY_CONFIGURATION,
  $sourceDescriptions: {
    'reusable-api': {
      arazzo: '1.0.1',
      info: {
        title: 'Reusable API',
        version: '1.0',
      },
      sourceDescriptions: [
        {
          name: 'cats',
          type: 'openapi',
          url: 'api-samples/cats.yaml',
        },
      ],
      workflows: [
        {
          workflowId: 'reusable-get-bird-workflow',
          parameters: [
            {
              in: 'cookie',
              name: 'workflowLevelParam',
              value: 'workflowcookie',
            },
            {
              in: 'header',
              name: 'IMF-KEY',
              value: 'test-key',
            },
          ],
          steps: [
            {
              stepId: 'reusable-first-step-one',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [
                {
                  condition: '$statusCode == 204',
                },
              ],
            },
            {
              stepId: 'reusable-delete-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [
                {
                  condition: '$statusCode == 204',
                },
              ],
            },
          ],
        },
        {
          workflowId: 'reusable-get-bird-workflow-2',
          parameters: [
            {
              in: 'cookie',
              name: 'workflowLevelParam',
              value: 'workflowcookie',
            },
            {
              in: 'header',
              name: 'IMF-KEY',
              value: 'test-key',
            },
          ],
          steps: [
            {
              stepId: 'reusable-first-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [
                {
                  condition: '$statusCode == 204',
                },
              ],
            },
            {
              stepId: 'reusable-delete-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [
                {
                  condition: '$statusCode == 204',
                },
              ],
            },
          ],
          outputs: {
            wowStatusCode: '$steps.reusable-delete-step.response.statusCode',
          },
        },
        {
          workflowId: 'second-workflow',
          parameters: [
            {
              in: 'header',
              name: 'IMF-KEY',
              value: 'test-key',
            },
          ],
          dependsOn: ['reusable-get-bird-workflow', 'reusable-get-bird-workflow-2'],
          steps: [
            {
              stepId: 'delete-small-mock',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [
                {
                  condition: '$statusCode == 204',
                },
              ],
              onSuccess: [
                {
                  name: 'testRetry',
                  type: 'goto',
                  workflowId: 'reusable-get-bird-workflow',
                },
              ],
            },
          ],
        },
      ],
    },
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
    'no-serverUrl-api': {
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
      servers: [],
      info: {
        title: 'Cat Facts API',
        version: '1.0',
      },
    },
  },
  sourceDescriptions: [
    { name: 'cats', type: 'openapi', url: 'api-samples/cats.yaml' },
    { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
    { name: 'no-serverUrl-api', type: 'arazzo', url: 'no-serverUrl-api.yml' },
  ],
  workflows: [
    {
      workflowId: 'get-bird-workflow',
      steps: [
        {
          stepId: 'get-bird',
          'x-operation': { url: 'http://localhost:3000/bird', method: 'get' },
          successCriteria: [{ condition: '$statusCode == 200' }],
          checks: [],
        },
      ],
    },
  ],
  $workflows: {
    'get-bird-workflow': {
      steps: {
        'get-bird': {},
      },
    },
  },
  $steps: {},
  harLogs: {},
  options: {
    workflowPath: 'runStepTest.yml',
    workflow: undefined,
    skip: undefined,
    verbose: true,
    harLogsFile: 'har-output',
    metadata: {
      _: [],
      files: ['runStepTest.yml'],
      $0: 'respect',
      file: 'runStepTest.yml',
    },
    input: undefined,
    logger: logger,
  },
  info: { title: 'Test API', version: '1.0' },
  arazzo: '1.0.1',
  $outputs: {},
} as unknown as TestContext;

describe('runStep', () => {
  it('should run step and display checks', async () => {
    const step: Step = {
      stepId: 'get-bird',
      'x-operation': { url: 'http://localhost:3000/bird', method: 'get' },
      successCriteria: [{ condition: '$statusCode == 200' }],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    await runStep({
      step,
      ctx: basicCTX,
      workflowId,
    });

    expect(displayChecks).toMatchSnapshot();
  });

  it('should run step and return failed result when workflowId is missing', async () => {
    const step: Step = {
      stepId: 'get-bird',
      'x-operation': { url: 'http://localhost:3000/bird', method: 'get' },
      successCriteria: [{ condition: '$statusCode == 200' }],
      checks: [],
      response: {} as any,
    };
    const workflowId = undefined;

    await runStep({
      step,
      ctx: basicCTX,
      workflowId,
    });

    expect(step.checks).toEqual([
      {
        message: 'Workflow name is required to run a step',
        name: CHECKS.UNEXPECTED_ERROR,
        passed: false,
        severity: 'error',
      },
    ]);
  });

  it('should display checks when failed to make a call to the API', async () => {
    const apiClient = new ApiFetcher({
      harLogs,
    });
    const step: Step = {
      stepId: 'get-bird',
      operationId: 'no-serverUrl-api.getBreeds',
      successCriteria: [{ condition: '$statusCode == 200' }],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });
    await runStep({
      step,
      ctx: basicCTX,
      workflowId,
    });

    expect(step.checks).toEqual([
      {
        message: 'No servers found in API description',
        name: CHECKS.UNEXPECTED_ERROR,
        passed: false,
        severity: 'error',
      },
    ]);
  });

  it('should execute onSuccess step criteria with goto StepId', async () => {
    const apiClient = new ApiFetcher({
      harLogs,
    });
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onSuccess: [
        {
          name: 'success-action',
          stepId: 'success-action-step',
          type: 'goto',
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      apiClient,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onSuccess: [
                  {
                    name: 'success-action',
                    stepId: 'success-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'success-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalled();
  });

  it('should execute onSuccess step criteria with goto StepId provided by reference', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onSuccess: [
        {
          reference: '$components.successActions.success-action',
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onSuccess: [
                  {
                    name: 'success-action',
                    stepId: 'success-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'success-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
        $components: {
          successActions: {
            'success-action': {
              name: 'success-action',
              stepId: 'success-action-step',
              type: 'goto',
              criteria: [
                {
                  condition: '$statusCode == 200',
                },
              ],
            },
          },
        },
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalled();
  });

  it('should execute onSuccess step criteria with goto workflowId', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onSuccess: [
        {
          name: 'success-action',
          workflowId: 'success-action-workflow',
          type: 'goto',
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onSuccess: [
                  {
                    name: 'success-action',
                    stepId: 'success-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'success-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    vi.mocked(runWorkflow).mockImplementationOnce(async () => {
      return {
        type: 'workflow',
        invocationContext: {},
        workflowId,
      } as WorkflowExecutionResult;
    });

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalled();
    expect(runWorkflow).toHaveBeenCalled();
  });

  it('should log error when onSuccess step criteria with goto StepId and WorkflowId provided', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onSuccess: [
        {
          name: 'success-action',
          stepId: 'success-action-step',
          workflowId: 'success-action-workflow',
          type: 'goto',
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
        {
          name: 'MIME-TYPE CHECK',
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onSuccess: [
                  {
                    name: 'success-action',
                    stepId: 'success-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'success-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await expect(
      runStep({
        step: stepOne,
        ctx: context,
        workflowId,
      })
    ).rejects.toThrowError(
      'Cannot use both workflowId: success-action-workflow and stepId: success-action-step in goto action'
    );

    expect(displayChecks).toHaveBeenCalled();
    expect(runWorkflow).not.toHaveBeenCalled();
  });

  it('should execute onFailure step criteria with goto StepId', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          name: 'success-action',
          stepId: 'failure-action-step',
          type: 'goto',
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onFailure: [
                  {
                    name: 'success-action',
                    stepId: 'failure-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalled();
  });

  it('should execute onFailure step criteria with goto StepId provided by reference', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          reference: '$components.failureActions.failure-action',
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onFailure: [
                  {
                    name: 'failure-action',
                    stepId: 'failure-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
        $components: {
          failureActions: {
            'failure-action': {
              name: 'failure-action',
              stepId: 'failure-action-step',
              type: 'goto',
              criteria: [
                {
                  condition: '$statusCode == 200',
                },
              ],
            },
          },
        },
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalled();
  });

  it('should execute onFailure step criteria with retry StepId', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          name: 'success-action',
          stepId: 'failure-action-step',
          type: 'retry',
          retryAfter: 1000,
          retryLimit: 2,
          criteria: [
            {
              condition: '$statusCode == 204',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onFailure: [
                  {
                    name: 'success-action',
                    stepId: 'failure-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalledTimes(3);
  });

  it('should result with an error when onFailure step criteria with retry StepId and WorkflowId provided', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          name: 'success-action',
          stepId: 'failure-action-step',
          workflowId: 'failure-action-workflow',
          type: 'retry',
          retryAfter: 1000,
          retryLimit: 2,
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onFailure: [
                  {
                    name: 'success-action',
                    stepId: 'failure-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    expect(
      async () =>
        await runStep({
          step: stepOne,
          ctx: context,
          workflowId,
        })
    ).rejects.toThrow(
      'Cannot use both workflowId: failure-action-workflow and stepId: failure-action-step in retry action'
    );
  });

  it('should execute onFailure step criteria with retry when StepId with additional criteria check', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          name: 'success-action',
          stepId: 'failure-action-step',
          type: 'retry',
          retryAfter: 1000,
          retryLimit: 2,
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
        {
          name: CHECKS.CONTENT_TYPE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onFailure: [
                  {
                    name: 'success-action',
                    stepId: 'failure-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementationOnce(async () => {
      return { ...context };
    });

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalledTimes(3);
  });

  it('should execute onFailure step criteria with successful retry', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          name: 'success-action',
          stepId: 'failure-action-step',
          type: 'retry',
          retryAfter: 1000,
          retryLimit: 2,
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      if (step.stepId === 'get-bird') {
        step.response = {
          body: {
            bird: '🐦',
            name: 'hawk',
          },
          statusCode: 200,
          headers: new Headers(),
          contentType: 'application/json',
        } as unknown as ResponseContext;
      }

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: true,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: true, schemaCheck: true, networkCheck: true };
    });

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              stepOne,
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalledTimes(2);
  });

  it('should execute onFailure step criteria with failed retry', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      onFailure: [
        {
          name: 'success-action',
          stepId: 'failure-action-step',
          type: 'retry',
          retryAfter: 1000,
          retryLimit: 2,
          criteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    vi.mocked(callAPIAndAnalyzeResults).mockImplementationOnce(async ({ step }: { step: Step }) => {
      step.checks = [
        {
          name: CHECKS.STATUS_CODE_CHECK,
          passed: false,
          message: '',
          severity: 'error',
        },
      ];

      return { successCriteriaCheck: false, schemaCheck: true, networkCheck: true };
    });

    vi.mocked(checkCriteria).mockImplementation(() => [
      {
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        severity: 'error',
      },
    ]);

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                successCriteria: [{ condition: '$statusCode == 200' }],
                onFailure: [
                  {
                    name: 'success-action',
                    stepId: 'failure-action-step',
                    type: 'goto',
                    criteria: [
                      {
                        condition: '$statusCode == 200',
                      },
                    ],
                  },
                ],
                checks: [],
              },
              {
                stepId: 'failure-action-step',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    await runStep({
      step: stepOne,
      ctx: context,
      workflowId,
    });

    expect(displayChecks).toHaveBeenCalled();
    expect(checkCriteria).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when the step in context does not specify a workflowId and the `in` property missing', async () => {
    const stepOne: Step = {
      stepId: 'get-bird',
      'x-operation': {
        url: 'http://localhost:3000/bird',
        method: 'get',
      },
      successCriteria: [
        {
          condition: '$statusCode == 200',
        },
      ],
      parameters: [
        {
          name: 'workflowLevelParam',
          value: 'workflowcookie',
        },
      ],
      checks: [],
      response: {} as any,
    };
    const workflowId = 'get-bird-workflow';

    const context = {
      ...basicCTX,
      ...{
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'get-bird',
                'x-operation': {
                  url: 'http://localhost:3000/bird',
                  method: 'get',
                },
                parameters: [
                  {
                    name: 'workflowLevelParam',
                    value: 'workflowcookie',
                  },
                ],
                successCriteria: [{ condition: '$statusCode == 200' }],
                checks: [],
              },
            ],
          },
        ],
      },
    } as unknown as TestContext;

    await expect(() =>
      runStep({
        step: stepOne,
        ctx: context,
        workflowId,
      })
    ).rejects.toThrow(`Parameter "in" is required for ${stepOne.stepId} step`);
  });

  it('should run step with workflowId and set correct outputs', async () => {
    const step: Step = {
      stepId: 'get-bird',
      workflowId: 'reusable-workflow',
      outputs: {
        stepOutput: '$outputs.reusableWorkflowOutput',
      },
      checks: [],
      response: {} as any,
    };
    const workflowId = 'test-workflow';
    const localCTX = {
      executedSteps: [],
      $request: undefined,
      $response: undefined,
      $env: {},
      $faker: {
        address: {},
        date: {},
        number: {},
        string: {},
      },
      $sourceDescriptions: {
        'reusable-api': {
          arazzo: '1.0.1',
          info: {
            title: 'Reusable API',
            version: '1.0',
          },
          sourceDescriptions: [
            {
              name: 'cats',
              type: 'openapi',
              url: 'api-samples/cats.yaml',
            },
          ],
          workflows: [
            {
              workflowId: 'reusable-get-bird-workflow',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
                {
                  in: 'cookie',
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step-one',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
            },
            {
              workflowId: 'reusable-get-bird-workflow-2',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
                {
                  in: 'cookie',
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
              outputs: {
                wowStatusCode: '$steps.reusable-delete-step.response.statusCode',
              },
            },
            {
              workflowId: 'second-workflow',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              dependsOn: ['reusable-get-bird-workflow', 'reusable-get-bird-workflow-2'],
              steps: [
                {
                  stepId: 'delete-small-mock',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                  onSuccess: [
                    {
                      name: 'testRetry',
                      type: 'goto',
                      workflowId: 'reusable-get-bird-workflow',
                    },
                  ],
                },
              ],
            },
          ],
        },
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
      sourceDescriptions: [
        { name: 'cats', type: 'openapi', url: 'api-samples/cats.yaml' },
        { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
      ],
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'get-bird',
              workflowId: 'reusable-workflow',
              outputs: {
                stepOutput: '$outputs.reusableWorkflowOutput',
              },
              checks: [],
            },
          ],
        },
        {
          workflowId: 'reusable-workflow',
          steps: [
            {
              stepId: 'reusable-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [{ condition: '$statusCode == 204' }],
              checks: [],
            },
          ],
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      ],
      $workflows: {
        'test-workflow': {
          steps: {
            'get-bird': {},
          },
        },
        'reusable-workflow': {
          steps: {
            'reusable-step': {},
          },
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      },
      $steps: {},
      harLogs: {},
      options: {
        workflowPath: 'runStepTest.yml',
        workflow: undefined,
        skip: undefined,
        verbose: undefined,
        harLogsFile: 'har-output',
        metadata: {
          _: [],
          files: ['runStepTest.yml'],
          $0: 'respect',
          file: 'runStepTest.yml',
        },
        input: undefined,
        logger: logger,
      },
      info: { title: 'Test API', version: '1.0' },
      arazzo: '1.0.1',
      $outputs: {
        'reusable-workflow': {
          reusableWorkflowOutput: 'Hello, world!',
        },
      },
      severity: {
        UNEXPECTED_ERROR: 1,
        STATUS_CODE_CHECK: 1,
      },
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockResolvedValueOnce(localCTX);

    await runStep({
      step,
      ctx: localCTX,
      workflowId,
    });

    expect(runWorkflow).toHaveBeenCalled();
    expect(localCTX.$steps['get-bird'].outputs).toEqual({ stepOutput: 'Hello, world!' });
  });

  it('should run step with workflowId from external workflowSpec', async () => {
    const step: Step = {
      stepId: 'get-bird',
      workflowId: '$sourceDescriptions.reusable-api.workflows.reusable-external-workflow',
      checks: [],
      response: {} as any,
    };
    const localCTX = {
      executedSteps: [],
      $request: undefined,
      $response: undefined,
      $env: {},
      $faker: {
        address: {},
        date: {},
        number: {},
        string: {},
      },
      $sourceDescriptions: {
        'reusable-api': {
          arazzo: '1.0.1',
          info: {
            title: 'Reusable API',
            version: '1.0',
          },
          sourceDescriptions: [
            {
              name: 'cats',
              type: 'openapi',
              url: 'api-samples/cats.yaml',
            },
            { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
          ],
          workflows: [
            {
              workflowId: 'reusable-external-workflow',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step-one',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
            },
            {
              workflowId: 'reusable-get-bird-workflow-2',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
                {
                  in: 'cookie',
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
              outputs: {
                wowStatusCode: '$steps.reusable-delete-step.response.statusCode',
              },
            },
            {
              workflowId: 'second-workflow',
              dependsOn: ['reusable-get-bird-workflow', 'reusable-get-bird-workflow-2'],
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              steps: [
                {
                  stepId: 'delete-small-mock',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                  onSuccess: [
                    {
                      name: 'testRetry',
                      type: 'goto',
                      workflowId: 'reusable-get-bird-workflow',
                    },
                  ],
                },
              ],
            },
          ],
        },
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
      sourceDescriptions: [
        { name: 'cats', type: 'openapi', url: 'api-samples/cats.yaml' },
        { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
      ],
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'get-bird',
              workflowId: '$sourceDescriptions.reusable-api.workflows.reusable-external-workflow',
              checks: [],
            },
          ],
        },
        {
          workflowId: 'reusable-external-workflow',
          steps: [
            {
              stepId: 'reusable-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [{ condition: '$statusCode == 204' }],
              checks: [],
            },
          ],
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      ],
      $workflows: {
        'test-workflow': {
          steps: {
            'get-bird': {},
          },
        },
        'reusable-external-workflow': {
          steps: {
            'reusable-step': {},
          },
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      },
      $steps: {},
      harLogs: {},
      options: {
        workflowPath: 'runStepTest.yml',
        workflow: undefined,
        skip: undefined,
        verbose: undefined,
        harLogsFile: 'har-output',
        metadata: {
          _: [],
          files: ['runStepTest.yml'],
          $0: 'respect',
          file: 'runStepTest.yml',
        },
        input: undefined,
        logger: logger,
      },
      info: { title: 'Test API', version: '1.0' },
      arazzo: '1.0.1',
      $outputs: {},
    } as unknown as TestContext;

    await runStep({
      step,
      ctx: localCTX,
      workflowId: 'test-workflow',
    });

    expect(runWorkflow).toHaveBeenCalledTimes(1);
  });

  it('should run step with workflowId from external workflow and populate inputs from the parameters', async () => {
    const step = {
      stepId: 'get-bird',
      workflowId: '$sourceDescriptions.reusable-api.workflows.reusable-external-workflow',
      parameters: [
        {
          name: 'workflowLevelParam',
          value: 'workflowParameterValue',
        },
      ],
      checks: [],
      response: {} as any,
    };
    const config = await createConfig({});
    const localCTX = {
      $request: undefined,
      $response: undefined,
      $env: {},
      $faker: {
        address: {},
        date: {},
        number: {},
        string: {},
      },
      executedSteps: [],
      $sourceDescriptions: {
        'reusable-api': {
          arazzo: '1.0.1',
          info: {
            title: 'Reusable API',
            version: '1.0',
          },
          sourceDescriptions: [
            {
              name: 'cats',
              type: 'openapi',
              url: 'api-samples/cats.yaml',
            },
            { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
          ],
          workflows: [
            {
              workflowId: 'reusable-external-workflow',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              inputs: {
                type: 'object',
                properties: {
                  workflowLevelParam: {
                    type: 'string',
                    description: 'Some input parameter',
                  },
                },
              },
              steps: [
                {
                  stepId: 'reusable-first-step-one',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
            },
            {
              workflowId: 'reusable-get-bird-workflow-2',
              parameters: [
                {
                  in: 'cookie',
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
              outputs: {
                wowStatusCode: '$steps.reusable-delete-step.response.statusCode',
              },
            },
            {
              workflowId: 'second-workflow',
              dependsOn: ['reusable-get-bird-workflow', 'reusable-get-bird-workflow-2'],
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              steps: [
                {
                  stepId: 'delete-small-mock',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                  onSuccess: [
                    {
                      name: 'testRetry',
                      type: 'goto',
                      workflowId: 'reusable-get-bird-workflow',
                    },
                  ],
                },
              ],
            },
          ],
        },
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
      sourceDescriptions: [
        { name: 'cats', type: 'openapi', url: 'api-samples/cats.yaml' },
        { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
      ],
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'get-bird',
              workflowId: '$sourceDescriptions.reusable-api.workflows.reusable-external-workflow',
              parameters: [
                {
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
              ],
              checks: [],
            },
          ],
        },
        {
          workflowId: 'reusable-external-workflow',
          steps: [
            {
              stepId: 'reusable-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [{ condition: '$statusCode == 204' }],
              checks: [],
            },
          ],
          inputs: {
            type: 'object',
            properties: {
              workflowLevelParam: {
                type: 'string',
                description: 'Some input',
              },
            },
          },
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      ],
      $workflows: {
        'test-workflow': {
          steps: {
            'get-bird': {},
          },
          inputs: {},
        },
        'reusable-external-workflow': {
          steps: {
            'reusable-step': {},
          },
          inputs: {
            workflowLevelParam: 'workflowParameterValue',
          },
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      },
      $steps: {},
      harLogs: {},
      options: {
        workflowPath: 'runStepTest.yml',
        workflow: undefined,
        skip: undefined,
        verbose: undefined,
        harLogsFile: 'har-output',
        metadata: {
          _: [],
          files: ['runStepTest.yml'],
          $0: 'respect',
          file: 'runStepTest.yml',
        },
        input: undefined,
        config,
        executionTimeout: 3_600_000,
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        server: undefined,
        severity: undefined,
        logger: logger,
      },
      info: { title: 'Test API', version: '1.0' },
      arazzo: '1.0.1',
      $outputs: {},
      $inputs: {},
    } as unknown as TestContext;

    vi.mocked(resolveWorkflowContext).mockImplementation((): any => {
      return { ...localCTX };
    });

    await runStep({
      step,
      ctx: localCTX,
      workflowId: 'test-workflow',
    });

    expect(resolveWorkflowContext).toHaveBeenCalledWith(
      '$sourceDescriptions.reusable-api.workflows.reusable-external-workflow',
      {
        inputs: {
          properties: {
            workflowLevelParam: {
              description: 'Some input parameter',
              type: 'string',
            },
          },
          type: 'object',
        },
        steps: [
          {
            stepId: 'reusable-first-step-one',
            successCriteria: [{ condition: '$statusCode == 204' }],
            'x-operation': {
              url: 'http://localhost:3000/delete-mock',
              method: 'delete',
            },
          },
          {
            stepId: 'reusable-delete-step',
            successCriteria: [{ condition: '$statusCode == 204' }],
            'x-operation': {
              url: 'http://localhost:3000/delete-mock',
              method: 'delete',
            },
          },
        ],
        workflowId: 'reusable-external-workflow',
        parameters: [
          {
            in: 'header',
            name: 'IMF-KEY',
            value: 'test-key',
          },
        ],
      },
      localCTX,
      config
    );
    expect(runWorkflow).toHaveBeenCalledTimes(1);
  });

  it('should run step with not existing workflowId and populate step.checks with an error', async () => {
    const step: Step = {
      stepId: 'get-bird',
      workflowId: '$sourceDescriptions.wrong-reusable-api.workflows.reusable-external-workflow',
      outputs: {
        stepOutput: '$outputs.reusableWorkflowOutput.stepOutput',
      },
      checks: [],
      response: {} as any,
    };
    const workflowId = 'test-workflow';
    const localCTX = {
      apiClient,
      executedSteps: [],
      $request: undefined,
      $response: undefined,
      $env: {},
      $faker: {
        address: {},
        date: {},
        number: {},
        string: {},
      },
      $sourceDescriptions: {
        'reusable-api': {
          arazzo: '1.0.1',
          info: {
            title: 'Reusable API',
            version: '1.0',
          },
          sourceDescriptions: [
            {
              name: 'cats',
              type: 'openapi',
              url: 'api-samples/cats.yaml',
            },
          ],
          workflows: [
            {
              workflowId: 'reusable-get-bird-workflow',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
                {
                  in: 'cookie',
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step-one',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
            },
            {
              workflowId: 'reusable-get-bird-workflow-2',
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
                {
                  in: 'cookie',
                  name: 'workflowLevelParam',
                  value: 'workflowcookie',
                },
              ],
              steps: [
                {
                  stepId: 'reusable-first-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
                {
                  stepId: 'reusable-delete-step',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                },
              ],
              outputs: {
                wowStatusCode: '$steps.reusable-delete-step.response.statusCode',
              },
            },
            {
              workflowId: 'second-workflow',
              dependsOn: ['reusable-get-bird-workflow', 'reusable-get-bird-workflow-2'],
              parameters: [
                {
                  in: 'header',
                  name: 'IMF-KEY',
                  value: 'test-key',
                },
              ],
              steps: [
                {
                  stepId: 'delete-small-mock',
                  'x-operation': {
                    url: 'http://localhost:3000/delete-mock',
                    method: 'delete',
                  },
                  successCriteria: [{ condition: '$statusCode == 204' }],
                  onSuccess: [
                    {
                      name: 'testRetry',
                      type: 'goto',
                      workflowId: 'reusable-get-bird-workflow',
                    },
                  ],
                },
              ],
            },
          ],
        },
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
      severity: DEFAULT_SEVERITY_CONFIGURATION,
      sourceDescriptions: [
        { name: 'cats', type: 'openapi', url: 'api-samples/cats.yaml' },
        { name: 'reusable-api', type: 'arazzo', url: 'small.yml' },
      ],
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'get-bird',
              workflowId: 'reusable-workflow',
              outputs: {
                stepOutput: '$outputs.reusableWorkflowOutput',
              },
              checks: [],
            },
          ],
        },
        {
          workflowId: 'reusable-workflow',
          steps: [
            {
              stepId: 'reusable-step',
              'x-operation': {
                url: 'http://localhost:3000/delete-mock',
                method: 'delete',
              },
              successCriteria: [{ condition: '$statusCode == 204' }],
              checks: [],
            },
          ],
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      ],
      $workflows: {
        'test-workflow': {
          steps: {
            'get-bird': {},
          },
        },
        'reusable-workflow': {
          steps: {
            'reusable-step': {},
          },
          outputs: {
            reusableWorkflowOutput: 'Hello, world!',
          },
        },
      },
      $steps: {},
      harLogs: {},
      options: {
        workflowPath: 'runStepTest.yml',
        workflow: undefined,
        skip: undefined,
        verbose: undefined,
        harLogsFile: 'har-output',
        metadata: {
          _: [],
          files: ['runStepTest.yml'],
          $0: 'respect',
          file: 'runStepTest.yml',
        },
        input: undefined,
        logger: logger,
      },
      info: { title: 'Test API', version: '1.0' },
      arazzo: '1.0.1',
      $outputs: {},
    } as unknown as TestContext;

    await runStep({
      step,
      ctx: localCTX,
      workflowId,
    });

    expect(runWorkflow).not.toHaveBeenCalled();
    expect(cleanColors(step?.checks[0]?.message || '')).toEqual(
      'Workflow $sourceDescriptions.wrong-reusable-api.workflows.reusable-external-workflow not found.'
    );
  });

  it('should report global timeout error and end execution', async () => {
    // Mock Timer only for this test
    const mockTimer = {
      isTimedOut: vi.fn().mockReturnValue(true),
    };
    vi.spyOn(Timer, 'getInstance').mockReturnValue(mockTimer as any);

    const checks: Check[] = [];
    const step = {
      stepId: 'get-bird',
      'x-operation': { url: 'http://localhost:3000/bird', method: 'get' },
      successCriteria: [{ condition: '$statusCode == 200' }],
      checks,
    } as unknown as Step;
    const workflowId = 'get-bird-workflow';

    const result = await runStep({
      step,
      ctx: basicCTX,
      workflowId,
    });

    expect(result).toEqual({ shouldEnd: true });
    expect(checks).toEqual([
      {
        name: CHECKS.GLOBAL_TIMEOUT_ERROR,
        passed: false,
        message: 'Global Respect timer reached',
        severity: 'error',
      },
    ]);
  });
});
