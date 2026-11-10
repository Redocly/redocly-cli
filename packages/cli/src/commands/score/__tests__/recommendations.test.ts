import { getRecommendations } from '../recommendations.js';
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
  it('ranks the edits by simulated impact and keeps constraints out of the reachable score', () => {
    const document = makeDocument({
      listItems: makeMetrics({
        operationId: 'listItems',
        parameterCount: 10,
        ambiguousIdentifierCount: 2,
        operationDescriptionPresent: false,
        schemaPropertiesWithDescription: 0,
        totalSchemaProperties: 4,
        constraintCount: 0,
        responseExamplePresent: false,
        structuredErrorResponseCount: 0,
      }),
      createItem: makeMetrics({
        method: 'post',
        operationId: 'createItem',
        requestBodyPresent: true,
      }),
    });

    const result = getRecommendations(document, new Map());

    expect(result).toMatchInlineSnapshot(`
      {
        "designFindings": [
          {
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "reason": "High parameter count",
            "subscore": "parameterSimplicity",
          },
        ],
        "reachableScore": 89,
        "recommendations": [
          {
            "count": 1,
            "id": "response-example",
            "impact": 8.1,
            "kind": "response-example",
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "safe": true,
            "subscore": "exampleCoverage",
          },
          {
            "count": 10,
            "id": "parameter-description",
            "impact": 7,
            "kind": "parameter-description",
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "safe": true,
            "subscore": "documentationQuality",
          },
          {
            "count": 4,
            "id": "constraint",
            "impact": 5.4,
            "kind": "constraint",
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "safe": false,
            "subscore": "constraintClarity",
          },
          {
            "count": 1,
            "id": "structured-error",
            "impact": 5.4,
            "kind": "structured-error",
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "safe": true,
            "subscore": "errorClarity",
          },
          {
            "count": 1,
            "id": "request-example",
            "impact": 4.1,
            "kind": "request-example",
            "operations": [
              {
                "method": "post",
                "operationId": "createItem",
                "path": "/items",
              },
            ],
            "safe": true,
            "subscore": "exampleCoverage",
          },
          {
            "count": 4,
            "id": "property-description",
            "impact": 2.2,
            "kind": "property-description",
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "safe": true,
            "subscore": "documentationQuality",
          },
          {
            "count": 1,
            "id": "operation-description",
            "impact": 0.6,
            "kind": "operation-description",
            "operations": [
              {
                "method": "get",
                "operationId": "listItems",
                "path": "/items",
              },
            ],
            "safe": true,
            "subscore": "documentationQuality",
          },
        ],
      }
    `);
  });

  it('recommends nothing for a fully documented document', () => {
    const document = makeDocument({
      createItem: makeMetrics({
        method: 'post',
        requestBodyPresent: true,
        requestExamplePresent: true,
      }),
    });

    const { recommendations, designFindings } = getRecommendations(document, new Map());

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

    expect(getRecommendations(document, new Map()).recommendations).toEqual([]);
  });
});
