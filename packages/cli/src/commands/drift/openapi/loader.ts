import { bundle, type Config } from '@redocly/openapi-core';
import { stat } from 'node:fs/promises';

import { listOpenApiFiles } from '../utils/files.js';
import { compileOpenApiPath } from '../utils/http.js';
import { ensureLeadingSlash, resolveServerUrl } from '../utils/openapi.js';
import type { OpenApiIndex, OpenApiOperation, OpenApiParameter, OpenApiServer } from '../types/index.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

const PARAMETER_LOCATIONS = new Set(['query', 'header', 'path', 'cookie']);

function isParameterLocation(value: string): value is OpenApiParameter['in'] {
  return PARAMETER_LOCATIONS.has(value);
}

function normalizeParameters(parameters: any[] | undefined): OpenApiParameter[] {
  if (!parameters || !Array.isArray(parameters)) {
    return [];
  }

  return parameters
    .filter(Boolean)
    .filter((parameter) => isParameterLocation(parameter.in))
    .map((parameter) => ({
      name: parameter.name,
      in: parameter.in as OpenApiParameter['in'],
      required: Boolean(parameter.required) || parameter.in === 'path',
      schema: parameter.schema,
    }));
}

function mergeParameters(
  baseParameters: OpenApiParameter[],
  operationParameters: OpenApiParameter[]
): OpenApiParameter[] {
  const map = new Map<string, OpenApiParameter>();

  for (const parameter of baseParameters) {
    map.set(`${parameter.in}:${parameter.name.toLowerCase()}`, parameter);
  }

  for (const parameter of operationParameters) {
    map.set(`${parameter.in}:${parameter.name.toLowerCase()}`, parameter);
  }

  return Array.from(map.values());
}

function extractRequestBodyContent(requestBody: any): Record<string, unknown> {
  if (!requestBody?.content) {
    return {};
  }

  const output: Record<string, unknown> = {};
  for (const [mime, mediaTypeObject] of Object.entries<any>(requestBody.content)) {
    if (mediaTypeObject && typeof mediaTypeObject === 'object' && 'schema' in mediaTypeObject) {
      output[mime.toLowerCase()] = mediaTypeObject.schema;
    }
  }

  return output;
}

function extractResponseBodyContent(responses: any): Record<string, Record<string, unknown>> {
  if (!responses) {
    return {};
  }

  const output: Record<string, Record<string, unknown>> = {};
  for (const [statusCode, responseObject] of Object.entries<any>(responses)) {
    if (!responseObject || !('content' in responseObject)) {
      continue;
    }

    const mediaMap: Record<string, unknown> = {};
    for (const [mime, mediaTypeObject] of Object.entries<any>(responseObject.content ?? {})) {
      if (mediaTypeObject && typeof mediaTypeObject === 'object' && 'schema' in mediaTypeObject) {
        mediaMap[mime.toLowerCase()] = mediaTypeObject.schema;
      }
    }

    output[statusCode] = mediaMap;
  }

  return output;
}

function resolveOperationServers(
  operationServers: any[] | undefined,
  pathServers: any[] | undefined,
  rootServers: any[] | undefined
): OpenApiServer[] {
  const sourceServers = operationServers ?? pathServers ?? rootServers;
  if (!sourceServers || sourceServers.length === 0) {
    return [resolveServerUrl('/')];
  }

  return sourceServers.map((server) => resolveServerUrl(server.url, server.variables));
}

function toOperationId(method: HttpMethod, pathTemplate: string, declaredOperationId?: string): string {
  if (declaredOperationId) {
    return declaredOperationId;
  }

  return `${method.toUpperCase()} ${pathTemplate}`;
}

function isOpenApi3Document(document: any): boolean {
  return Boolean(
    document && typeof document === 'object' && typeof document.openapi === 'string' && document.openapi.startsWith('3.')
  );
}

function indexDocument(document: any, specSource: string, operationsByMethod: Map<string, OpenApiOperation[]>): void {
  const paths = document.paths ?? {};

  for (const [rawPathTemplate, pathItem] of Object.entries<any>(paths)) {
    if (!pathItem) {
      continue;
    }

    const pathTemplate = ensureLeadingSlash(rawPathTemplate);
    const pathParameters = normalizeParameters(pathItem.parameters);

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      const operationParameters = normalizeParameters(operation.parameters);
      const mergedParameters = mergeParameters(pathParameters, operationParameters);
      const compiledPath = compileOpenApiPath(pathTemplate);
      const servers = resolveOperationServers(operation.servers, pathItem.servers, document.servers);

      const item: OpenApiOperation = {
        operationId: toOperationId(method, pathTemplate, operation.operationId),
        method,
        pathTemplate,
        pathRegex: compiledPath.regex,
        pathParams: compiledPath.params,
        pathScore: compiledPath.score,
        servers,
        requestParameters: mergedParameters,
        requestBodyContent: extractRequestBodyContent(operation.requestBody),
        requestBodyRequired: Boolean(operation.requestBody?.required),
        responseBodyContent: extractResponseBodyContent(operation.responses),
        security: operation.security ?? document.security,
        securitySchemes: (document.components?.securitySchemes ?? {}) as Record<string, any>,
        specSource,
      };

      const methodOperations = operationsByMethod.get(method) ?? [];
      methodOperations.push(item);
      operationsByMethod.set(method, methodOperations);
    }
  }
}

function finalizeIndex(
  operationsByMethod: Map<string, OpenApiOperation[]>,
  loadedSpecs: number
): OpenApiIndex {
  for (const operations of operationsByMethod.values()) {
    operations.sort((left, right) => right.pathScore - left.pathScore);
  }

  const loadedOperations = Array.from(operationsByMethod.values()).reduce(
    (acc, current) => acc + current.length,
    0
  );

  return { operationsByMethod, loadedSpecs, loadedOperations };
}

/**
 * Build an OpenApiIndex from already-parsed OpenAPI documents (e.g. a spec
 * generated in memory from traffic).
 */
export function buildOpenApiIndex(documents: Array<{ document: any; source: string }>): OpenApiIndex {
  const operationsByMethod = new Map<string, OpenApiOperation[]>();
  let loadedSpecs = 0;

  for (const { document, source } of documents) {
    if (!isOpenApi3Document(document)) {
      continue;
    }
    loadedSpecs += 1;
    indexDocument(document, source, operationsByMethod);
  }

  return finalizeIndex(operationsByMethod, loadedSpecs);
}

/**
 * Resolve the OpenAPI spec input (a single file or a folder) into a flat list
 * of spec file paths that openapi-core can bundle individually.
 */
async function resolveSpecFiles(specPath: string): Promise<string[]> {
  const stats = await stat(specPath);
  if (stats.isDirectory()) {
    return listOpenApiFiles(specPath);
  }
  return [specPath];
}

/**
 * Load and index every OpenAPI operation reachable from `specPath` using
 * @redocly/openapi-core for bundling and full dereferencing. Accepts either a
 * single spec file or a folder of specs.
 */
export async function loadOpenApiIndex(specPath: string, config: Config): Promise<OpenApiIndex> {
  const specFiles = await resolveSpecFiles(specPath);
  const operationsByMethod = new Map<string, OpenApiOperation[]>();
  let loadedSpecs = 0;

  for (const specFile of specFiles) {
    let document: any;
    try {
      const { bundle: bundled } = await bundle({ config, ref: specFile, dereference: true });
      document = bundled.parsed;
    } catch {
      continue;
    }

    if (!isOpenApi3Document(document)) {
      continue;
    }

    loadedSpecs += 1;
    indexDocument(document, specFile, operationsByMethod);
  }

  return finalizeIndex(operationsByMethod, loadedSpecs);
}
