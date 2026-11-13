import { getRecommendations } from '../recommendations.js';
import { simulateScore } from '../simulate.js';
import type { DocumentMetrics, OperationMetrics } from '../types.js';

function makeMetrics(overrides: Partial<OperationMetrics> = {}): OperationMetrics {
  return {
    path: '/items',
    method: 'get',
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
    operationDescriptionPresent: true,
    schemaPropertiesWithDescription: 2,
    totalSchemaProperties: 2,
    constraintCount: 2,
    requestExamplePresent: false,
    responseExamplePresent: true,
    responseBodyPresent: true,
    structuredErrorResponseCount: 1,
    totalErrorResponses: 1,
    ambiguousIdentifierCount: 0,
    refsUsed: new Set(),
    ...overrides,
  };
}

function makeDocument(operations: Record<string, OperationMetrics>): DocumentMetrics {
  return {
    operationCount: Object.keys(operations).length,
    operations: new Map(Object.entries(operations)),
  };
}

describe('getRecommendations', () => {
  it('ranks the edits by impact and leaves constraints out of the reachable score', () => {
    const document = makeDocument({
      listItems: makeMetrics({
        operationId: 'listItems',
        constraintCount: 0,
        responseExamplePresent: false,
      }),
      createItem: makeMetrics({
        method: 'post',
        operationId: 'createItem',
        requestBodyPresent: true,
      }),
    });

    const { reachableScore, recommendations } = getRecommendations(
      document,
      new Map(),
      simulateScore(document, new Map(), [])
    );

    expect(recommendations.map(({ kind, impact, safe }) => ({ kind, impact, safe })))
      .toMatchInlineSnapshot(`
        [
          {
            "impact": 8.1,
            "kind": "response-example",
            "safe": true,
          },
          {
            "impact": 5.4,
            "kind": "constraint",
            "safe": false,
          },
          {
            "impact": 4,
            "kind": "request-example",
            "safe": true,
          },
        ]
      `);
    expect(reachableScore).toBe(
      simulateScore(document, new Map(), ['request-example', 'response-example'])
    );
  });

  it('recommends nothing for a fully documented document', () => {
    const document = makeDocument({
      createItem: makeMetrics({
        method: 'post',
        requestBodyPresent: true,
        requestExamplePresent: true,
      }),
    });

    const { recommendations, designFindings } = getRecommendations(
      document,
      new Map(),
      simulateScore(document, new Map(), [])
    );

    expect(recommendations).toEqual([]);
    expect(designFindings).toEqual([]);
  });

  it('recommends no response example for an operation without a response body', () => {
    const document = makeDocument({
      receiveHook: makeMetrics({
        method: 'post',
        responseBodyPresent: false,
        responseExamplePresent: false,
      }),
    });

    const { recommendations } = getRecommendations(
      document,
      new Map(),
      simulateScore(document, new Map(), [])
    );

    expect(recommendations).toEqual([]);
  });
});
