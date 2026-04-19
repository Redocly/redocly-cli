import {
  isNotEmptyObject,
  isPlainObject,
  type Oas3MediaType,
  type Oas3Visitor,
  type UserContext,
  type Oas3PathItem,
  type Oas3Operation,
  type Oas3Parameter,
  type Oas3Schema,
  type Oas3_1Schema,
  type Referenced,
} from '@redocly/openapi-core';

import { AMBIGUOUS_PARAM_NAMES, DEFAULT_SCORING_CONSTANTS } from '../constants.js';
import type {
  DebugMediaTypeLog,
  DebugSchemaEntry,
  DocumentMetrics,
  OperationMetrics,
  SchemaStats,
} from '../types.js';

type Schema = Oas3Schema | Oas3_1Schema;
type Param = Oas3Parameter<Schema>;
type ResolveFn = UserContext['resolve'];

const ANY_OF_PENALTY_MULTIPLIER = DEFAULT_SCORING_CONSTANTS.weights.anyOfPenaltyMultiplier;

/** Matches `effectivePolymorphism` in scoring.ts so operation rollup stays from one schema walk. */
function schemaEffectivePolymorphism(polymorphismCount: number, anyOfCount: number): number {
  const otherPoly = polymorphismCount - anyOfCount;
  return otherPoly + anyOfCount * ANY_OF_PENALTY_MULTIPLIER;
}

/** When two media types have the same property count, pick the triple with stronger doc + constraint signal. */
function propertyMetricsBundleScore(
  totalSchemaProperties: number,
  schemaPropertiesWithDescription: number,
  constraintCount: number
): number {
  const p = Math.max(1, totalSchemaProperties);
  return schemaPropertiesWithDescription / p + constraintCount / p;
}

function shouldReplacePropertyMetrics(
  current: CurrentOperationContext,
  stats: SchemaStats
): boolean {
  if (stats.totalSchemaProperties > current.totalSchemaProperties) return true;
  if (stats.totalSchemaProperties < current.totalSchemaProperties) return false;
  return (
    propertyMetricsBundleScore(
      stats.totalSchemaProperties,
      stats.schemaPropertiesWithDescription,
      stats.constraintCount
    ) >
    propertyMetricsBundleScore(
      current.totalSchemaProperties,
      current.schemaPropertiesWithDescription,
      current.constraintCount
    )
  );
}

const CONSTRAINT_KEYS: readonly string[] = [
  'enum',
  'const',
  'format',
  'pattern',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
  'multipleOf',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'uniqueItems',
];

export interface SchemaWalkState {
  depth: number;
  maxDepth: number;
  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;
  totalSchemaProperties: number;
  schemaPropertiesWithDescription: number;
  constraintCount: number;
  hasPropertyExamples: boolean;
  writableTopLevelFields: number;
  refsUsed: string[];
  debugEntries: DebugSchemaEntry[] | null;
  pendingRef: string | null;
}

export function createSchemaWalkState(): SchemaWalkState {
  return {
    depth: -1, // starts at -1 because the root Schema.enter increments to 0

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
    debugEntries: null,
    pendingRef: null,
  };
}

export function resetSchemaWalkState(s: SchemaWalkState): void {
  Object.assign(s, createSchemaWalkState());
}

export function createSchemaMetricVisitor(state: SchemaWalkState): Oas3Visitor {
  return {
    ref: {
      enter(ref: { $ref: string }) {
        if (typeof ref?.$ref === 'string') {
          state.refsUsed.push(ref.$ref);
          state.pendingRef = ref.$ref;
        }
      },
    },
    Schema: {
      enter(schema: any, ctx: UserContext) {
        state.depth++;
        state.maxDepth = Math.max(state.maxDepth, state.depth);

        let localConstraints = 0;
        for (const key of CONSTRAINT_KEYS) {
          if (schema[key] !== undefined) {
            state.constraintCount++;
            localConstraints++;
          }
        }

        if (schema.discriminator?.propertyName) state.hasDiscriminator = true;

        const localPoly: { oneOf?: number; anyOf?: number; allOf?: number } = {};
        for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
          const list = schema[keyword];
          if (!Array.isArray(list)) continue;
          state.polymorphismCount += list.length;
          if (keyword === 'anyOf') state.anyOfCount += list.length;
          localPoly[keyword] = list.length;
        }

        const localPropertyNames: string[] = [];
        if (isPlainObject(schema.properties)) {
          const props = Object.entries(schema.properties) as [string, any][];
          state.totalSchemaProperties += props.length;

          for (const [name, prop] of props) {
            localPropertyNames.push(name);
            const res =
              prop && '$ref' in prop && prop.$ref ? (ctx.resolve(prop)?.node ?? prop) : prop;
            if (res?.description) state.schemaPropertiesWithDescription++;
            if (res?.example !== undefined || res?.examples) state.hasPropertyExamples = true;
            if (!res?.readOnly) state.writableTopLevelFields++;
          }
        }

        if (state.debugEntries !== null) {
          state.debugEntries.push({
            ref: state.pendingRef,
            depth: state.depth,
            propertyNames: localPropertyNames,
            polymorphism: Object.keys(localPoly).length > 0 ? localPoly : {},
            constraintCount: localConstraints,
          });
        }

        state.pendingRef = null;
      },
      leave() {
        state.depth--;
      },
    },
  };
}

interface CurrentOperationContext {
  path: string;
  method: string;
  operationId?: string;
  operationDescriptionPresent: boolean;

  parameterCount: number;
  requiredParameterCount: number;
  paramsWithDescription: number;
  ambiguousIdentifierCount: number;

  maxRequestSchemaDepth: number;
  maxResponseSchemaDepth: number;
  totalSchemaProperties: number;
  schemaPropertiesWithDescription: number;
  constraintCount: number;
  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;

  topLevelWritableFieldCount: number;

  requestBodyPresent: boolean;
  requestExamplePresent: boolean;
  responseExamplePresent: boolean;
  structuredErrorResponseCount: number;
  totalErrorResponses: number;

  inRequestBody: boolean;
  inResponse: boolean;
  currentResponseCode: string;
  errorStructuredCounted: boolean;

  /** Internal: best schema walk for polymorphism + anyOf (see `schemaEffectivePolymorphism`). */
  maxEffectivePolymorphism: number;

  refsUsed: Set<string>;
}

export interface ScoreAccumulator {
  operations: Map<string, OperationMetrics>;
  currentPath: string;
  pathLevelParams: Array<Referenced<Param>>;
  current: CurrentOperationContext | null;
  walkSchema: (schema: any, debug?: boolean) => SchemaStats;
  debugOperationId?: string;
  debugLogs: DebugMediaTypeLog[];
}

export function createScoreAccumulator(
  walkSchema: (schema: any, debug?: boolean) => SchemaStats,
  debugOperationId?: string
): ScoreAccumulator {
  return {
    operations: new Map(),
    currentPath: '',
    pathLevelParams: [],
    current: null,
    walkSchema,
    debugOperationId,
    debugLogs: [],
  };
}

function createOperationContext(
  path: string,
  method: string,
  operation: Oas3Operation
): CurrentOperationContext {
  return {
    path,
    method,
    operationId: operation.operationId,
    operationDescriptionPresent: !!operation.description,

    parameterCount: 0,
    requiredParameterCount: 0,
    paramsWithDescription: 0,
    ambiguousIdentifierCount: 0,

    maxRequestSchemaDepth: 0,
    maxResponseSchemaDepth: 0,
    totalSchemaProperties: 0,
    schemaPropertiesWithDescription: 0,
    constraintCount: 0,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,

    topLevelWritableFieldCount: 0,

    requestBodyPresent: false,
    requestExamplePresent: false,
    responseExamplePresent: false,
    structuredErrorResponseCount: 0,
    totalErrorResponses: 0,

    inRequestBody: false,
    inResponse: false,
    currentResponseCode: '',
    errorStructuredCounted: false,

    maxEffectivePolymorphism: -1,

    refsUsed: new Set(),
  };
}

function buildOperationMetrics(ctx: CurrentOperationContext): OperationMetrics {
  const {
    inRequestBody: _1,
    inResponse: _2,
    currentResponseCode: _3,
    errorStructuredCounted: _4,
    maxEffectivePolymorphism: _5,
    ...metrics
  } = ctx;
  return metrics;
}

export function createScoreVisitor(accumulator: ScoreAccumulator): Oas3Visitor {
  return {
    RequestBody: {
      enter() {
        if (!accumulator.current) return;
        accumulator.current.requestBodyPresent = true;
        accumulator.current.inRequestBody = true;
      },
      leave() {
        if (accumulator.current) accumulator.current.inRequestBody = false;
      },
    },
    Response: {
      enter(
        response: { description?: string; content?: Record<string, unknown> },
        ctx: UserContext
      ) {
        const current = accumulator.current;
        if (!current) return;
        const code = String(ctx.key);
        current.inResponse = true;
        current.currentResponseCode = code;
        current.errorStructuredCounted = false;

        if (isErrorCode(code)) {
          current.totalErrorResponses++;
          if (!response.content && response.description) {
            current.structuredErrorResponseCount++;
            current.errorStructuredCounted = true;
          }
        }
      },
      leave() {
        if (accumulator.current) accumulator.current.inResponse = false;
      },
    },
    MediaType: {
      enter(mediaType) {
        const current = accumulator.current;
        if (!current) return;

        if (hasExample(mediaType)) {
          if (current.inRequestBody) current.requestExamplePresent = true;
          if (current.inResponse) current.responseExamplePresent = true;
        }

        if (
          current.inResponse &&
          isErrorCode(current.currentResponseCode) &&
          !current.errorStructuredCounted
        ) {
          current.structuredErrorResponseCount++;
          current.errorStructuredCounted = true;
        }

        if (mediaType.schema) {
          const isDebugTarget =
            !!accumulator.debugOperationId &&
            (current.operationId === accumulator.debugOperationId ||
              `${current.method.toUpperCase()} ${current.path}` === accumulator.debugOperationId);

          const stats = accumulator.walkSchema(mediaType.schema, isDebugTarget);

          if (shouldReplacePropertyMetrics(current, stats)) {
            current.totalSchemaProperties = stats.totalSchemaProperties;
            current.schemaPropertiesWithDescription = stats.schemaPropertiesWithDescription;
            current.constraintCount = stats.constraintCount;
          }

          const effective = schemaEffectivePolymorphism(stats.polymorphismCount, stats.anyOfCount);
          if (effective > current.maxEffectivePolymorphism) {
            current.maxEffectivePolymorphism = effective;
            current.polymorphismCount = stats.polymorphismCount;
            current.anyOfCount = stats.anyOfCount;
          }
          if (stats.hasDiscriminator) current.hasDiscriminator = true;

          for (const ref of stats.refsUsed) current.refsUsed.add(ref);

          if (stats.hasPropertyExamples) {
            if (current.inRequestBody) current.requestExamplePresent = true;
            if (current.inResponse) current.responseExamplePresent = true;
          }

          if (current.inRequestBody) {
            current.maxRequestSchemaDepth = Math.max(current.maxRequestSchemaDepth, stats.maxDepth);
            current.topLevelWritableFieldCount = Math.max(
              current.topLevelWritableFieldCount,
              stats.writableTopLevelFields
            );
          }
          if (current.inResponse) {
            current.maxResponseSchemaDepth = Math.max(
              current.maxResponseSchemaDepth,
              stats.maxDepth
            );
          }

          if (isDebugTarget && stats.debugEntries) {
            const context = current.inRequestBody
              ? 'REQUEST BODY'
              : `RESPONSE ${current.currentResponseCode}`;
            accumulator.debugLogs.push({
              context,
              entries: stats.debugEntries,
              totalProperties: stats.totalSchemaProperties,
              totalPolymorphism: stats.polymorphismCount,
              totalConstraints: stats.constraintCount,
              maxDepth: stats.maxDepth,
            });
          }
        }
      },
    },
    Paths: {
      PathItem: {
        enter(pathItem: Oas3PathItem, ctx: UserContext) {
          accumulator.currentPath = String(ctx.key);
          accumulator.pathLevelParams = pathItem.parameters ?? [];
        },
        Operation: {
          enter(operation: Oas3Operation, ctx: UserContext) {
            const method = String(ctx.key);
            const current = createOperationContext(accumulator.currentPath, method, operation);
            accumulator.current = current;

            const merged = mergeParameters(
              accumulator.pathLevelParams,
              operation.parameters ?? [],
              ctx.resolve
            );
            for (const param of merged.values()) {
              current.parameterCount++;
              if (param.required) current.requiredParameterCount++;
              if (param.description) current.paramsWithDescription++;
              if (isAmbiguousParam(param)) current.ambiguousIdentifierCount++;
            }
          },
          leave(operation: Oas3Operation) {
            const current = accumulator.current;
            if (!current) return;
            const opKey =
              operation.operationId ?? `${current.method.toUpperCase()} ${current.path}`;
            accumulator.operations.set(opKey, buildOperationMetrics(current));
            accumulator.current = null;
          },
        },
      },
    },
  };
}

export function getDocumentMetrics(accumulator: ScoreAccumulator): DocumentMetrics {
  return { operationCount: accumulator.operations.size, operations: accumulator.operations };
}

function resolveParam(raw: Referenced<Param>, resolve: ResolveFn): Param | undefined {
  return resolve<Param>(raw).node;
}

function mergeParameters(
  pathLevel: Array<Referenced<Param>>,
  opLevel: Array<Referenced<Param>>,
  resolve: ResolveFn
): Map<string, Param> {
  const merged = new Map<string, Param>();
  for (const raw of pathLevel) {
    const p = resolveParam(raw, resolve);
    if (p?.name && p.in) merged.set(`${p.in}:${p.name}`, p);
  }
  for (const raw of opLevel) {
    const p = resolveParam(raw, resolve);
    if (p?.name && p.in) merged.set(`${p.in}:${p.name}`, p);
  }
  return merged;
}

function hasExample(mediaType: Oas3MediaType): boolean {
  return mediaType.example !== undefined || isNotEmptyObject(mediaType.examples);
}

function isAmbiguousParam(param: Param): boolean {
  if (param.description) return false;
  const name = (param.name ?? '').toLowerCase();
  return AMBIGUOUS_PARAM_NAMES.has(name);
}

function isErrorCode(code: string): boolean {
  if (code === 'default') return true;
  // OpenAPI 3.1: status ranges 4XX / 5XX (see https://spec.openapis.org/oas/v3.1.0#patterned-fields)
  if (/^4xx$/i.test(code) || /^5xx$/i.test(code)) return true;
  const num = parseInt(code, 10);
  return num >= 400 && num < 600;
}
