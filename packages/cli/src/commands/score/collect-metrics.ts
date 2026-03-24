import {
  normalizeTypes,
  getTypes,
  normalizeVisitors,
  walkDocument,
  resolveDocument,
  BaseResolver,
  Source,
  type Document,
  type SpecVersion,
  type WalkContext,
} from '@redocly/openapi-core';

import {
  createScoreAccumulator,
  createScoreVisitor,
  createSchemaWalkState,
  resetSchemaWalkState,
  createSchemaMetricVisitor,
  getDocumentMetrics,
} from './collectors/document-metrics.js';
import type { DebugMediaTypeLog, DocumentMetrics } from './types.js';

function resolveJsonPointer(root: any, ref: string): any {
  if (!ref.startsWith('#/')) return undefined;
  let node = root;
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[decodeURIComponent(segment)];
  }
  return node;
}

interface SchemaStats {
  maxDepth: number;
  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;
  propertyCount: number;
  totalSchemaProperties: number;
  schemaPropertiesWithDescription: number;
  constraintCount: number;
  hasPropertyExamples: boolean;
  writableTopLevelFields: number;
  refsUsed: string[];
  debugEntries?: import('./types.js').DebugSchemaEntry[];
}

function combineOneOfStats(
  parent: SchemaStats,
  branch: SchemaStats,
  branchCount: number,
  keyword: 'oneOf' | 'anyOf'
): SchemaStats {
  return {
    maxDepth: Math.max(parent.maxDepth, branch.maxDepth + 1),
    polymorphismCount: parent.polymorphismCount + branch.polymorphismCount + branchCount,
    anyOfCount: parent.anyOfCount + branch.anyOfCount + (keyword === 'anyOf' ? branchCount : 0),
    hasDiscriminator: parent.hasDiscriminator || branch.hasDiscriminator,
    propertyCount: parent.propertyCount + branch.propertyCount,
    totalSchemaProperties: parent.totalSchemaProperties + branch.totalSchemaProperties,
    schemaPropertiesWithDescription:
      parent.schemaPropertiesWithDescription + branch.schemaPropertiesWithDescription,
    constraintCount: parent.constraintCount + branch.constraintCount,
    hasPropertyExamples: parent.hasPropertyExamples || branch.hasPropertyExamples,
    writableTopLevelFields: parent.writableTopLevelFields + branch.writableTopLevelFields,
    refsUsed: [...parent.refsUsed, ...branch.refsUsed],
    debugEntries:
      parent.debugEntries || branch.debugEntries
        ? [...(parent.debugEntries ?? []), ...(branch.debugEntries ?? [])]
        : undefined,
  };
}

export interface CollectMetricsOptions {
  document: Document;
  types: ReturnType<typeof normalizeTypes>;
  resolvedRefMap: ReturnType<typeof resolveDocument> extends Promise<infer R> ? R : never;
  ctx: WalkContext;
  debugOperationId?: string;
}

export interface CollectMetricsResult {
  metrics: DocumentMetrics;
  debugLogs: DebugMediaTypeLog[];
}

export function collectMetrics({
  document,
  types,
  resolvedRefMap,
  ctx,
  debugOperationId,
}: CollectMetricsOptions): CollectMetricsResult {
  const schemaWalkState = createSchemaWalkState();
  const schemaVisitor = createSchemaMetricVisitor(schemaWalkState);
  const normalizedSchemaVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'score-schema', visitor: schemaVisitor as any }],
    types
  );

  const walkSchemaRaw = (schemaNode: any, debug: boolean): SchemaStats => {
    resetSchemaWalkState(schemaWalkState);
    if (debug) schemaWalkState.debugEntries = [];
    walkDocument({
      document: { ...document, parsed: schemaNode },
      rootType: types.Schema,
      normalizedVisitors: normalizedSchemaVisitors,
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
      debugEntries: debug ? (schemaWalkState.debugEntries ?? undefined) : undefined,
    };
  };

  const schemaCache = new Map<string, SchemaStats>();

  const walkSchema = (schemaNode: any, debug = false): SchemaStats => {
    let resolved = schemaNode;
    const ref: string | undefined =
      schemaNode?.$ref && typeof schemaNode.$ref === 'string' ? schemaNode.$ref : undefined;

    if (ref) {
      if (!debug) {
        const cached = schemaCache.get(ref);
        if (cached) return cached;
      }
      resolved = resolveJsonPointer(document.parsed, ref) ?? schemaNode;
    }

    const polyKeyword: 'oneOf' | 'anyOf' | null =
      Array.isArray(resolved?.oneOf) && resolved.oneOf.length > 1
        ? 'oneOf'
        : Array.isArray(resolved?.anyOf) && resolved.anyOf.length > 1
          ? 'anyOf'
          : null;

    let result: SchemaStats;

    if (polyKeyword && !resolved.allOf) {
      const branches = resolved[polyKeyword] as any[];

      const parentOnly = { ...resolved };
      delete parentOnly[polyKeyword];
      delete parentOnly.discriminator;

      let maxBranch = walkSchema(branches[0], debug);
      for (let i = 1; i < branches.length; i++) {
        const branchStats = walkSchema(branches[i], debug);
        if (branchStats.propertyCount > maxBranch.propertyCount) {
          maxBranch = branchStats;
        }
      }

      const parentStats = walkSchemaRaw(parentOnly, debug);

      result = combineOneOfStats(parentStats, maxBranch, branches.length, polyKeyword);
    } else {
      result = walkSchemaRaw(schemaNode, debug);
    }

    if (ref && !debug) {
      schemaCache.set(ref, result);
    }

    return result;
  };

  const accumulator = createScoreAccumulator(walkSchema, debugOperationId);
  const scoreVisitor = createScoreVisitor(accumulator);

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'score', visitor: scoreVisitor as any }],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });

  return {
    metrics: getDocumentMetrics(accumulator),
    debugLogs: accumulator.debugLogs,
  };
}

/**
 * Convenience wrapper that resolves a parsed OpenAPI document and collects metrics.
 * Useful in tests and standalone usage where you don't already have resolved types.
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
