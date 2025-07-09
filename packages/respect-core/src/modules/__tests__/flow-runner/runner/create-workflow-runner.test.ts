import { logger } from '@redocly/openapi-core';
import { runWorkflow, DEFAULT_SEVERITY_CONFIGURATION } from '../../../flow-runner/index.js';
import { type ResponseContext } from '../../../../types.js';

import type { ApiFetcher } from '../../../../utils/api-fetcher.js';
import type { Workflow, TestContext } from '../../../../types.js';

describe('runWorkflow', () => {
  const fileName = 'test.yaml';
  it('should run workflow', async () => {
    const apiClient = {
      setDescriptionParameters: vi.fn(),
      getRequestHeaderParams: vi.fn(),
      getRequestParams: vi.fn(),
      setDefaultsParameters: vi.fn(),
      setDisconnectDescription: vi.fn(),
      setPath: vi.fn(),
      setDescriptionRequestBody: vi.fn(),
      setDescriptionResponses: vi.fn(),
      setDescriptionContentType: vi.fn(),
      setParameters: vi.fn(),
      setTestCaseRequestBody: vi.fn(),
      setMethod: vi.fn(),
      setApiBase: vi.fn(),
      fetchResult: vi.fn(),
      getVerboseResponseLogs: vi.fn(),
    } as unknown as ApiFetcher;

    vi.mocked(apiClient.fetchResult).mockResolvedValue({
      statusCode: 200,
    } as ResponseContext);

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
        logger,
      },
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx });

    expect(apiClient.fetchResult).toBeCalled();
  });

  it('should return if no steps', async () => {
    const apiClient = {
      fetchResult: vi.fn(),
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
        logger,
      },
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx });

    expect(apiClient.fetchResult).not.toBeCalled();
  });

  it('should throw an error if no workflow exists', async () => {
    const apiClient = {
      fetchResult: vi.fn(),
    } as unknown as ApiFetcher;

    const ctx = {
      apiClient,
      workflows: [],
      options: {
        verbose: false,
        workflowPath: fileName,
        logger,
      },
    } as unknown as TestContext;
    await expect(runWorkflow({ workflowInput: 'test', ctx })).rejects.toThrowError();
    expect(apiClient.fetchResult).not.toBeCalled();
  });

  it('should set workflow outputs', async () => {
    const apiClient = {
      fetchResult: vi.fn(),
      getVerboseResponseLogs: vi.fn(),
    } as unknown as ApiFetcher;

    vi.mocked(apiClient.fetchResult).mockResolvedValue({
      statusCode: 200,
    } as ResponseContext);

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
        logger,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx });

    expect(ctx.$outputs?.test).toEqual({ test: 'test' });
    expect(ctx.$workflows.test.outputs).toEqual({ test: 'test' });
  });

  it('should return if workflow does not have steps', async () => {
    const apiClient = {
      fetchResult: vi.fn(),
    } as unknown as ApiFetcher;

    vi.mocked(apiClient.fetchResult).mockResolvedValue({
      statusCode: 200,
    } as ResponseContext);

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
        logger,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({ workflowInput: 'test', ctx });

    expect(apiClient.fetchResult).not.toBeCalled();
  });

  it('should run workflow within step execution', async () => {
    const loggerSpy = vi.spyOn(logger, 'output').mockImplementation(() => {});
    const apiClient = {
      fetchResult: vi.fn(),
    } as unknown as ApiFetcher;

    vi.mocked(apiClient.fetchResult).mockResolvedValue({
      statusCode: 200,
    } as ResponseContext);

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
        logger,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({
      workflowInput: 'test',
      ctx,
    });

    expect(loggerSpy).toMatchSnapshot();

    loggerSpy.mockRestore();
  });

  it('should accept workflow as an input', async () => {
    const apiClient = {
      fetchResult: vi.fn(),
      getVerboseResponseLogs: vi.fn(),
    } as unknown as ApiFetcher;

    vi.mocked(apiClient.fetchResult).mockResolvedValue({
      statusCode: 200,
    } as ResponseContext);

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
        logger,
      },
      $outputs: {},
    } as unknown as TestContext;

    await runWorkflow({
      workflowInput: workflow,
      ctx,
    });

    expect(ctx.$outputs?.test).toEqual({ test: 'test' });
    expect(ctx.$workflows.test.outputs).toEqual({ test: 'test' });
  });
});
