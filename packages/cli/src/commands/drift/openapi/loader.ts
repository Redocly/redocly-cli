import { bundle, isPlainObject, logger, type Config } from '@redocly/openapi-core';
import { stat } from 'node:fs/promises';

import type {
  OpenApiIndex,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiServer,
} from '../types/index.js';
import { listOpenApiFiles, readProbe } from '../utils/files.js';
import { compileOpenApiPath } from '../utils/http.js';
import { ensureLeadingSlash, resolveServerUrl, type ServerVariable } from '../utils/openapi.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

const PARAMETER_LOCATIONS = new Set(['query', 'header', 'path', 'cookie']);

interface RawDocument {
  openapi?: unknown;
  paths?: Record<string, unknown>;
  servers?: unknown;
  security?: unknown;
  components?: { securitySchemes?: unknown };
}

function isParameterLocation(value: string): value is OpenApiParameter['in'] {
  return PARAMETER_LOCATIONS.has(value);
}

function normalizeParameters(parameters: unknown): OpenApiParameter[] {
  if (!Array.isArray(parameters)) {
    return [];
  }

  const normalized: OpenApiParameter[] = [];
  for (const entry of parameters) {
    if (!isPlainObject(entry)) {
      continue;
    }

    const location = entry.in;
    if (typeof location !== 'string' || !isParameterLocation(location)) {
      continue;
    }

    normalized.push({
      name: String(entry.name ?? ''),
      in: location,
      required: Boolean(entry.required) || location === 'path',
      schema: entry.schema,
    });
  }

  return normalized;
}

function parameterKey(parameter: OpenApiParameter): string {
  const caseInsensitive = parameter.in === 'header';
  return `${parameter.in}:${caseInsensitive ? parameter.name.toLowerCase() : parameter.name}`;
}

function mergeParameters(
  baseParameters: OpenApiParameter[],
  operationParameters: OpenApiParameter[]
): OpenApiParameter[] {
  const map = new Map<string, OpenApiParameter>();

  for (const parameter of baseParameters) {
    map.set(parameterKey(parameter), parameter);
  }

  for (const parameter of operationParameters) {
    map.set(parameterKey(parameter), parameter);
  }

  return Array.from(map.values());
}

function extractMediaSchemas(content: unknown): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  if (!isPlainObject(content)) {
    return output;
  }

  for (const [mime, mediaTypeObject] of Object.entries(content)) {
    if (isPlainObject(mediaTypeObject) && 'schema' in mediaTypeObject) {
      output[mime.toLowerCase()] = mediaTypeObject.schema;
    }
  }

  return output;
}

function extractRequestBodyContent(requestBody: unknown): Record<string, unknown> {
  if (!isPlainObject(requestBody)) {
    return {};
  }

  return extractMediaSchemas(requestBody.content);
}

function extractResponseBodyContent(responses: unknown): Record<string, Record<string, unknown>> {
  if (!isPlainObject(responses)) {
    return {};
  }

  const output: Record<string, Record<string, unknown>> = {};
  for (const [statusCode, responseObject] of Object.entries(responses)) {
    if (!isPlainObject(responseObject) || !('content' in responseObject)) {
      continue;
    }

    output[statusCode] = extractMediaSchemas(responseObject.content);
  }

  return output;
}

function resolveOperationServers(
  operationServers: unknown,
  pathServers: unknown,
  rootServers: unknown
): OpenApiServer[] {
  const sourceServers = operationServers ?? pathServers ?? rootServers;
  if (!Array.isArray(sourceServers) || sourceServers.length === 0) {
    return [resolveServerUrl('/')];
  }

  return sourceServers.map((server) => {
    if (!isPlainObject(server)) {
      return resolveServerUrl('/');
    }

    const url = typeof server.url === 'string' ? server.url : '/';
    const variables = isPlainObject(server.variables)
      ? (server.variables as Record<string, ServerVariable>)
      : undefined;
    return resolveServerUrl(url, variables);
  });
}

function toOperationId(
  method: HttpMethod,
  pathTemplate: string,
  declaredOperationId?: string
): string {
  if (declaredOperationId) {
    return declaredOperationId;
  }

  return `${method.toUpperCase()} ${pathTemplate}`;
}

function isOpenApi3Document(document: unknown): document is RawDocument {
  return Boolean(
    isPlainObject(document) &&
    typeof document.openapi === 'string' &&
    document.openapi.startsWith('3.')
  );
}

function normalizeSecurity(value: unknown): Record<string, string[]>[] | undefined {
  return Array.isArray(value) ? (value as Record<string, string[]>[]) : undefined;
}

function indexDocument(
  document: RawDocument,
  specSource: string,
  operationsByMethod: Map<string, OpenApiOperation[]>
): void {
  const paths = document.paths ?? {};
  const componentsSecuritySchemes = isPlainObject(document.components)
    ? document.components.securitySchemes
    : undefined;
  const securitySchemes: Record<string, unknown> = isPlainObject(componentsSecuritySchemes)
    ? componentsSecuritySchemes
    : {};

  for (const [rawPathTemplate, pathItem] of Object.entries(paths)) {
    if (!isPlainObject(pathItem)) {
      continue;
    }

    const pathTemplate = ensureLeadingSlash(rawPathTemplate);
    const pathParameters = normalizeParameters(pathItem.parameters);

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isPlainObject(operation)) {
        continue;
      }

      const operationParameters = normalizeParameters(operation.parameters);
      const mergedParameters = mergeParameters(pathParameters, operationParameters);
      const compiledPath = compileOpenApiPath(pathTemplate);
      const servers = resolveOperationServers(
        operation.servers,
        pathItem.servers,
        document.servers
      );
      const requestBody = operation.requestBody;

      const item: OpenApiOperation = {
        operationId: toOperationId(
          method,
          pathTemplate,
          typeof operation.operationId === 'string' ? operation.operationId : undefined
        ),
        method,
        pathTemplate,
        pathRegex: compiledPath.regex,
        pathParams: compiledPath.params,
        pathScore: compiledPath.score,
        servers,
        requestParameters: mergedParameters,
        requestBodyContent: extractRequestBodyContent(requestBody),
        requestBodyRequired: isPlainObject(requestBody) && Boolean(requestBody.required),
        responseBodyContent: extractResponseBodyContent(operation.responses),
        security: normalizeSecurity(operation.security) ?? normalizeSecurity(document.security),
        securitySchemes,
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
 * Resolve the OpenAPI spec input (a single file or a folder) into a flat list
 * of spec file paths that openapi-core can bundle individually.
 */
async function resolveSpecFiles(
  specPath: string
): Promise<{ specFiles: string[]; fromDirectory: boolean }> {
  const stats = await stat(specPath);
  if (stats.isDirectory()) {
    return { specFiles: await listOpenApiFiles(specPath), fromDirectory: true };
  }
  return { specFiles: [specPath], fromDirectory: false };
}

const YAML_OPENAPI_ROOT_KEY_RE = /^(['"]?)openapi\1\s*:/m;
const JSON_OPENAPI_KEY_RE = /"openapi"\s*:/;
const SPEC_PROBE_BYTES = 65536;

/**
 * Cheap pre-filter for folder mode: only files declaring a root-level
 * `openapi` key are bundled, so component/parameter files referenced by a root
 * description are skipped without noisy bundling warnings.
 */
async function looksLikeOpenApiRootDocument(specFile: string): Promise<boolean> {
  try {
    const probe = await readProbe(specFile, SPEC_PROBE_BYTES);
    return YAML_OPENAPI_ROOT_KEY_RE.test(probe) || JSON_OPENAPI_KEY_RE.test(probe);
  } catch {
    return true;
  }
}

/**
 * Load and index every OpenAPI operation reachable from `specPath` using
 * @redocly/openapi-core for bundling and full dereferencing. Accepts either a
 * single spec file or a folder of specs.
 */
export async function loadOpenApiIndex(specPath: string, config: Config): Promise<OpenApiIndex> {
  const { specFiles, fromDirectory } = await resolveSpecFiles(specPath);
  const operationsByMethod = new Map<string, OpenApiOperation[]>();
  let loadedSpecs = 0;

  for (const specFile of specFiles) {
    if (fromDirectory && !(await looksLikeOpenApiRootDocument(specFile))) {
      continue;
    }

    let document: unknown;
    try {
      const { bundle: bundled } = await bundle({ config, ref: specFile, dereference: true });
      document = bundled.parsed;
    } catch (error) {
      logger.warn(
        `Failed to bundle OpenAPI description ${specFile}: ${(error as Error).message}\n`
      );
      continue;
    }

    if (!isOpenApi3Document(document)) {
      if (!fromDirectory) {
        logger.warn(`Skipping ${specFile}: not an OpenAPI 3.x description.\n`);
      }
      continue;
    }

    loadedSpecs += 1;
    indexDocument(document, specFile, operationsByMethod);
  }

  return finalizeIndex(operationsByMethod, loadedSpecs);
}
