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
import type { DocumentMetrics, OperationMetrics } from '../types.js';

type Schema = Oas3Schema | Oas3_1Schema;
type Param = Oas3Parameter<Schema>;

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

interface CurrentOperationContext {
  path: string;
  method: string;
  operationId?: string;
  operationDescriptionPresent: boolean;

  parameterCount: number;
  requiredParameterCount: number;
  paramsWithDescription: number;
  ambiguousIdentifierCount: number;

  schemaDepth: number;
  maxRequestSchemaDepth: number;
  maxResponseSchemaDepth: number;
  propertyCount: number;
  totalSchemaProperties: number;
  schemaPropertiesWithDescription: number;
  constraintCount: number;
  propertiesWithExamples: number;
  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;

  currentMediaTypeWritableFields: number;
  writableTopLevelFieldCount: number;

  requestBodyPresent: boolean;
  requestExamplePresent: boolean;
  responseExamplePresent: boolean;
  structuredErrorResponseCount: number;
  totalErrorResponses: number;

  inRequestBody: boolean;
  inResponse: boolean;
  inMediaType: boolean;
  currentResponseCode: string;

  refsUsed: Set<string>;
}

export interface ScoreAccumulator {
  operations: Map<string, OperationMetrics>;
  currentPath: string;
  pathLevelParams: Array<Referenced<Param>>;
  current: CurrentOperationContext | null;
}

export function createScoreAccumulator(): ScoreAccumulator {
  return {
    operations: new Map(),
    currentPath: '',
    pathLevelParams: [],
    current: null,
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

    schemaDepth: 0,
    maxRequestSchemaDepth: 0,
    maxResponseSchemaDepth: 0,
    propertyCount: 0,
    totalSchemaProperties: 0,
    schemaPropertiesWithDescription: 0,
    constraintCount: 0,
    propertiesWithExamples: 0,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,

    currentMediaTypeWritableFields: 0,
    writableTopLevelFieldCount: 0,

    requestBodyPresent: false,
    requestExamplePresent: false,
    responseExamplePresent: false,
    structuredErrorResponseCount: 0,
    totalErrorResponses: 0,

    inRequestBody: false,
    inResponse: false,
    inMediaType: false,
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
    ref: {
      enter(ref) {
        accumulator.current?.refsUsed.add(ref.$ref);
      },
    },
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
      enter(mediaType: { example?: unknown; examples?: Record<string, unknown> }) {
        const current = accumulator.current;
        if (!current) return;
        current.inMediaType = true;
        current.schemaDepth = 0;

        if (current.inRequestBody) {
          current.currentMediaTypeWritableFields = 0;
        }

        if (hasExample(mediaType)) {
          if (current.inRequestBody) current.requestExamplePresent = true;
          if (current.inResponse) current.responseExamplePresent = true;
        }

        if (current.inResponse && isErrorCode(current.currentResponseCode)) {
          current.structuredErrorResponseCount++;
        }
      },
      leave() {
        const current = accumulator.current;
        if (!current) return;
        if (current.inRequestBody) {
          current.writableTopLevelFieldCount = Math.max(
            current.writableTopLevelFieldCount,
            current.currentMediaTypeWritableFields
          );
        }
        current.inMediaType = false;
      },
    },
    SchemaProperties: {
      enter(properties: Record<string, Referenced<Schema>>, ctx: UserContext) {
        const current = accumulator.current;
        if (!current?.inMediaType) return;

        const entries = Object.values(properties);
        current.totalSchemaProperties += entries.length;
        current.propertyCount += entries.length;

        const isRootLevel = current.schemaDepth === 1;

        for (const prop of entries) {
          const resolved =
            '$ref' in prop && prop.$ref
              ? (ctx.resolve(prop).node ?? (prop as Schema))
              : (prop as Schema);

          if (resolved.description) current.schemaPropertiesWithDescription++;
          if (resolved.example !== undefined || ('examples' in resolved && resolved.examples)) {
            current.propertiesWithExamples++;
          }
          if (isRootLevel && current.inRequestBody && !resolved.readOnly) {
            current.currentMediaTypeWritableFields++;
          }
        }

        if (current.propertiesWithExamples > 0) {
          if (current.inRequestBody) current.requestExamplePresent = true;
          if (current.inResponse) current.responseExamplePresent = true;
        }
      },
    },
    Schema: {
      enter(schema: Schema) {
        const current = accumulator.current;
        if (!current?.inMediaType) return;
        current.schemaDepth++;

        if (current.inRequestBody) {
          current.maxRequestSchemaDepth = Math.max(
            current.maxRequestSchemaDepth,
            current.schemaDepth - 1
          );
        }
        if (current.inResponse) {
          current.maxResponseSchemaDepth = Math.max(
            current.maxResponseSchemaDepth,
            current.schemaDepth - 1
          );
        }

        for (const key of CONSTRAINT_KEYS) {
          if ((schema as Record<string, unknown>)[key] !== undefined) {
            current.constraintCount++;
          }
        }

        if (schema.discriminator?.propertyName) {
          current.hasDiscriminator = true;
        }

        if (Array.isArray(schema.oneOf)) {
          current.polymorphismCount += schema.oneOf.length;
        }
        if (Array.isArray(schema.anyOf)) {
          current.polymorphismCount += schema.anyOf.length;
          current.anyOfCount += schema.anyOf.length;
        }
        if (Array.isArray(schema.allOf)) {
          current.polymorphismCount += schema.allOf.length;
        }
      },
      leave() {
        if (accumulator.current?.inMediaType) {
          accumulator.current.schemaDepth--;
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

function resolveParam(raw: Referenced<Param>, resolve: UserContext['resolve']): Param | undefined {
  return resolve<Param>(raw).node;
}

function mergeParameters(
  pathLevel: Array<Referenced<Param>>,
  opLevel: Array<Referenced<Param>>,
  resolve: UserContext['resolve']
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
