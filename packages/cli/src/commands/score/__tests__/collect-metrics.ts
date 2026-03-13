import {
  normalizeTypes,
  getTypes,
  normalizeVisitors,
  walkDocument,
  resolveDocument,
  BaseResolver,
  Source,
} from '@redocly/openapi-core';
import type { Document, WalkContext } from '@redocly/openapi-core';

import {
  createScoreAccumulator,
  createScoreVisitor,
  createSchemaWalkState,
  resetSchemaWalkState,
  createSchemaMetricVisitor,
  getDocumentMetrics,
} from '../collectors/document-metrics.js';
import type { DocumentMetrics } from '../types.js';

export async function collectDocumentMetrics(
  doc: Record<string, unknown>
): Promise<DocumentMetrics> {
  const types = normalizeTypes(getTypes('oas3_0'), {});
  const source = new Source('test.yaml', JSON.stringify(doc));
  const document: Document = { source, parsed: doc };
  const externalRefResolver = new BaseResolver();
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx: WalkContext = {
    problems: [],
    specVersion: 'oas3_0',
    visitorsData: {},
  };

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
