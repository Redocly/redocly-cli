vi.mock('@redocly/openapi-core', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    bundle: vi.fn(),
    detectSpec: vi.fn(),
    logger: { output: vi.fn(), info: vi.fn(), error: vi.fn() },
  };
});

vi.mock('../../../utils/miscellaneous.js', () => ({
  getFallbackApisOrExit: vi.fn(),
  printExecutionTime: vi.fn(),
}));

import { bundle, detectSpec, logger } from '@redocly/openapi-core';

import { getFallbackApisOrExit } from '../../../utils/miscellaneous.js';
import { handleScore, type ScoreArgv } from '../index.js';

const mockedBundle = vi.mocked(bundle);
const mockedDetectSpec = vi.mocked(detectSpec);
const mockedGetFallback = vi.mocked(getFallbackApisOrExit);
const mockOutput = vi.mocked(logger.output);
const mockInfo = vi.mocked(logger.info);
const mockError = vi.mocked(logger.error);

function makeMinimalDoc(overrides: Record<string, any> = {}) {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        get: {
          operationId: 'listItems',
          description: 'List items',
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { id: { type: 'string' } } },
                  example: { id: '1' },
                },
              },
            },
          },
        },
      },
    },
    ...overrides,
  };
}

function createArgs(overrides: Partial<ScoreArgv> = {}) {
  return {
    argv: { format: 'stylish' as const, ...overrides } as ScoreArgv,
    config: {} as any,
    collectSpecData: vi.fn(),
  };
}

describe('handleScore', () => {
  beforeEach(() => {
    mockOutput.mockClear();
    mockInfo.mockClear();
    mockError.mockClear();
    mockedGetFallback.mockResolvedValue([{ path: 'test.yaml' }] as any);
    process.exitCode = undefined;
  });

  it('should produce stylish output for a valid oas3 document', async () => {
    const doc = makeMinimalDoc();
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_0');

    await handleScore(createArgs());

    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Integration Simplicity');
    expect(output).toContain('Agent Readiness');
  });

  it('should produce JSON output when format is json', async () => {
    const doc = makeMinimalDoc();
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_0');

    await handleScore(createArgs({ format: 'json' }));

    const output = mockOutput.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.integrationSimplicity).toBeDefined();
    expect(parsed.agentReadiness).toBeDefined();
    expect(parsed.rawMetrics.operationCount).toBe(1);
  });

  it('should reject non-oas3 documents', async () => {
    mockedBundle.mockResolvedValue({ bundle: { parsed: { swagger: '2.0' } } } as any);
    mockedDetectSpec.mockReturnValue('oas2');

    await handleScore(createArgs());

    expect(process.exitCode).toBe(1);
    expect(mockError).toHaveBeenCalled();
    const errorMsg = mockError.mock.calls[0][0];
    expect(errorMsg).toContain('OpenAPI 3.x');
  });

  it('should call collectSpecData', async () => {
    const doc = makeMinimalDoc();
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_1');

    const args = createArgs();
    await handleScore(args);

    expect(args.collectSpecData).toHaveBeenCalledWith(doc);
  });

  it('should handle document with no operations', async () => {
    const doc = makeMinimalDoc({ paths: {} });
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_0');

    await handleScore(createArgs());

    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Total operations: 0');
  });

  it('should handle document with multiple operations', async () => {
    const doc = makeMinimalDoc({
      paths: {
        '/items': {
          get: {
            operationId: 'listItems',
            description: 'List items',
            responses: { '200': { description: 'OK' } },
          },
          post: {
            operationId: 'createItem',
            description: 'Create item',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { name: { type: 'string' } } },
                },
              },
            },
            responses: {
              '201': { description: 'Created' },
              '400': { description: 'Bad Request' },
            },
          },
        },
      },
    });
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_0');

    await handleScore(createArgs({ format: 'json' }));

    const parsed = JSON.parse(mockOutput.mock.calls[0][0]);
    expect(parsed.rawMetrics.operationCount).toBe(2);
    expect(parsed.operationScores.listItems).toBeDefined();
    expect(parsed.operationScores.createItem).toBeDefined();
  });

  it('should include hotspots in output', async () => {
    const doc = makeMinimalDoc({
      paths: {
        '/complex': {
          post: {
            operationId: 'complexOp',
            parameters: Array.from({ length: 10 }, (_, i) => ({
              name: `param${i}`,
              in: 'query',
            })),
            requestBody: {
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_0');

    await handleScore(createArgs());

    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Hotspot');
  });
});
