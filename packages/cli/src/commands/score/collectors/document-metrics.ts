import type {
  Oas3Visitor,
  UserContext,
  Oas3PathItem,
  Oas3Operation,
  Oas3Parameter,
  Oas3Schema,
  Oas3_1Schema,
  Referenced,
} from '@redocly/openapi-core';

import { AMBIGUOUS_PARAM_NAMES } from '../constants.js';
import type {
  DebugMediaTypeLog,
  DebugSchemaEntry,
  DocumentMetrics,
  OperationMetrics,
} from '../types.js';

type Schema = Oas3Schema | Oas3_1Schema;
type Param = Oas3Parameter<Schema>;
type ResolveFn = UserContext['resolve'];

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
  propertyCount: number;
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
    propertyCount: 0,
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
  s.depth = -1; // starts at -1 because the root Schema.enter increments to 0

  s.maxDepth = 0;
  s.polymorphismCount = 0;
  s.anyOfCount = 0;
  s.hasDiscriminator = false;
  s.propertyCount = 0;
  s.totalSchemaProperties = 0;
  s.schemaPropertiesWithDescription = 0;
  s.constraintCount = 0;
  s.hasPropertyExamples = false;
  s.writableTopLevelFields = 0;
  s.refsUsed = [];
  s.debugEntries = null;
  s.pendingRef = null;
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
        if (schema.properties && typeof schema.properties === 'object') {
          const props = Object.entries(schema.properties) as [string, any][];
          state.totalSchemaProperties += props.length;
          state.propertyCount += props.length;

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
  debugEntries?: DebugSchemaEntry[];
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
  propertyCount: number;
  totalSchemaProperties: number;
  schemaPropertiesWithDescription: number;
  constraintCount: number;
  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;

  writableTopLevelFieldCount: number;

  requestBodyPresent: boolean;
  requestExamplePresent: boolean;
  responseExamplePresent: boolean;
  structuredErrorResponseCount: number;
  totalErrorResponses: number;

  inRequestBody: boolean;
  inResponse: boolean;
  currentResponseCode: string;

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
    propertyCount: 0,
    totalSchemaProperties: 0,
    schemaPropertiesWithDescription: 0,
    constraintCount: 0,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,

    writableTopLevelFieldCount: 0,

    requestBodyPresent: false,
    requestExamplePresent: false,
    responseExamplePresent: false,
    structuredErrorResponseCount: 0,
    totalErrorResponses: 0,

    inRequestBody: false,
    inResponse: false,
    currentResponseCode: '',

    refsUsed: new Set(),
  };
}

function buildOperationMetrics(ctx: CurrentOperationContext): OperationMetrics {
  return {
    path: ctx.path,
    method: ctx.method,
    operationId: ctx.operationId,
    parameterCount: ctx.parameterCount,
    requiredParameterCount: ctx.requiredParameterCount,
    paramsWithDescription: ctx.paramsWithDescription,
    requestBodyPresent: ctx.requestBodyPresent,
    topLevelWritableFieldCount: ctx.writableTopLevelFieldCount,
    maxRequestSchemaDepth: ctx.maxRequestSchemaDepth,
    maxResponseSchemaDepth: ctx.maxResponseSchemaDepth,
    polymorphismCount: ctx.polymorphismCount,
    anyOfCount: ctx.anyOfCount,
    hasDiscriminator: ctx.hasDiscriminator,
    propertyCount: ctx.propertyCount,
    operationDescriptionPresent: ctx.operationDescriptionPresent,
    schemaPropertiesWithDescription: ctx.schemaPropertiesWithDescription,
    totalSchemaProperties: ctx.totalSchemaProperties,
    constraintCount: ctx.constraintCount,
    requestExamplePresent: ctx.requestExamplePresent,
    responseExamplePresent: ctx.responseExamplePresent,
    structuredErrorResponseCount: ctx.structuredErrorResponseCount,
    totalErrorResponses: ctx.totalErrorResponses,
    ambiguousIdentifierCount: ctx.ambiguousIdentifierCount,
    refsUsed: ctx.refsUsed,
  };
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

        if (isErrorCode(code)) {
          current.totalErrorResponses++;
          if (!response.content && response.description) {
            current.structuredErrorResponseCount++;
          }
        }
      },
      leave() {
        if (accumulator.current) accumulator.current.inResponse = false;
      },
    },
    MediaType: {
      enter(
        mediaType: { schema?: any; example?: unknown; examples?: Record<string, unknown> },
        _ctx: UserContext
      ) {
        const current = accumulator.current;
        if (!current) return;

        if (hasExample(mediaType)) {
          if (current.inRequestBody) current.requestExamplePresent = true;
          if (current.inResponse) current.responseExamplePresent = true;
        }

        if (current.inResponse && isErrorCode(current.currentResponseCode)) {
          current.structuredErrorResponseCount++;
        }

        if (mediaType.schema) {
          const isDebugTarget =
            !!accumulator.debugOperationId &&
            (current.operationId === accumulator.debugOperationId ||
              `${current.method.toUpperCase()} ${current.path}` === accumulator.debugOperationId);

          const stats = accumulator.walkSchema(mediaType.schema, isDebugTarget);

          current.propertyCount = Math.max(current.propertyCount, stats.propertyCount);
          current.totalSchemaProperties = Math.max(
            current.totalSchemaProperties,
            stats.totalSchemaProperties
          );
          current.schemaPropertiesWithDescription = Math.max(
            current.schemaPropertiesWithDescription,
            stats.schemaPropertiesWithDescription
          );
          current.constraintCount = Math.max(current.constraintCount, stats.constraintCount);
          current.polymorphismCount = Math.max(current.polymorphismCount, stats.polymorphismCount);
          current.anyOfCount = Math.max(current.anyOfCount, stats.anyOfCount);
          if (stats.hasDiscriminator) current.hasDiscriminator = true;

          for (const ref of stats.refsUsed) current.refsUsed.add(ref);

          if (stats.hasPropertyExamples) {
            if (current.inRequestBody) current.requestExamplePresent = true;
            if (current.inResponse) current.responseExamplePresent = true;
          }

          if (current.inRequestBody) {
            current.maxRequestSchemaDepth = Math.max(current.maxRequestSchemaDepth, stats.maxDepth);
            current.writableTopLevelFieldCount = Math.max(
              current.writableTopLevelFieldCount,
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
              totalProperties: stats.propertyCount,
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

function hasExample(mediaType: { example?: unknown; examples?: Record<string, unknown> }): boolean {
  if (mediaType.example !== undefined) return true;
  if (mediaType.examples && typeof mediaType.examples === 'object') {
    return Object.keys(mediaType.examples).length > 0;
  }
  return false;
}

function isAmbiguousParam(param: Param): boolean {
  if (param.description) return false;
  const name = (param.name ?? '').toLowerCase();
  return AMBIGUOUS_PARAM_NAMES.has(name);
}

function isErrorCode(code: string): boolean {
  if (code === 'default') return true;
  const num = parseInt(code, 10);
  return num >= 400 && num < 600;
}
