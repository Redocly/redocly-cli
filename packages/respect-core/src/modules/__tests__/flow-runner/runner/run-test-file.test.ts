import { makeDocumentFromString, lint, bundle } from '@redocly/openapi-core';
import * as fs from 'node:fs';

import type { Step, TestContext } from '../../../../types';

import { runTestFile, runStep } from '../../../flow-runner';
import { readYaml } from '../../../../utils/yaml';
import { writeFileSync } from 'node:fs';
import { type Mock } from 'vitest';

vi.mock('../../../../utils/yaml', () => {
  const originalModule = vi.importActual('../../../../utils/yaml');
  return {
    ...originalModule, // In case there are other exports you want to preserve
    readYaml: vi.fn(),
  };
});

vi.mock('@redocly/openapi-core', () => ({
  ...vi.importActual('@redocly/openapi-core'), // Preserve other exports
  formatProblems: vi.fn(), // Mock formatProblems to do nothing
  lint: vi.fn(),
  bundle: vi.fn(),
}));

vi.mock('../../../flow-runner/run-step', () => ({
  runStep: vi.fn(),
}));

vi.mock('node:fs', () => {
  const actual = vi.importActual('node:fs');
  const mockExistsSync = vi.fn();
  const mockWriteFileSync = vi.fn();

  return {
    __esModule: true,
    default: {
      ...actual,
      existsSync: mockExistsSync,
    },
    existsSync: mockExistsSync,
  };
});

const mockExistsSync = fs.existsSync as Mock;

describe('runTestFile', () => {
  beforeEach(() => {
    mockExistsSync.mockImplementation((path: string) => {
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
    (readYaml as Mock).mockReset().mockResolvedValue({
      openapi: '1.0.0',
      info: { title: 'Cat Facts API', version: '1.0' },
    });
    (lint as Mock).mockReset().mockResolvedValue([]);
    (bundle as Mock).mockReset();
    (runStep as Mock).mockReset();
  });

  afterAll(() => {
    vi.resetAllMocks();
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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);

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

    (lint as Mock).mockResolvedValueOnce([
      {
        ruleId: 'spec',
        severity: 'error',
        message: 'The field `sourceDescriptions` must be present on this level.',
        from: undefined,
        location: [{}],
        suggest: [],
      },
      {
        ruleId: 'spec',
        severity: 'error',
        message: 'Property `sourceDescriptionsd` is not expected here.',
        suggest: ['sourceDescriptions'],
        from: undefined,
        location: [{}],
      },
    ]);

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);

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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);
    (lint as Mock).mockResolvedValueOnce([]);
    (bundle as Mock).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    });

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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);
    (lint as Mock).mockResolvedValueOnce([]);
    (bundle as Mock).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    });

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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);
    (lint as Mock).mockResolvedValueOnce([]);
    (bundle as Mock).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    });

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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);
    (lint as Mock).mockResolvedValueOnce([]);
    (bundle as Mock).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    });

    (runStep as Mock).mockImplementation(({ step, ctx }: { step: Step; ctx: TestContext }) => {
      step.checks = [{ name: step.stepId, passed: false, severity: 'error' }];
      ctx.executedSteps.push(step);
    });

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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);
    (lint as Mock).mockResolvedValueOnce([]);
    (bundle as Mock).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    });
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

    (readYaml as Mock).mockResolvedValue(mockDocument.parsed);
    (lint as Mock).mockResolvedValueOnce([]);
    (bundle as Mock).mockResolvedValueOnce({
      bundle: {
        parsed: mockDocument.parsed,
      },
    });
    await expect(runTestFile({ file: 'test.yaml' }, {})).rejects.toThrowError(
      `Could not find source description file 'not-existing-arazzo.yaml' at path 'api-samples/not-existing-arazzo.yaml'`
    );
  });
});
