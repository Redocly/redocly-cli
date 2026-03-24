import {
  normalizeTypes,
  getTypes,
  normalizeVisitors,
  walkDocument,
  resolveDocument,
  BaseResolver,
  Source,
  type Document,
  type WalkContext,
} from '@redocly/openapi-core';

import {
  createScoreAccumulator,
  createScoreVisitor,
  createSchemaWalkState,
  resetSchemaWalkState,
  createSchemaMetricVisitor,
  getDocumentMetrics,
} from '../collectors/document-metrics.js';
import {
  computeOperationIntegrationSubscores,
  computeOperationAgentSubscores,
  computeIntegrationSimplicity,
  computeAgentReadiness,
} from '../scoring.js';
import type { DocumentMetrics } from '../types.js';

async function collectDocumentMetrics(doc: Record<string, unknown>): Promise<DocumentMetrics> {
  const types = normalizeTypes(getTypes('oas3_0'), {});
  const source = new Source('test.yaml', JSON.stringify(doc));
  const document: Document = { source, parsed: doc };
  const externalRefResolver = new BaseResolver();
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx: WalkContext = { problems: [], specVersion: 'oas3_0', visitorsData: {} };
  const schemaWalkState = createSchemaWalkState();
  const schemaVisitor = createSchemaMetricVisitor(schemaWalkState);
  const normalizedSchemaVis = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'test-schema', visitor: schemaVisitor }],
    types
  );
  const walkSchema = (schemaNode: any) => {
    resetSchemaWalkState(schemaWalkState);
    walkDocument({
      document: { ...document, parsed: schemaNode },
      rootType: types.Schema,
      normalizedVisitors: normalizedSchemaVis,
      resolvedRefMap,
      ctx,
    });
    return {
      maxDepth: schemaWalkState.maxDepth,
      polymorphismCount: schemaWalkState.polymorphismCount,
      anyOfCount: schemaWalkState.anyOfCount,
      hasDiscriminator: schemaWalkState.hasDiscriminator,
      propertyCount: schemaWalkState.propertyCount,
      totalSchemaProperties: schemaWalkState.totalSchemaProperties,
      schemaPropertiesWithDescription: schemaWalkState.schemaPropertiesWithDescription,
      constraintCount: schemaWalkState.constraintCount,
      hasPropertyExamples: schemaWalkState.hasPropertyExamples,
      writableTopLevelFields: schemaWalkState.writableTopLevelFields,
      refsUsed: [...schemaWalkState.refsUsed],
    };
  };
  const accumulator = createScoreAccumulator(walkSchema);
  const visitor = createScoreVisitor(accumulator);
  const normalizedVis = normalizeVisitors([{ severity: 'warn', ruleId: 'test', visitor }], types);
  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizedVis,
    resolvedRefMap,
    ctx,
  });
  return getDocumentMetrics(accumulator);
}

describe('example coverage', () => {
  function makeDocument(overrides: {
    requestExample?: boolean;
    responseExample?: boolean;
    hasRequestBody?: boolean;
  }) {
    const requestBody =
      overrides.hasRequestBody !== false
        ? {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } },
                ...(overrides.requestExample ? { example: { name: 'test' } } : {}),
              },
            },
          }
        : undefined;

    return {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            description: 'Create an item',
            ...(requestBody ? { requestBody } : {}),
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { id: { type: 'string' } } },
                    ...(overrides.responseExample ? { example: { id: '123' } } : {}),
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  it('should give perfect example coverage when both request and response examples present', async () => {
    const doc = makeDocument({ requestExample: true, responseExample: true, hasRequestBody: true });
    const metrics = await collectDocumentMetrics(doc);
    const opMetrics = metrics.operations.get('createItem')!;

    expect(opMetrics.requestExamplePresent).toBe(true);
    expect(opMetrics.responseExamplePresent).toBe(true);

    const subscores = computeOperationIntegrationSubscores(opMetrics, 0);
    expect(subscores.exampleCoverage).toBe(1);
  });

  it('should give half example coverage when only response example present', async () => {
    const doc = makeDocument({
      requestExample: false,
      responseExample: true,
      hasRequestBody: true,
    });
    const metrics = await collectDocumentMetrics(doc);
    const opMetrics = metrics.operations.get('createItem')!;

    expect(opMetrics.requestExamplePresent).toBe(false);
    expect(opMetrics.responseExamplePresent).toBe(true);

    const subscores = computeOperationIntegrationSubscores(opMetrics, 0);
    expect(subscores.exampleCoverage).toBe(0.5);
  });

  it('should give zero example coverage when no examples', async () => {
    const doc = makeDocument({
      requestExample: false,
      responseExample: false,
      hasRequestBody: true,
    });
    const metrics = await collectDocumentMetrics(doc);
    const opMetrics = metrics.operations.get('createItem')!;

    const subscores = computeOperationIntegrationSubscores(opMetrics, 0);
    expect(subscores.exampleCoverage).toBe(0);
  });

  it('should affect integration simplicity score positively with examples', async () => {
    const docWith = makeDocument({
      requestExample: true,
      responseExample: true,
      hasRequestBody: true,
    });
    const docWithout = makeDocument({
      requestExample: false,
      responseExample: false,
      hasRequestBody: true,
    });

    const metricsWithExamples = (await collectDocumentMetrics(docWith)).operations.get(
      'createItem'
    )!;
    const metricsWithout = (await collectDocumentMetrics(docWithout)).operations.get('createItem')!;

    const subWith = computeOperationIntegrationSubscores(metricsWithExamples, 0);
    const subWithout = computeOperationIntegrationSubscores(metricsWithout, 0);

    const scoreWith = computeIntegrationSimplicity(subWith);
    const scoreWithout = computeIntegrationSimplicity(subWithout);

    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('should affect agent readiness score positively with examples', async () => {
    const docWith = makeDocument({
      requestExample: true,
      responseExample: true,
      hasRequestBody: true,
    });
    const docWithout = makeDocument({
      requestExample: false,
      responseExample: false,
      hasRequestBody: true,
    });

    const metricsWithExamples = (await collectDocumentMetrics(docWith)).operations.get(
      'createItem'
    )!;
    const metricsWithout = (await collectDocumentMetrics(docWithout)).operations.get('createItem')!;

    const subWith = computeOperationAgentSubscores(metricsWithExamples, 0);
    const subWithout = computeOperationAgentSubscores(metricsWithout, 0);

    const scoreWith = computeAgentReadiness(subWith);
    const scoreWithout = computeAgentReadiness(subWithout);

    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('should handle examples via examples map', async () => {
    const doc = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object' },
                  examples: {
                    sample: { value: { name: 'test' } },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                    examples: {
                      result: { value: { id: '1' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const metrics = await collectDocumentMetrics(doc);
    const opMetrics = metrics.operations.get('createItem')!;
    expect(opMetrics.requestExamplePresent).toBe(true);
    expect(opMetrics.responseExamplePresent).toBe(true);
  });
});
