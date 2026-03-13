vi.mock('@redocly/openapi-core', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    bundle: vi.fn(),
    detectSpec: vi.fn(),
    BaseResolver: vi.fn(),
    resolveDocument: vi.fn(),
    normalizeTypes: vi.fn(),
    getTypes: vi.fn(),
    normalizeVisitors: vi.fn(),
    walkDocument: vi.fn(),
    logger: { output: vi.fn(), info: vi.fn(), error: vi.fn() },
  };
});

vi.mock('../../../utils/miscellaneous.js', () => ({
  getFallbackApisOrExit: vi.fn(),
  printExecutionTime: vi.fn(),
}));

vi.mock('../collectors/document-metrics.js', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    createScoreAccumulator: vi.fn(),
    createScoreVisitor: vi.fn(),
  };
});

import {
  bundle,
  detectSpec,
  logger,
  normalizeTypes,
  resolveDocument,
  normalizeVisitors,
  walkDocument,
} from '@redocly/openapi-core';

import { getFallbackApisOrExit } from '../../../utils/miscellaneous.js';
import {
  createScoreAccumulator,
  createScoreVisitor,
  type ScoreAccumulator,
} from '../collectors/document-metrics.js';
import { handleScore, type ScoreArgv } from '../index.js';
import type { OperationMetrics } from '../types.js';

const mockedBundle = vi.mocked(bundle);
const mockedDetectSpec = vi.mocked(detectSpec);
const mockedGetFallback = vi.mocked(getFallbackApisOrExit);
const mockOutput = vi.mocked(logger.output);
const mockError = vi.mocked(logger.error);
const mockedCreateAccumulator = vi.mocked(createScoreAccumulator);
const mockedCreateVisitor = vi.mocked(createScoreVisitor);
const mockedNormalizeTypes = vi.mocked(normalizeTypes);
const mockedResolveDocument = vi.mocked(resolveDocument);
const mockedNormalizeVisitors = vi.mocked(normalizeVisitors);
const mockedWalkDocument = vi.mocked(walkDocument);

function makeTestMetrics(overrides: Partial<OperationMetrics> = {}): OperationMetrics {
  return {
    path: '/items',
    method: 'get',
    operationId: 'listItems',
    parameterCount: 0,
    requiredParameterCount: 0,
    paramsWithDescription: 0,
    requestBodyPresent: false,
    topLevelWritableFieldCount: 0,
    maxRequestSchemaDepth: 0,
    maxResponseSchemaDepth: 1,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,
    propertyCount: 1,
    operationDescriptionPresent: true,
    schemaPropertiesWithDescription: 0,
    totalSchemaProperties: 1,
    constraintCount: 0,
    requestExamplePresent: false,
    responseExamplePresent: true,
    structuredErrorResponseCount: 0,
    totalErrorResponses: 0,
    ambiguousIdentifierCount: 0,
    refsUsed: new Set(),
    ...overrides,
  };
}

function makeAccumulator(ops: Map<string, OperationMetrics> = new Map()): ScoreAccumulator {
  return {
    operations: ops,
    currentPath: '',
    pathLevelParams: [],
    current: null,
    walkSchema: () => ({
      maxDepth: 0,
      polymorphismCount: 0,
      anyOfCount: 0,
      hasDiscriminator: false,
      propertyCount: 0,
      totalSchemaProperties: 0,
      schemaPropertiesWithDescription: 0,
      constraintCount: 0,
      hasPropertyExamples: false,
      writableTopLevelFields: 0,
      refsUsed: [],
    }),
  };
}

function createArgs(overrides: Partial<ScoreArgv> = {}) {
  return {
    argv: { format: 'stylish' as const, ...overrides } as ScoreArgv,
    config: { extendTypes: (types: any) => types, resolve: {} } as any,
    version: '0.0.0-test',
    collectSpecData: vi.fn(),
  };
}

describe('handleScore', () => {
  beforeEach(() => {
    mockOutput.mockClear();
    mockError.mockClear();
    mockedGetFallback.mockResolvedValue([{ path: 'test.yaml' }] as any);
    mockedBundle.mockResolvedValue({ bundle: { parsed: {} } } as any);
    mockedDetectSpec.mockReturnValue('oas3_0');
    mockedNormalizeTypes.mockReturnValue({ Root: {} } as any);
    mockedResolveDocument.mockResolvedValue(new Map() as any);
    mockedNormalizeVisitors.mockReturnValue([] as any);
    mockedWalkDocument.mockImplementation(() => {});
    mockedCreateVisitor.mockReturnValue({} as any);
    mockedCreateAccumulator.mockReturnValue(
      makeAccumulator(new Map([['listItems', makeTestMetrics()]]))
    );
    process.exitCode = undefined;
  });

  it('should produce stylish output for a valid oas3 document', async () => {
    await handleScore(createArgs());

    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Integration Simplicity');
    expect(output).toContain('Agent Readiness');
  });

  it('should produce JSON output when format is json', async () => {
    await handleScore(createArgs({ format: 'json' }));

    const output = mockOutput.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.integrationSimplicity).toBeDefined();
    expect(parsed.agentReadiness).toBeDefined();
    expect(parsed.rawMetrics.operationCount).toBe(1);
  });

  it('should reject non-oas3 documents', async () => {
    mockedDetectSpec.mockReturnValue('oas2');

    await handleScore(createArgs());

    expect(process.exitCode).toBe(1);
    expect(mockError).toHaveBeenCalled();
    const errorMsg = mockError.mock.calls[0][0];
    expect(errorMsg).toContain('OpenAPI 3.x');
  });

  it('should call collectSpecData', async () => {
    const doc = { openapi: '3.0.0' };
    mockedBundle.mockResolvedValue({ bundle: { parsed: doc } } as any);
    mockedDetectSpec.mockReturnValue('oas3_1');

    const args = createArgs();
    await handleScore(args);

    expect(args.collectSpecData).toHaveBeenCalledWith(doc);
  });

  it('should handle document with no operations', async () => {
    mockedCreateAccumulator.mockReturnValue(makeAccumulator());

    await handleScore(createArgs());

    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Total operations: 0');
  });

  it('should handle document with multiple operations', async () => {
    mockedCreateAccumulator.mockReturnValue(
      makeAccumulator(
        new Map([
          ['listItems', makeTestMetrics()],
          [
            'createItem',
            makeTestMetrics({
              path: '/items',
              method: 'post',
              operationId: 'createItem',
              requestBodyPresent: true,
              operationDescriptionPresent: true,
            }),
          ],
        ])
      )
    );

    await handleScore(createArgs({ format: 'json' }));

    const parsed = JSON.parse(mockOutput.mock.calls[0][0]);
    expect(parsed.rawMetrics.operationCount).toBe(2);
    expect(parsed.operationScores.listItems).toBeDefined();
    expect(parsed.operationScores.createItem).toBeDefined();
  });

  it('should include hotspots in output', async () => {
    mockedCreateAccumulator.mockReturnValue(
      makeAccumulator(
        new Map([
          [
            'complexOp',
            makeTestMetrics({
              path: '/complex',
              method: 'post',
              operationId: 'complexOp',
              parameterCount: 10,
              requestBodyPresent: true,
              operationDescriptionPresent: false,
            }),
          ],
        ])
      )
    );

    await handleScore(createArgs());

    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Hotspot');
  });
});
