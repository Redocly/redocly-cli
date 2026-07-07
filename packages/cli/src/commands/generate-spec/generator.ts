import { logger } from '@redocly/openapi-core';

import { selectTrafficParser } from '../drift/log-formats/registry.js';
import type {
  NormalizedExchange,
  NormalizedHttpMessage,
  TrafficFormat,
} from '../drift/types/index.js';
import { listFilesRecursively } from '../drift/utils/files.js';
import {
  getPathWithoutTrailingSlash,
  isJsonMime,
  isSyntheticHost,
  normalizeContentType,
} from '../drift/utils/http.js';
import { normalizeServerPrefix, resolvePathForServer } from '../drift/utils/server.js';

export interface GenerateSpecOptions {
  trafficPath: string;
  format: TrafficFormat;
  title?: string;
  server?: string;
}

export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: JsonSchema;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
}

interface GeneratedParameter {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  schema: JsonSchema;
}

interface GeneratedResponse {
  description: string;
  content?: Record<string, { schema: JsonSchema }>;
}

interface GeneratedOperation {
  operationId: string;
  responses: Record<string, GeneratedResponse>;
  parameters?: GeneratedParameter[];
  requestBody?: { content: Record<string, { schema: JsonSchema }> };
}

export interface GeneratedDocument {
  openapi: string;
  info: { title: string; version: string };
  servers?: { url: string }[];
  paths: Record<string, Record<string, GeneratedOperation>>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;
// Crockford base32 (ULID alphabet, no I/L/O/U), e.g. 01ARZ3NDEKTSV4RRFFQ69G5FAV.
const ULID_RE = /^[0-9a-hjkmnp-tv-z]{26}$/i;
// Type-prefixed opaque token with at least one digit, e.g. org_01ks7rnqsyy0g6h37rfmen7zv9.
const PREFIXED_ID_RE = /^[a-z][a-z0-9]*_(?=[0-9a-z]*\d)[0-9a-z]{10,}$/i;
export const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'head',
  'options',
  'trace',
]);
const BODYLESS_METHODS = new Set(['get', 'head']);
const FORM_URLENCODED_MIME = 'application/x-www-form-urlencoded';

function looksLikeIdentifier(segment: string): boolean {
  if (!segment) return false;
  if (NUMERIC_RE.test(segment)) return true;
  if (UUID_RE.test(segment)) return true;
  if (ULID_RE.test(segment)) return true;
  if (PREFIXED_ID_RE.test(segment)) return true;
  // long hex / opaque token
  return /^[0-9a-f]{16,}$/i.test(segment);
}

function singularize(value: string): string {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.endsWith('s') && value.length > 1) return value.slice(0, -1);
  return value;
}

interface TemplatizedParam {
  name: string;
  value: string;
}

/**
 * Turn a concrete request path into an OpenAPI path template, replacing
 * identifier-like segments with named path parameters.
 */
export function templatizePath(rawPath: string): { template: string; params: TemplatizedParam[] } {
  const segments = rawPath.split('/');
  const params: TemplatizedParam[] = [];
  const used = new Set<string>();

  const templated = segments.map((segment, index) => {
    if (!looksLikeIdentifier(segment)) {
      return segment;
    }

    const previous = segments[index - 1];
    let name = previous ? `${singularize(previous)}Id` : 'id';
    let suffix = 1;
    while (used.has(name)) {
      suffix += 1;
      name = previous ? `${singularize(previous)}Id${suffix}` : `id${suffix}`;
    }
    used.add(name);
    params.push({ name, value: segment });
    return `{${name}}`;
  });

  return { template: templated.join('/') || '/', params };
}

export function inferSchema(value: unknown): JsonSchema {
  if (value === null) {
    return { type: 'null' };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array' };
    }
    const itemSchemas = value.slice(0, 20).map(inferSchema);
    return { type: 'array', items: mergeSchemas(itemSchemas) };
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string' };
    case 'boolean':
      return { type: 'boolean' };
    case 'number':
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
    case 'object': {
      const entries = Object.entries(value as Record<string, unknown>);

      // Objects keyed by identifiers (all-numeric or all-UUID keys) are maps,
      // not fixed shapes — describe them with additionalProperties.
      if (entries.length > 0) {
        const keysAreGeneric =
          entries.every(([key]) => NUMERIC_RE.test(key)) ||
          entries.every(([key]) => UUID_RE.test(key));
        if (keysAreGeneric) {
          return {
            type: 'object',
            additionalProperties: mergeSchemas(
              entries.map(([, propValue]) => inferSchema(propValue))
            ),
          };
        }
      }

      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, propValue] of entries) {
        properties[key] = inferSchema(propValue);
        required.push(key);
      }
      const schema: JsonSchema = { type: 'object', properties };
      if (required.length > 0) {
        schema.required = required;
      }
      return schema;
    }
    default:
      return {};
  }
}

/** Shallow merge of inferred schemas observed across multiple samples. */
export function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  if (schemas.length === 0) {
    return {};
  }

  const [first, ...rest] = schemas;
  let merged: JsonSchema = first;
  for (const next of rest) {
    merged = mergeTwo(merged, next);
  }
  return merged;
}

function isUnconstrainedSchema(schema: JsonSchema): boolean {
  return Object.keys(schema).length === 0;
}

type VariantKind = 'scalar' | 'object' | 'map' | 'array';

/**
 * A variant is a schema with a single `type` string and no `oneOf`. Divergent
 * observations are kept as separate variants so that alternative body shapes
 * survive to the generated description as `oneOf` instead of collapsing into
 * an unconstrained schema.
 */
function variantKind(variant: JsonSchema): VariantKind {
  if (variant.additionalProperties) {
    return 'map';
  }
  if (variant.type === 'object') {
    return 'object';
  }
  if (variant.type === 'array') {
    return 'array';
  }
  return 'scalar';
}

function toVariants(schema: JsonSchema): JsonSchema[] {
  if (schema.oneOf) {
    return schema.oneOf.flatMap(toVariants);
  }
  if (Array.isArray(schema.type)) {
    return schema.type.map((type): JsonSchema => {
      if (type === 'object') {
        const variant: JsonSchema = { type: 'object' };
        if (schema.properties) {
          variant.properties = schema.properties;
        }
        if (schema.required) {
          variant.required = schema.required;
        }
        if (schema.additionalProperties) {
          variant.additionalProperties = schema.additionalProperties;
        }
        return variant;
      }
      if (type === 'array') {
        return schema.items ? { type: 'array', items: schema.items } : { type: 'array' };
      }
      return { type };
    });
  }
  return [schema];
}

const OBJECT_MERGE_SIMILARITY = 0.5;
const MAX_OBJECT_VARIANTS = 3;

function objectSimilarity(a: JsonSchema, b: JsonSchema): number {
  const keysA = Object.keys(a.properties ?? {});
  const keysB = Object.keys(b.properties ?? {});
  // An object with no known properties is compatible with any shape.
  if (keysA.length === 0 || keysB.length === 0) {
    return 1;
  }
  const setB = new Set(keysB);
  const shared = keysA.filter((key) => setB.has(key)).length;
  return shared / (keysA.length + keysB.length - shared);
}

function areCompatibleVariants(a: JsonSchema, b: JsonSchema): boolean {
  const kind = variantKind(a);
  if (kind !== variantKind(b)) {
    return false;
  }
  switch (kind) {
    case 'scalar':
      return (
        a.type === b.type ||
        (a.type === 'integer' && b.type === 'number') ||
        (a.type === 'number' && b.type === 'integer')
      );
    case 'object':
      return objectSimilarity(a, b) >= OBJECT_MERGE_SIMILARITY;
    default:
      return true;
  }
}

function mergeVariantPair(a: JsonSchema, b: JsonSchema): JsonSchema {
  switch (variantKind(a)) {
    case 'scalar':
      return a.type === b.type ? a : { type: 'number' };
    case 'map':
      return {
        type: 'object',
        additionalProperties: mergeTwo(a.additionalProperties ?? {}, b.additionalProperties ?? {}),
      };
    case 'object': {
      const properties: Record<string, JsonSchema> = { ...(a.properties ?? {}) };
      for (const [key, schema] of Object.entries<JsonSchema>(b.properties ?? {})) {
        properties[key] = properties[key] ? mergeTwo(properties[key], schema) : schema;
      }
      // required = intersection of observed required sets
      const requiredB = new Set<string>(b.required ?? []);
      const required = (a.required ?? []).filter((key) => requiredB.has(key));
      const merged: JsonSchema = { type: 'object', properties };
      if (required.length > 0) {
        merged.required = required;
      }
      return merged;
    }
    case 'array': {
      if (!a.items || !b.items) {
        const items = a.items ?? b.items;
        return items ? { type: 'array', items } : { type: 'array' };
      }
      return { type: 'array', items: mergeTwo(a.items, b.items) };
    }
  }
}

function foldExcessObjectVariants(variants: JsonSchema[]): JsonSchema[] {
  const result = [...variants];
  const objectCount = () => result.filter((v) => variantKind(v) === 'object').length;
  while (objectCount() > MAX_OBJECT_VARIANTS) {
    let bestA = -1;
    let bestB = -1;
    let bestScore = -1;
    for (let i = 0; i < result.length; i++) {
      if (variantKind(result[i]) !== 'object') continue;
      for (let j = i + 1; j < result.length; j++) {
        if (variantKind(result[j]) !== 'object') continue;
        const score = objectSimilarity(result[i], result[j]);
        if (score > bestScore) {
          bestScore = score;
          bestA = i;
          bestB = j;
        }
      }
    }
    result[bestA] = mergeVariantPair(result[bestA], result[bestB]);
    result.splice(bestB, 1);
  }
  return result;
}

const SCALAR_TYPE_ORDER = ['boolean', 'integer', 'number', 'string', 'null'];

function finalizeVariants(variants: JsonSchema[]): JsonSchema {
  if (variants.length === 1) {
    return variants[0];
  }

  const structured: JsonSchema[] = [];
  const scalarTypes = new Set<string>();
  for (const variant of variants) {
    if (variantKind(variant) === 'scalar' && typeof variant.type === 'string') {
      scalarTypes.add(variant.type);
    } else {
      structured.push(variant);
    }
  }
  const orderedScalars = SCALAR_TYPE_ORDER.filter((type) => scalarTypes.has(type));

  if (structured.length === 0) {
    return orderedScalars.length === 1 ? { type: orderedScalars[0] } : { type: orderedScalars };
  }
  if (
    structured.length === 1 &&
    orderedScalars.length === 1 &&
    orderedScalars[0] === 'null' &&
    typeof structured[0].type === 'string'
  ) {
    return { ...structured[0], type: [structured[0].type, 'null'] };
  }

  const members = [...structured];
  if (orderedScalars.length === 1) {
    members.push({ type: orderedScalars[0] });
  } else if (orderedScalars.length > 1) {
    members.push({ type: orderedScalars });
  }
  return { oneOf: members };
}

function mergeTwo(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (isUnconstrainedSchema(a) || isUnconstrainedSchema(b)) {
    return {};
  }

  const variants = toVariants(a);
  for (const candidate of toVariants(b)) {
    const index = variants.findIndex((variant) => areCompatibleVariants(variant, candidate));
    if (index === -1) {
      variants.push(candidate);
    } else {
      variants[index] = mergeVariantPair(variants[index], candidate);
    }
  }
  return finalizeVariants(foldExcessObjectVariants(variants));
}

function sniffJson(bodyText: string | undefined): unknown {
  if (!bodyText) {
    return undefined;
  }

  const trimmed = bodyText.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

/**
 * Infer a body schema and the content type to file it under. JSON declared via
 * the content type wins; form-urlencoded bodies are parsed into flat objects;
 * undeclared JSON (e.g. sent as text/plain) is detected by sniffing the body.
 */
function inferBodySchema(
  message: NormalizedHttpMessage
): { mime: string; schema: JsonSchema } | undefined {
  const mime = normalizeContentType(message.contentType);

  if (message.bodyJson !== undefined) {
    return {
      mime: isJsonMime(mime) ? mime : 'application/json',
      schema: inferSchema(message.bodyJson),
    };
  }

  if (mime === FORM_URLENCODED_MIME && message.bodyText) {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of new URLSearchParams(message.bodyText)) {
      fields[key] = value;
    }
    if (Object.keys(fields).length === 0) {
      return undefined;
    }
    return { mime: FORM_URLENCODED_MIME, schema: inferSchema(fields) };
  }

  const sniffed = sniffJson(message.bodyText);
  if (sniffed !== undefined) {
    return { mime: 'application/json', schema: inferSchema(sniffed) };
  }

  return undefined;
}

interface ResponseAccumulator {
  statusText?: string;
  /** Content type → schema merged incrementally across all observed bodies. */
  bodies: Map<string, JsonSchema>;
}

interface OperationAccumulator {
  method: string;
  template: string;
  /** Parameter name → whether every observed value was numeric. */
  pathParams: Map<string, boolean>;
  queryParams: Map<string, boolean>;
  requestBodies: Map<string, JsonSchema>;
  responses: Map<string, ResponseAccumulator>;
}

function accumulateBodySchema(target: Map<string, JsonSchema>, mime: string, schema: JsonSchema) {
  const merged = target.get(mime);
  target.set(mime, merged ? mergeSchemas([merged, schema]) : schema);
}

/**
 * Generate an OpenAPI 3.1 document by observing recorded traffic. Returns the
 * document object; the caller decides whether to print it, write it, or hand it
 * to an AI provider for refinement.
 */
export async function generateSpecFromTraffic(
  options: GenerateSpecOptions
): Promise<GeneratedDocument> {
  const trafficFiles = await listFilesRecursively(options.trafficPath);
  if (trafficFiles.length === 0) {
    throw new Error('No traffic files found in the provided traffic path.');
  }

  const server = normalizeServerPrefix(options.server);
  const operations = new Map<string, OperationAccumulator>();
  const observedServers = new Set<string>();
  let supportedTrafficFileCount = 0;

  const observe = (exchange: NormalizedExchange) => {
    const method = exchange.request.method.toLowerCase();
    if (!HTTP_METHODS.has(method)) {
      return;
    }

    let rawPath = exchange.request.path || '/';
    if (server) {
      const serverRelativePath = resolvePathForServer(exchange.request, server);
      if (serverRelativePath === undefined) {
        return;
      }
      rawPath = serverRelativePath;
    } else if (exchange.request.host && !isSyntheticHost(exchange.request.host)) {
      observedServers.add(`${exchange.request.protocol}//${exchange.request.host}`);
    }

    const { template, params } = templatizePath(getPathWithoutTrailingSlash(rawPath));
    const key = `${method} ${template}`;
    let accumulator = operations.get(key);
    if (!accumulator) {
      accumulator = {
        method,
        template,
        pathParams: new Map(),
        queryParams: new Map(),
        requestBodies: new Map(),
        responses: new Map(),
      };
      operations.set(key, accumulator);
    }

    for (const { name, value } of params) {
      const wasNumeric = accumulator.pathParams.get(name);
      const isNumeric = NUMERIC_RE.test(value);
      accumulator.pathParams.set(
        name,
        wasNumeric === undefined ? isNumeric : wasNumeric && isNumeric
      );
    }
    for (const queryKey of new Set(exchange.request.query.keys())) {
      const values = exchange.request.query.getAll(queryKey);
      const wasNumeric = accumulator.queryParams.get(queryKey);
      const isNumeric = values.length > 0 && values.every((value) => NUMERIC_RE.test(value));
      accumulator.queryParams.set(
        queryKey,
        wasNumeric === undefined ? isNumeric : wasNumeric && isNumeric
      );
    }

    if (!BODYLESS_METHODS.has(method)) {
      const requestBody = inferBodySchema(exchange.request);
      if (requestBody) {
        accumulateBodySchema(accumulator.requestBodies, requestBody.mime, requestBody.schema);
      }
    }

    // Status codes below 100 (e.g. 0 in HAR) mean the response was never
    // received — they carry no information about the API's real responses.
    if (exchange.response && exchange.response.status >= 100) {
      const status = String(exchange.response.status);
      let responseAccumulator = accumulator.responses.get(status);
      if (!responseAccumulator) {
        responseAccumulator = { bodies: new Map() };
        accumulator.responses.set(status, responseAccumulator);
      }
      responseAccumulator.statusText ??= exchange.response.statusText || undefined;

      const responseBody = inferBodySchema(exchange.response);
      if (responseBody) {
        accumulateBodySchema(responseAccumulator.bodies, responseBody.mime, responseBody.schema);
      }
    }
  };

  for (const trafficFile of trafficFiles) {
    const parser = await selectTrafficParser(trafficFile, options.format);
    if (!parser) {
      logger.warn(`Skipping traffic file with unrecognized format: ${trafficFile}\n`);
      continue;
    }

    supportedTrafficFileCount += 1;
    for await (const exchange of parser.parse(trafficFile)) {
      observe(exchange);
    }
  }

  if (supportedTrafficFileCount === 0) {
    throw new Error('No supported traffic files found to generate an OpenAPI description from.');
  }

  if (operations.size === 0) {
    throw new Error(
      server
        ? `No HTTP exchanges in the traffic matched the server "${server}".`
        : 'No HTTP exchanges were observed in the traffic. Cannot generate an OpenAPI description.'
    );
  }

  const serverUrls = server ? [server] : Array.from(observedServers).sort();
  return buildDocument(operations, options.title ?? 'Generated API', serverUrls);
}

export function countOperations(document: GeneratedDocument): number {
  return Object.values(document.paths).reduce(
    (total, pathItem) => total + Object.keys(pathItem).length,
    0
  );
}

function buildDocument(
  operations: Map<string, OperationAccumulator>,
  title: string,
  serverUrls: string[]
): GeneratedDocument {
  const paths: Record<string, Record<string, GeneratedOperation>> = {};

  for (const accumulator of operations.values()) {
    const pathItem = (paths[accumulator.template] ??= {});

    const parameters: GeneratedParameter[] = [
      ...Array.from(accumulator.pathParams).map(
        ([name, numeric]): GeneratedParameter => ({
          name,
          in: 'path',
          required: true,
          schema: { type: numeric ? 'integer' : 'string' },
        })
      ),
      ...Array.from(accumulator.queryParams).map(
        ([name, numeric]): GeneratedParameter => ({
          name,
          in: 'query',
          required: false,
          schema: { type: numeric ? 'integer' : 'string' },
        })
      ),
    ];

    const operation: GeneratedOperation = {
      operationId: deriveOperationId(accumulator.method, accumulator.template),
      responses: {},
    };

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    if (accumulator.requestBodies.size > 0) {
      const content: Record<string, { schema: JsonSchema }> = {};
      for (const [mime, schema] of accumulator.requestBodies) {
        content[mime] = { schema };
      }
      operation.requestBody = { content };
    }

    if (accumulator.responses.size === 0) {
      operation.responses['default'] = { description: 'Observed response' };
    } else {
      for (const [status, responseAccumulator] of accumulator.responses) {
        const response: GeneratedResponse = {
          description: responseAccumulator.statusText || 'Observed response',
        };
        if (responseAccumulator.bodies.size > 0) {
          const content: Record<string, { schema: JsonSchema }> = {};
          for (const [mime, schema] of responseAccumulator.bodies) {
            content[mime] = { schema };
          }
          response.content = content;
        }
        operation.responses[status] = response;
      }
    }

    pathItem[accumulator.method] = operation;
  }

  return {
    openapi: '3.1.0',
    info: { title, version: '1.0.0' },
    ...(serverUrls.length > 0 ? { servers: serverUrls.map((url) => ({ url })) } : {}),
    paths,
  };
}

function deriveOperationId(method: string, template: string): string {
  const cleaned = template
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[{}]/g, ''))
    .join('-');
  return `${method}-${cleaned || 'root'}`;
}
