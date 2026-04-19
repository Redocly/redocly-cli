import {
  type normalizeTypes,
  normalizeVisitors,
  walkDocument,
  type resolveDocument,
  isPlainObject,
  isRef,
  isMappingRef,
  unescapePointerFragment,
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
} from './collectors/document-metrics.js';
import type { DebugMediaTypeLog, DocumentMetrics, SchemaStats } from './types.js';

function resolveJsonPointer(root: any, ref: string): any {
  if (!ref.startsWith('#/')) return undefined;
  let node = root;
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[unescapePointerFragment(segment)];
  }
  return node;
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
    [{ severity: 'warn', ruleId: 'score-schema', visitor: schemaVisitor }],
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
    const { depth: _, pendingRef: __, debugEntries: _debug, ...stats } = schemaWalkState;
    return {
      ...stats,
      refsUsed: [...schemaWalkState.refsUsed],
      debugEntries: debug ? (schemaWalkState.debugEntries ?? undefined) : undefined,
    };
  };

  const schemaCache = new Map<string, SchemaStats>();
  const computing = new WeakSet<object>();

  const emptyStats: SchemaStats = {
    maxDepth: 0,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,
    totalSchemaProperties: 0,
    schemaPropertiesWithDescription: 0,
    constraintCount: 0,
    hasPropertyExamples: false,
    writableTopLevelFields: 0,
    refsUsed: [],
  };

  function addStats(a: SchemaStats, b: SchemaStats): SchemaStats {
    return {
      maxDepth: Math.max(a.maxDepth, b.maxDepth),
      polymorphismCount: a.polymorphismCount + b.polymorphismCount,
      anyOfCount: a.anyOfCount + b.anyOfCount,
      hasDiscriminator: a.hasDiscriminator || b.hasDiscriminator,
      totalSchemaProperties: a.totalSchemaProperties + b.totalSchemaProperties,
      schemaPropertiesWithDescription:
        a.schemaPropertiesWithDescription + b.schemaPropertiesWithDescription,
      constraintCount: a.constraintCount + b.constraintCount,
      hasPropertyExamples: a.hasPropertyExamples || b.hasPropertyExamples,
      writableTopLevelFields: a.writableTopLevelFields + b.writableTopLevelFields,
      refsUsed: [...a.refsUsed, ...b.refsUsed],
      debugEntries:
        a.debugEntries || b.debugEntries
          ? [...(a.debugEntries ?? []), ...(b.debugEntries ?? [])]
          : undefined,
    };
  }

  const walkSchema = (schemaNode: any, debug = false): SchemaStats => {
    let resolved = schemaNode;
    const ref: string | undefined = isRef(schemaNode) ? schemaNode.$ref : undefined;

    if (ref) {
      if (!debug) {
        const cached = schemaCache.get(ref);
        if (cached) return cached;
      }
      resolved = resolveJsonPointer(document.parsed, ref) ?? schemaNode;
    }

    if (isPlainObject(resolved) && computing.has(resolved)) {
      return { ...emptyStats };
    }
    if (isPlainObject(resolved)) {
      computing.add(resolved);
    }

    const oneOfBranches = resolved?.oneOf;
    const anyOfBranches = resolved?.anyOf;
    const hasOneOfPoly = Array.isArray(oneOfBranches) && oneOfBranches.length > 1;
    const hasAnyOfPoly = Array.isArray(anyOfBranches) && anyOfBranches.length > 1;
    /** True when we peel off multi-branch oneOf/anyOf for max-branch walks (may be both). */
    const hasPolyComposition = hasOneOfPoly || hasAnyOfPoly;

    const hasAllOf = Array.isArray(resolved?.allOf) && resolved.allOf.length > 0;

    const disc = resolved?.discriminator;
    const discriminatorRefs =
      !hasPolyComposition && isPlainObject(disc?.mapping)
        ? Object.values(disc.mapping)
            .filter((v): v is string => typeof v === 'string' && isMappingRef(v))
            .map((v) => ({ $ref: v }))
        : null;
    const hasDiscriminatorBranches =
      Array.isArray(discriminatorRefs) && discriminatorRefs.length > 0;

    let result: SchemaStats;

    if (hasPolyComposition || hasAllOf || hasDiscriminatorBranches) {
      const parentOnly = { ...resolved };

      let polyStats: SchemaStats | null = null;

      const mergePolyPart = (part: SchemaStats) => {
        polyStats = polyStats ? addStats(polyStats, part) : part;
      };

      const maxBranchPolyStats = (
        polyKeyword: 'oneOf' | 'anyOf',
        polyBranches: any[]
      ): SchemaStats => {
        let maxBranch = walkSchema(polyBranches[0], debug);
        for (let i = 1; i < polyBranches.length; i++) {
          const branchStats = walkSchema(polyBranches[i], debug);
          if (branchStats.totalSchemaProperties > maxBranch.totalSchemaProperties) {
            maxBranch = branchStats;
          }
        }
        return {
          ...maxBranch,
          polymorphismCount: maxBranch.polymorphismCount + polyBranches.length,
          anyOfCount: maxBranch.anyOfCount + (polyKeyword === 'anyOf' ? polyBranches.length : 0),
          hasDiscriminator: maxBranch.hasDiscriminator || !!disc,
        };
      };

      if (hasPolyComposition) {
        delete parentOnly.discriminator;
      }
      if (hasOneOfPoly) {
        delete parentOnly.oneOf;
        mergePolyPart(maxBranchPolyStats('oneOf', oneOfBranches));
      }
      if (hasAnyOfPoly) {
        delete parentOnly.anyOf;
        mergePolyPart(maxBranchPolyStats('anyOf', anyOfBranches));
      }

      let discStats: SchemaStats | null = null;
      if (hasDiscriminatorBranches) {
        delete parentOnly.discriminator;

        let maxBranch = walkSchema(discriminatorRefs[0], debug);
        for (let i = 1; i < discriminatorRefs.length; i++) {
          const branchStats = walkSchema(discriminatorRefs[i], debug);
          if (branchStats.totalSchemaProperties > maxBranch.totalSchemaProperties) {
            maxBranch = branchStats;
          }
        }
        discStats = {
          ...maxBranch,
          polymorphismCount: maxBranch.polymorphismCount + discriminatorRefs.length,
          hasDiscriminator: true,
        };
      }

      let allOfStats: SchemaStats | null = null;
      if (hasAllOf) {
        delete parentOnly.allOf;
        allOfStats = { ...emptyStats };
        for (const member of resolved.allOf) {
          allOfStats = addStats(allOfStats, walkSchema(member, debug));
        }
        allOfStats.polymorphismCount += resolved.allOf.length;
      }

      const parentStats = walkSchemaRaw(parentOnly, debug);
      result = parentStats;
      if (allOfStats) result = addStats(result, allOfStats);
      if (polyStats) result = addStats(result, polyStats);
      if (discStats) result = addStats(result, discStats);

      if (ref) {
        result = { ...result, refsUsed: [ref, ...result.refsUsed] };
      }
    } else {
      result = walkSchemaRaw(schemaNode, debug);
    }

    if (isPlainObject(resolved)) {
      computing.delete(resolved);
    }
    if (ref && !debug) {
      schemaCache.set(ref, result);
    }

    return result;
  };

  const accumulator = createScoreAccumulator(walkSchema, debugOperationId);
  const scoreVisitor = createScoreVisitor(accumulator);

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'score', visitor: scoreVisitor }],
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
