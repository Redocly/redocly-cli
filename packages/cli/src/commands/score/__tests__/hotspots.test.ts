import { DEFAULT_SCORING_CONSTANTS } from '../constants.js';
import { selectTopHotspots } from '../hotspots.js';
import type { DocumentMetrics, OperationMetrics, OperationScores } from '../types.js';

function makeMetrics(overrides: Partial<OperationMetrics> = {}): OperationMetrics {
  return {
    path: '/test',
    method: 'get',
    parameterCount: 0,
    requiredParameterCount: 0,
    paramsWithDescription: 0,
    requestBodyPresent: false,
    topLevelWritableFieldCount: 0,
    maxRequestSchemaDepth: 0,
    maxResponseSchemaDepth: 0,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,
    propertyCount: 0,
    operationDescriptionPresent: true,
    schemaPropertiesWithDescription: 0,
    totalSchemaProperties: 0,
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

/** Baseline "no issues" operation scores — all subscores at 100%. */
function makeScores(overrides: Partial<OperationScores> = {}): OperationScores {
  return {
    integrationSimplicity: 80,
    agentReadiness: 80,
    integrationSubscores: {
      parameterSimplicity: 1,
      schemaSimplicity: 1,
      documentationQuality: 1,
      constraintClarity: 1,
      exampleCoverage: 1,
      errorClarity: 1,
      dependencyClarity: 1,
    },
    agentSubscores: {
      documentationQuality: 1,
      constraintClarity: 1,
      exampleCoverage: 1,
      errorClarity: 1,
      identifierClarity: 1,
      dependencyClarity: 1,
      polymorphismClarity: 1,
    },
    ...overrides,
  };
}

describe('selectTopHotspots', () => {
  it('returns empty array when no operations have issues', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics()]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const depths = new Map([['op1', 0]]);
    const result = selectTopHotspots(docMetrics, opScores, depths);
    expect(result).toEqual([]);
  });

  it('detects high parameter count', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics({ parameterCount: 10 })]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result.length).toBe(1);
    expect(result[0].reasons).toContain('High parameter count (10)');
  });

  it('detects deep schema nesting', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics({ maxResponseSchemaDepth: 10 })]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result.length).toBe(1);
    expect(result[0].reasons[0]).toMatch(/Deep schema nesting/);
  });

  it('detects anyOf without discriminator', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([
        ['op1', makeMetrics({ anyOfCount: 2, polymorphismCount: 2, hasDiscriminator: false })],
      ]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('Polymorphism (anyOf) without discriminator (2 anyOf)');
  });

  it('detects high polymorphism count with discriminator', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([
        [
          'op1',
          makeMetrics({
            anyOfCount: 0,
            polymorphismCount: 5,
            hasDiscriminator: true,
          }),
        ],
      ]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('High polymorphism count (5)');
  });

  it('detects missing request and response examples for POST with body', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([
        [
          'op1',
          makeMetrics({
            method: 'post',
            requestBodyPresent: true,
            requestExamplePresent: false,
            responseExamplePresent: false,
          }),
        ],
      ]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('Missing request and response examples');
  });

  it('detects missing request body examples only', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([
        [
          'op1',
          makeMetrics({
            requestBodyPresent: true,
            requestExamplePresent: false,
            responseExamplePresent: true,
          }),
        ],
      ]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('Missing request body examples');
  });

  it('does NOT flag missing request example for GET (no body)', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([
        [
          'op1',
          makeMetrics({
            method: 'get',
            requestBodyPresent: false,
            requestExamplePresent: false,
            responseExamplePresent: true,
          }),
        ],
      ]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result).toEqual([]);
  });

  it('detects missing response examples only', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics({ responseExamplePresent: false })]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('Missing response examples');
  });

  it('detects no structured error responses', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([
        ['op1', makeMetrics({ totalErrorResponses: 2, structuredErrorResponseCount: 0 })],
      ]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('No structured error responses (4xx/5xx)');
  });

  it('detects missing operation description', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics({ operationDescriptionPresent: false })]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('Missing operation description');
  });

  it('detects no parameter descriptions', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics({ parameterCount: 3, paramsWithDescription: 0 })]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('No parameter descriptions');
  });

  it('detects high dependency depth', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics()]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 5]]));
    expect(result[0].reasons).toContain('High dependency depth (5)');
  });

  it('detects ambiguous identifiers', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 1,
      operations: new Map([['op1', makeMetrics({ ambiguousIdentifierCount: 3 })]]),
    };
    const opScores = new Map([['op1', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map([['op1', 0]]));
    expect(result[0].reasons).toContain('Ambiguous identifiers (3)');
  });

  it('sorts by reasons.length desc then by avg score asc', () => {
    const manyReasons = makeMetrics({
      parameterCount: 10,
      operationDescriptionPresent: false,
      responseExamplePresent: false,
      path: '/many',
    });
    const fewerReasons = makeMetrics({
      parameterCount: 10,
      path: '/fewer',
    });

    const docMetrics: DocumentMetrics = {
      operationCount: 2,
      operations: new Map([
        ['opFewer', fewerReasons],
        ['opMany', manyReasons],
      ]),
    };
    const opScores = new Map([
      ['opFewer', makeScores({ integrationSimplicity: 90, agentReadiness: 90 })],
      ['opMany', makeScores({ integrationSimplicity: 90, agentReadiness: 90 })],
    ]);
    const result = selectTopHotspots(
      docMetrics,
      opScores,
      new Map([
        ['opFewer', 0],
        ['opMany', 0],
      ])
    );
    expect(result[0].path).toBe('/many');
  });

  it('respects hotspotLimit', () => {
    const ops = new Map<string, OperationMetrics>();
    const scores = new Map<string, OperationScores>();
    const depths = new Map<string, number>();
    for (let i = 0; i < 20; i++) {
      const key = `op${i}`;
      ops.set(key, makeMetrics({ parameterCount: 10, path: `/path${i}` }));
      scores.set(key, makeScores());
      depths.set(key, 0);
    }
    const docMetrics: DocumentMetrics = { operationCount: 20, operations: ops };
    const result = selectTopHotspots(docMetrics, scores, depths, DEFAULT_SCORING_CONSTANTS);
    expect(result.length).toBe(10);
  });

  it('skips operations not found in documentMetrics', () => {
    const docMetrics: DocumentMetrics = {
      operationCount: 0,
      operations: new Map(),
    };
    const opScores = new Map([['missing', makeScores()]]);
    const result = selectTopHotspots(docMetrics, opScores, new Map());
    expect(result).toEqual([]);
  });
});
