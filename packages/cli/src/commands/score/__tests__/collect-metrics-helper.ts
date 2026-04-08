import {
  normalizeTypes,
  getTypes,
  resolveDocument,
  BaseResolver,
  Source,
  type Document,
  type SpecVersion,
  type WalkContext,
} from '@redocly/openapi-core';

import { collectMetrics, type CollectMetricsResult } from '../collect-metrics.js';

/**
 * Convenience wrapper that resolves a parsed OpenAPI document and collects metrics.
 * Useful in tests where you don't already have resolved types.
 */
export async function collectDocumentMetrics(
  parsed: Record<string, unknown>,
  options?: { specVersion?: SpecVersion; debugOperationId?: string }
): Promise<CollectMetricsResult> {
  const specVersion: SpecVersion = options?.specVersion ?? 'oas3_0';
  const types = normalizeTypes(getTypes(specVersion), {});
  const source = new Source('score.yaml', JSON.stringify(parsed));
  const document: Document = { source, parsed };
  const externalRefResolver = new BaseResolver();
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx: WalkContext = { problems: [], specVersion, visitorsData: {} };

  return collectMetrics({
    document,
    types,
    resolvedRefMap,
    ctx,
    debugOperationId: options?.debugOperationId,
  });
}
