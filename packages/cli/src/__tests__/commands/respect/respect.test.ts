import { handleRespect, type RespectArgv } from '../../../commands/respect/index.js';
import { run } from '@redocly/respect-core';
import { Config } from '@redocly/openapi-core';

// Mock node:fs
vi.mock('node:fs', async () => {
  return {
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => false), // Return false to prevent plugin loading
    readFileSync: vi.fn(() => ''),
    accessSync: vi.fn(() => true),
    constants: {
      F_OK: 0,
      R_OK: 4,
    },
  };
});

// Mock the run function
vi.mock('@redocly/respect-core', async () => {
  const actual = await vi.importActual('@redocly/respect-core');
  return {
    ...actual,
    run: vi.fn(),
  };
});

// Mock @redocly/openapi-core
vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      output: vi.fn(),
      printNewLine: vi.fn(),
      indent: vi.fn((text) => text),
    },
    stringifyYaml: vi.fn(() => 'mocked yaml'),
  };
});

// Mock displayFilesSummaryTable
vi.mock('../../../commands/respect/display-files-summary-table.js', () => ({
  displayFilesSummaryTable: vi.fn(),
}));

describe('handleRespect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should call run with the correct arguments', async () => {
    const mockConfig = new Config({});
    const commandArgs = {
      argv: {
        files: ['test.arazzo.yaml'],
        input: 'name=John',
        server: 'server1=http://localhost:3000',
        workflow: ['workflow3'],
        verbose: true,
        'max-steps': 2000,
        severity: 'STATUS_CODE_CHECK=warn',
        'max-fetch-timeout': 40_000,
        'execution-timeout': 3_600_000,
      } as RespectArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    vi.mocked(run).mockResolvedValue([
      {
        hasProblems: false,
        hasWarnings: false,
        file: 'test.arazzo.yaml',
        executedWorkflows: [],
        options: {} as any,
        ctx: {} as any,
        totalTimeMs: 100,
        totalRequests: 1,
        globalTimeoutError: false,
      },
    ]);

    await handleRespect(commandArgs);

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ['test.arazzo.yaml'],
        input: 'name=John',
        server: 'server1=http://localhost:3000',
        workflow: ['workflow3'],
        verbose: true,
        config: expect.anything(),
        version: '1.0.0',
        collectSpecData: expect.anything(),
        severity: 'STATUS_CODE_CHECK=warn',
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        executionTimeout: 3_600_000,
      })
    );
  });
});
