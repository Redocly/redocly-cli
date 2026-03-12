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
  getDocumentMetrics,
} from '../collectors/document-metrics.js';
import type { DocumentMetrics } from '../types.js';

export async function collectDocumentMetrics(
  doc: Record<string, unknown>
): Promise<DocumentMetrics> {
  const types = normalizeTypes(getTypes('oas3_0'), {});
  const accumulator = createScoreAccumulator();
  const visitor = createScoreVisitor(accumulator);
  const normalizedVis = normalizeVisitors([{ severity: 'warn', ruleId: 'test', visitor }], types);
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
  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizedVis,
    resolvedRefMap,
    ctx,
  });
  return getDocumentMetrics(accumulator);
}
