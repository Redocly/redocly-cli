import { makeDocumentFromString, lint, bundle, type LocationObject } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import { type Step, type TestContext } from '../../../../types.js';
import { runTestFile, runStep } from '../../../flow-runner/index.js';
import { readYaml } from '../../../../utils/yaml.js';

vi.mock('../../../../utils/yaml.js', () => {
  const originalModule = vi.importActual('../../../../utils/yaml.js');

  return {
    ...originalModule, // In case there are other exports you want to preserve
    readYaml: vi.fn(),
  };
});

vi.mock('@redocly/openapi-core', async () => {
  const originalModule = await vi.importActual('@redocly/openapi-core');

  return {
    ...originalModule, // Preserve other exports
    formatProblems: vi.fn(), // Mock formatProblems to do nothing
    lint: vi.fn(),
    bundle: vi.fn(),
  };
});

vi.mock('../../../flow-runner/run-step.js', () => ({
  runStep: vi.fn(),
}));

vi.mock('node:fs', () => {
  const actual = vi.importActual('node:fs');
  const mockExistsSync = vi.fn();

  return {
    __esModule: true,
    default: {
      ...actual,
      existsSync: mockExistsSync,
    },
    existsSync: mockExistsSync,
  };
});

const mockExistsSync = vi.mocked(fs.existsSync);

describe('runTestFile', () => {
  beforeEach(() => {
    mockExistsSync.mockImplementation((path: any) => {
      // Always return true for test files to allow readYaml to be called
      if (path.includes('test.yaml') || path.includes('test.yml')) {
        return true;
      }

      // Return true for source description files (both relative and absolute paths)
      if (path.includes('cats.yaml')) {
        return true;
      }
      // Return false for non-existing files
      if (path.includes('not-existing')) {
        return false;
      }
      return false;
    });
    vi.mocked(readYaml).mockResolvedValue({
      openapi: '1.0.0',
      info: { title: 'Cat Facts API', version: '1.0' },
    });
    vi.mocked(lint).mockResolvedValue([]);
  });

  it(`should trow error if filename is not correct`, async () => {
    await expect(runTestFile({ file: '' }, {})).rejects.toThrowError('Invalid file name');
  });

  it(`should trow error if file is not valid Arazzo test file`, async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        openapi: '1.0.0',
        info: { title: 'Cat Facts API', version: '1.0' },
      }),
      'test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);

    await expect(runTestFile({ file: 'test.yaml' }, {})).rejects.toThrowError(
      'No test files found. File test.yaml does not follows naming pattern "*.[yaml | yml | json]" or have not valid "Arazzo" description.'
    );
  });

  it('should throw Found errors in Arazzo description error when contains lint errors', async () => {
    const testDescription = {
      workflows: [],
    };

    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: { title: 'Cat Facts API', version: '1.0' },
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            parameters: [{ in: 'header', name: 'IMF-KEY', value: 'test-key' }],
          },
        ],
      }),
      'test.yml'
    );

    vi.mocked(lint).mockResolvedValueOnce([
      {
        ruleId: 'struct',
        severity: 'error',
        message: 'The field `sourceDescriptions` must be present on this level.',
        from: undefined,
        location: [{} as LocationObject],
        suggest: [],
      },
      {
        ruleId: 'struct',
        severity: 'error',
        message: 'Property `sourceDescriptionsd` is not expected here.',
        suggest: ['sourceDescriptions'],
        from: undefined,
        location: [{} as LocationObject],
      },
    ]);

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);

    await expect(
      runTestFile(
        {
          file: 'test.yaml',
          testDescription,
        },
        {}
      )
    ).rejects.toMatchSnapshot();
  });

  it('should call runStep once', async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: {
          title: 'Cat Facts API',
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
            workflowId: 'get-bird-workflow',
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
                stepId: 'delete-step',
                'x-operation': {
                  url: 'http://localhost:3000/delete-mock',
                  method: 'delete',
                },
                successCriteria: [
                  {
                    condition: '$statusCode == 204',
                  },
                  {
                    condition: '$response.header.content-type == "text/plain;charset=UTF-8"',
                  },
                ],
              },
            ],
          },
        ],
      }),
      'api-test-framework/test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);
    vi.mocked(lint).mockResolvedValueOnce([]);
    vi.mocked(bundle).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    } as any);

    await runTestFile(
      {
        file: 'test.yaml',
      },
      {}
    );

    expect(runStep).toHaveBeenCalledTimes(1);
  });

  it('should call runStep multiple times including from dependsOn workflow', async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: {
          title: 'Cat Facts API',
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
            workflowId: 'get-bird-workflow',
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
                stepId: 'delete-step',
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
            workflowId: 'second-workflow',
            parameters: [
              {
                in: 'header',
                name: 'IMF-KEY',
                value: 'test-key',
              },
            ],
            dependsOn: ['get-bird-workflow'],
            steps: [
              {
                stepId: 'delete-mock',
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
        ],
      }),
      'test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);
    vi.mocked(lint).mockResolvedValueOnce([]);
    vi.mocked(bundle).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    } as any);

    await runTestFile(
      {
        file: 'test.yaml',
      },
      {}
    );

    // called 3 times, one for each step from each workflow and one from dependsOn
    expect(runStep).toHaveBeenCalledTimes(3);
  }, 8000);

  it('should throw an error when dependsOn has not existing workflowId', async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: {
          title: 'Cat Facts API',
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
            workflowId: 'get-bird-workflow',
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
                stepId: 'delete-step',
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
            workflowId: 'second-workflow',
            parameters: [
              {
                in: 'header',
                name: 'IMF-KEY',
                value: 'test-key',
              },
            ],
            dependsOn: ['get-bird-workflow', 'not-existing-workflowId'],
            steps: [
              {
                stepId: 'delete-mock',
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
        ],
      }),
      'api-test-framework/test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);
    vi.mocked(lint).mockResolvedValueOnce([]);
    vi.mocked(bundle).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    } as any);

    await expect(runTestFile({ file: 'test.yaml' }, {})).rejects.toThrow(
      expect.objectContaining({
        // @ts-ignore
        message: expect.stringContaining('Workflow', 'not-existing-workflowId', 'not found'),
      })
    );
  }, 8000);

  it('should throw an error when dependsOn has workflowId with not successful steps expectations', async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: {
          title: 'Cat Facts API',
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
            workflowId: 'get-bird-workflow',
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
                stepId: 'delete-step',
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
            workflowId: 'second-workflow',
            dependsOn: ['get-bird-workflow'],
            parameters: [
              {
                in: 'header',
                name: 'IMF-KEY',
                value: 'test-key',
              },
            ],
            steps: [
              {
                stepId: 'delete-mock',
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
        ],
      }),
      'api-test-framework/test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);
    vi.mocked(lint).mockResolvedValueOnce([]);
    vi.mocked(bundle).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    } as any);

    vi.mocked(runStep).mockImplementation(
      async ({ step, ctx }: { step: Step; ctx: TestContext }) => {
        step.checks = [{ name: step.stepId, passed: false, severity: 'error' }];
        ctx.executedSteps.push(step);
      }
    );

    await expect(
      runTestFile(
        {
          file: 'test.yaml',
        },
        {}
      )
    ).rejects.toThrowError('Dependent workflows has failed steps');
  }, 8000);

  it('should throw an error when sourcedescription OpenAPI file does not exist', async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: {
          title: 'Cat Facts API',
          version: '1.0',
        },
        sourceDescriptions: [
          {
            name: 'cats',
            type: 'openapi',
            url: 'api-samples/not-existing.yaml',
          },
        ],
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'delete-step',
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
        ],
      }),
      'api-test-framework/test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);
    vi.mocked(lint).mockResolvedValueOnce([]);
    vi.mocked(bundle).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    } as any);
    await expect(runTestFile({ file: 'test.yaml' }, {})).rejects.toThrowError(
      `Could not find source description file 'api-samples/not-existing.yaml' at path 'test.yaml'`
    );
  });

  it('should throw an error when sourcedescription Arazzo file does not exist', async () => {
    const mockDocument = makeDocumentFromString(
      JSON.stringify({
        arazzo: '1.0.1',
        info: {
          title: 'Cat Facts API',
          version: '1.0',
        },
        sourceDescriptions: [
          {
            name: 'cats',
            type: 'openapi',
            url: 'api-samples/cats.yaml',
          },
          {
            name: 'cats',
            type: 'arazzo',
            url: 'api-samples/not-existing-arazzo.yaml',
          },
        ],
        workflows: [
          {
            workflowId: 'get-bird-workflow',
            steps: [
              {
                stepId: 'delete-step',
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
        ],
      }),
      'api-test-framework/test.yml'
    );

    vi.mocked(readYaml).mockResolvedValue(mockDocument.parsed);
    vi.mocked(lint).mockResolvedValueOnce([]);
    vi.mocked(bundle).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    } as any);
    await expect(runTestFile({ file: 'test.yaml' }, {})).rejects.toThrowError(
      `Could not find source description file 'not-existing-arazzo.yaml' at path 'api-samples/not-existing-arazzo.yaml'`
    );
  });
});
