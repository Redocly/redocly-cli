import type { ApiFetcher } from '../../../../utils/api-fetcher';
import type { Workflow, TestContext } from '../../../../types';

import { runWorkflow, DEFAULT_SEVERITY_CONFIGURATION } from '../../../flow-runner';
import { DefaultLogger } from '../../../../utils/logger/logger';

const logger = DefaultLogger.getInstance();
describe('runWorkflow', () => {
  const fileName = 'test.yaml';
  it('should run workflow', async () => {
    const apiClient = {
      setDescriptionParameters: jest.fn(),
      getRequestHeaderParams: jest.fn(),
      getRequestParams: jest.fn(),
      setDefaultsParameters: jest.fn(),
      setDisconnectDescription: jest.fn(),
      setPath: jest.fn(),
      setDescriptionRequestBody: jest.fn(),
      setDescriptionResponses: jest.fn(),
      setDescriptionContentType: jest.fn(),
      setParameters: jest.fn(),
      setTestCaseRequestBody: jest.fn(),
      setMethod: jest.fn(),
      setApiBase: jest.fn(),
      fetchResult: jest.fn(),
      getVerboseResponseLogs: jest.fn(),
    } as unknown as ApiFetcher;

    (apiClient.fetchResult as jest.Mock).mockResolvedValue({
      statusCode: 200,
    });

    const workflow = {
      workflowId: 'test',
      steps: [
        {
          stepId: 'test',
          'x-operation': {
            url: 'http://localhost:3000/test',
            method: 'GET',
          },
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
    } as unknown as Workflow;

    const ctx = {
      executedSteps: [],
      apiClient,
      workflows: [workflow],
      $workflows: {
        test: {
          inputs: {},
          steps: {
            test: {
              successCriteria: [
                {
                  condition: '$statusCode == 200',
                },
              ],
              response: {
                statusCode: 200,
              },
            },
          },
        },
      },
      $steps: {
        test: {
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
          response: {
            statusCode: 200,
          },
        },
      },
      severity: DEFAULT_SEVERITY_CONFIGURATION,
      sourceDescriptions: [
        {
          name: 'test',
          type: 'openapi',
          url: 'openapi.yaml',
        },
      ],
      options: {
        verbose: false,
        workflowPath: fileName,
      },
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx, sessionStartTime: performance.now() });

    expect(apiClient.fetchResult).toBeCalled();
  });

  it('should return if no steps', async () => {
    const apiClient = {
      fetchResult: jest.fn(),
    } as unknown as ApiFetcher;

    const workflow = {
      workflowId: 'test',
      steps: [],
    } as unknown as Workflow;

    const ctx = {
      apiClient,
      workflows: [workflow],
      options: {
        verbose: false,
        workflowPath: fileName,
      },
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx, sessionStartTime: performance.now() });

    expect(apiClient.fetchResult).not.toBeCalled();
  });

  it('should throw an error if no workflow exists', async () => {
    const apiClient = {
      fetchResult: jest.fn(),
    } as unknown as ApiFetcher;

    const ctx = {
      apiClient,
      workflows: [],
      options: {
        verbose: false,
        workflowPath: fileName,
      },
    } as unknown as TestContext;
    await expect(
      runWorkflow({ workflowInput: 'test', ctx, sessionStartTime: performance.now() })
    ).rejects.toThrowError();
    expect(apiClient.fetchResult).not.toBeCalled();
  });

  it('should set workflow outputs', async () => {
    const apiClient = {
      fetchResult: jest.fn(),
      getVerboseResponseLogs: jest.fn(),
    } as unknown as ApiFetcher;

    (apiClient.fetchResult as jest.Mock).mockResolvedValue({
      statusCode: 200,
    });

    const workflow = {
      workflowId: 'test',
      outputs: {
        test: 'test',
      },

      steps: [
        {
          stepId: 'test',
          'x-operation': {
            url: 'http://localhost:3000/test',
            method: 'GET',
          },
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
    } as unknown as Workflow;

    const ctx = {
      apiClient,
      workflows: [workflow],
      executedSteps: [],
      $workflows: {
        test: {
          outputs: {},
          inputs: {},
          steps: {
            test: {
              successCriteria: [
                {
                  condition: '$statusCode == 200',
                },
              ],
              response: {
                statusCode: 200,
              },
            },
          },
        },
      },
      $steps: {
        test: {
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
          response: {
            statusCode: 200,
          },
        },
      },
      sourceDescriptions: [
        {
          name: 'test',
          type: 'openapi',
          url: 'openapi.yaml',
        },
      ],
      severity: DEFAULT_SEVERITY_CONFIGURATION,
      options: {
        verbose: false,
        workflowPath: fileName,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx, sessionStartTime: performance.now() });

    expect(ctx.$outputs?.test).toEqual({ test: 'test' });
    expect(ctx.$workflows.test.outputs).toEqual({ test: 'test' });
  });

  it('should return if workflow does not have steps', async () => {
    const apiClient = {
      fetchResult: jest.fn(),
    } as unknown as ApiFetcher;

    (apiClient.fetchResult as jest.Mock).mockResolvedValue({
      statusCode: 200,
    });

    const workflow = {
      workflowId: 'test',
      outputs: {
        test: 'test',
      },

      steps: [],
    } as unknown as Workflow;

    const ctx = {
      apiClient,
      workflows: [workflow],
      $workflows: {
        test: {
          outputs: {},
          inputs: {},
          steps: {
            test: {
              successCriteria: [
                {
                  condition: '$statusCode == 200',
                },
              ],
              response: {
                statusCode: 200,
              },
            },
          },
        },
      },
      $steps: {
        test: {
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
          response: {
            statusCode: 200,
          },
        },
      },
      sourceDescriptions: [
        {
          name: 'test',
          type: 'openapi',
          url: 'openapi.yaml',
        },
      ],
      options: {
        verbose: false,
        workflowPath: fileName,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx, sessionStartTime: performance.now() });

    expect(apiClient.fetchResult).not.toBeCalled();
  });

  it('should run workflow within step execution', async () => {
    const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
    const apiClient = {
      fetchResult: jest.fn(),
    } as unknown as ApiFetcher;

    (apiClient.fetchResult as jest.Mock).mockResolvedValue({
      statusCode: 200,
    });

    const workflow = {
      workflowId: 'test',
      outputs: {
        test: 'test',
      },
      steps: [],
    } as unknown as Workflow;

    const ctx = {
      apiClient,
      workflows: [workflow],
      $workflows: {
        test: {
          outputs: {},
          inputs: {},
          steps: {},
        },
        parentWorkflowId: {
          outputs: {},
          inputs: {},
          steps: {},
        },
      },
      $steps: {},
      sourceDescriptions: [
        {
          name: 'test',
          type: 'openapi',
          url: 'openapi.yaml',
        },
      ],
      options: {
        verbose: false,
        workflowPath: fileName,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({
      workflowInput: 'test',
      ctx,
      sessionStartTime: performance.now(),
    });

    expect(mockLogger).toMatchSnapshot();

    mockLogger.mockRestore();
  });

  it('should accept workflow as an input', async () => {
    const apiClient = {
      fetchResult: jest.fn(),
      getVerboseResponseLogs: jest.fn(),
    } as unknown as ApiFetcher;

    (apiClient.fetchResult as jest.Mock).mockResolvedValue({
      statusCode: 200,
    });

    const workflow = {
      workflowId: 'test',
      outputs: {
        test: 'test',
      },

      steps: [
        {
          stepId: 'test',
          'x-operation': {
            url: 'http://localhost:3000/test',
            method: 'GET',
          },
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
        },
      ],
    } as unknown as Workflow;

    const ctx = {
      apiClient,
      workflows: [workflow],
      executedSteps: [],
      $workflows: {
        test: {
          outputs: {
            test: 'test',
          },

          inputs: {},
          steps: {
            test: {
              successCriteria: [
                {
                  condition: '$statusCode == 200',
                },
              ],
              response: {
                statusCode: 200,
              },
            },
          },
        },
        parentWorkflowId: {
          inputs: {},
          outputs: {},
          steps: {},
        },
      },
      $steps: {
        test: {
          successCriteria: [
            {
              condition: '$statusCode == 200',
            },
          ],
          response: {
            statusCode: 200,
          },
        },
      },
      sourceDescriptions: [
        {
          name: 'test',
          type: 'openapi',
          url: 'openapi.yaml',
        },
      ],
      severity: DEFAULT_SEVERITY_CONFIGURATION,
      options: {
        verbose: false,
        workflowPath: fileName,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({
      workflowInput: workflow,
      ctx,
      sessionStartTime: performance.now(),
    });

    expect(ctx.$outputs?.test).toEqual({ test: 'test' });
    expect(ctx.$workflows.test.outputs).toEqual({ test: 'test' });
  });
});
