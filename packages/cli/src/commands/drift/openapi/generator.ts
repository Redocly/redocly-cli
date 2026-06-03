import { loadTrafficParsers, selectTrafficParser } from '../log-formats/registry.js';
import { listFilesRecursively } from '../utils/files.js';
import { isJsonMime } from '../utils/http.js';
import type { NormalizedExchange, TrafficFormat } from '../types/index.js';

export interface GenerateSpecOptions {
  trafficPath: string;
  format: TrafficFormat;
  trafficParserModules?: string[];
  title?: string;
}

type JsonSchema = Record<string, any>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace']);

function looksLikeIdentifier(segment: string): boolean {
  if (!segment) return false;
  if (/^\d+$/.test(segment)) return true;
  if (UUID_RE.test(segment)) return true;
  // long hex / opaque token
  return /^[0-9a-f]{16,}$/i.test(segment);
}

function singularize(value: string): string {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.endsWith('s') && value.length > 1) return value.slice(0, -1);
  return value;
}

/**
 * Turn a concrete request path into an OpenAPI path template, replacing
 * identifier-like segments with named path parameters.
 */
function templatizePath(rawPath: string): { template: string; params: string[] } {
  const segments = rawPath.split('/');
  const params: string[] = [];
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
    params.push(name);
    return `{${name}}`;
  });

  return { template: templated.join('/') || '/', params };
}

function inferSchema(value: unknown): JsonSchema {
  if (value === null) {
    return { type: 'null' };
  }

  if (Array.isArray(value)) {
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
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, propValue] of Object.entries(value as Record<string, unknown>)) {
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
function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const nonEmpty = schemas.filter((schema) => Object.keys(schema).length > 0);
  if (nonEmpty.length === 0) {
    return {};
  }

  const [first, ...rest] = nonEmpty;
  let merged: JsonSchema = first;
  for (const next of rest) {
    merged = mergeTwo(merged, next);
  }
  return merged;
}

function mergeTwo(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (a.type !== b.type) {
    // Divergent types — fall back to an unconstrained schema for the PoC.
    return {};
  }

  if (a.type === 'object') {
    const properties: Record<string, JsonSchema> = { ...(a.properties ?? {}) };
    for (const [key, schema] of Object.entries<JsonSchema>(b.properties ?? {})) {
      properties[key] = properties[key] ? mergeTwo(properties[key], schema) : schema;
    }
    // required = intersection of observed required sets
    const requiredA: string[] = a.required ?? [];
    const requiredB = new Set<string>(b.required ?? []);
    const required = requiredA.filter((key) => requiredB.has(key));
    const schema: JsonSchema = { type: 'object', properties };
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }

  if (a.type === 'array') {
    return { type: 'array', items: mergeSchemas([a.items ?? {}, b.items ?? {}]) };
  }

  return a;
}

interface OperationAccumulator {
  method: string;
  template: string;
  pathParams: Set<string>;
  queryParams: Set<string>;
  requestBodies: JsonSchema[];
  responses: Map<string, JsonSchema[]>;
}

function getContentType(headers: Record<string, string>): string | undefined {
  return headers['content-type'];
}

/**
 * Generate an OpenAPI 3.1 document by observing recorded traffic. Returns the
 * document object; the caller decides whether to print it, write it, or index
 * it for validation.
 */
export async function generateSpecFromTraffic(options: GenerateSpecOptions): Promise<any> {
  const trafficFiles = await listFilesRecursively(options.trafficPath);
  if (trafficFiles.length === 0) {
    throw new Error('No traffic files found in the provided traffic path.');
  }

  const externalParsers = await loadTrafficParsers(options.trafficParserModules ?? []);
  const operations = new Map<string, OperationAccumulator>();
  let supportedTrafficFileCount = 0;

  const observe = (exchange: NormalizedExchange) => {
    const method = exchange.request.method.toLowerCase();
    if (!HTTP_METHODS.has(method)) {
      return;
    }

    const { template, params } = templatizePath(exchange.request.path || '/');
    const key = `${method} ${template}`;
    let accumulator = operations.get(key);
    if (!accumulator) {
      accumulator = {
        method,
        template,
        pathParams: new Set(),
        queryParams: new Set(),
        requestBodies: [],
        responses: new Map(),
      };
      operations.set(key, accumulator);
    }

    for (const param of params) {
      accumulator.pathParams.add(param);
    }
    for (const queryKey of exchange.request.query.keys()) {
      accumulator.queryParams.add(queryKey);
    }

    if (
      exchange.request.bodyJson !== undefined &&
      isJsonMime(getContentType(exchange.request.headers))
    ) {
      accumulator.requestBodies.push(inferSchema(exchange.request.bodyJson));
    }

    if (exchange.response) {
      const status = String(exchange.response.status || 'default');
      if (
        exchange.response.bodyJson !== undefined &&
        isJsonMime(getContentType(exchange.response.headers))
      ) {
        const list = accumulator.responses.get(status) ?? [];
        list.push(inferSchema(exchange.response.bodyJson));
        accumulator.responses.set(status, list);
      } else if (!accumulator.responses.has(status)) {
        accumulator.responses.set(status, []);
      }
    }
  };

  for (const trafficFile of trafficFiles) {
    let parser;
    try {
      parser = await selectTrafficParser(trafficFile, options.format, externalParsers);
    } catch (error) {
      if (options.format === 'auto') {
        continue;
      }
      throw new Error(
        `Failed to select parser for file "${trafficFile}" using format "${options.format}": ${(error as Error).message}`
      );
    }

    supportedTrafficFileCount += 1;
    for await (const exchange of parser.parse(trafficFile)) {
      observe(exchange);
    }
  }

  if (supportedTrafficFileCount === 0) {
    throw new Error('No supported traffic files found to generate an OpenAPI description from.');
  }

  return buildDocument(operations, options.title ?? 'Generated API');
}

function buildDocument(operations: Map<string, OperationAccumulator>, title: string): any {
  const paths: Record<string, any> = {};

  for (const accumulator of operations.values()) {
    const pathItem = (paths[accumulator.template] ??= {});

    const parameters = [
      ...Array.from(accumulator.pathParams).map((name) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      })),
      ...Array.from(accumulator.queryParams).map((name) => ({
        name,
        in: 'query',
        required: false,
        schema: { type: 'string' },
      })),
    ];

    const operation: any = {
      operationId: deriveOperationId(accumulator.method, accumulator.template),
      responses: {},
    };

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    if (accumulator.requestBodies.length > 0) {
      operation.requestBody = {
        content: {
          'application/json': { schema: mergeSchemas(accumulator.requestBodies) },
        },
      };
    }

    if (accumulator.responses.size === 0) {
      operation.responses['default'] = { description: 'Observed response' };
    } else {
      for (const [status, schemas] of accumulator.responses) {
        const response: any = { description: 'Observed response' };
        if (schemas.length > 0) {
          response.content = { 'application/json': { schema: mergeSchemas(schemas) } };
        }
        operation.responses[status] = response;
      }
    }

    pathItem[accumulator.method] = operation;
  }

  return {
    openapi: '3.1.0',
    info: { title, version: '1.0.0' },
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
