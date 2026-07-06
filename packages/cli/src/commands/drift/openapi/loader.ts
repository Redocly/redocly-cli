import {
  BaseResolver,
  bundle,
  detectSpec,
  getMajorSpecVersion,
  getTypes,
  isPlainObject,
  logger,
  normalizeTypes,
  normalizeVisitors,
  walkDocument,
  type Config,
  type Document,
  type Oas3Visitor,
  type ResolvedRefMap,
  type SpecVersion,
  type WalkContext,
} from '@redocly/openapi-core';
import { stat } from 'node:fs/promises';

import type {
  OpenApiIndex,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiServer,
} from '../types/index.js';
import { listOpenApiFiles } from '../utils/files.js';
import { compileOpenApiPath } from '../utils/http.js';
import { ensureLeadingSlash, resolveServerUrl, type ServerVariable } from '../utils/openapi.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

const PARAMETER_LOCATIONS = new Set(['query', 'header', 'path', 'cookie']);

function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

interface RootNode {
  servers?: unknown;
  security?: unknown;
  components?: unknown;
}

interface PathItemNode {
  parameters?: unknown;
  servers?: unknown;
}

interface OperationNode {
  operationId?: unknown;
  parameters?: unknown;
  requestBody?: unknown;
  responses?: unknown;
  servers?: unknown;
  security?: unknown;
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

function detectOpenApi3Spec(document: Document): SpecVersion | null {
  try {
    const specVersion = detectSpec(document.parsed);
    return getMajorSpecVersion(specVersion) === 'oas3' ? specVersion : null;
  } catch {
    return null;
  }
}

function normalizeSecurity(value: unknown): Record<string, string[]>[] | undefined {
  return Array.isArray(value) ? (value as Record<string, string[]>[]) : undefined;
}

function createIndexVisitor(
  specSource: string,
  operationsByMethod: Map<string, OpenApiOperation[]>
): Oas3Visitor {
  let rootServers: unknown;
  let rootSecurity: unknown;
  let securitySchemes: Record<string, unknown> = {};
  let currentPathTemplate = '/';
  let currentPathParameters: OpenApiParameter[] = [];
  let currentPathServers: unknown;

  return {
    Root: {
      enter(root: RootNode) {
        rootServers = root.servers;
        rootSecurity = root.security;
        const componentsSecuritySchemes = isPlainObject(root.components)
          ? root.components.securitySchemes
          : undefined;
        securitySchemes = isPlainObject(componentsSecuritySchemes) ? componentsSecuritySchemes : {};
      },
    },
    Paths: {
      PathItem: {
        enter(pathItem: PathItemNode, ctx) {
          currentPathTemplate = ensureLeadingSlash(String(ctx.key));
          currentPathParameters = normalizeParameters(pathItem.parameters);
          currentPathServers = pathItem.servers;
        },
        Operation: {
          enter(operation: OperationNode, ctx) {
            const method = String(ctx.key);
            if (!isHttpMethod(method)) {
              return;
            }

            const mergedParameters = mergeParameters(
              currentPathParameters,
              normalizeParameters(operation.parameters)
            );
            const compiledPath = compileOpenApiPath(currentPathTemplate);
            const servers = resolveOperationServers(
              operation.servers,
              currentPathServers,
              rootServers
            );
            const requestBody = operation.requestBody;

            const item: OpenApiOperation = {
              operationId: toOperationId(
                method,
                currentPathTemplate,
                typeof operation.operationId === 'string' ? operation.operationId : undefined
              ),
              method,
              pathTemplate: currentPathTemplate,
              pathRegex: compiledPath.regex,
              pathParams: compiledPath.params,
              pathScore: compiledPath.score,
              servers,
              requestParameters: mergedParameters,
              requestBodyContent: extractRequestBodyContent(requestBody),
              requestBodyRequired: isPlainObject(requestBody) && Boolean(requestBody.required),
              responseBodyContent: extractResponseBodyContent(operation.responses),
              security: normalizeSecurity(operation.security) ?? normalizeSecurity(rootSecurity),
              securitySchemes,
              specSource,
            };

            const methodOperations = operationsByMethod.get(method) ?? [];
            methodOperations.push(item);
            operationsByMethod.set(method, methodOperations);
          },
        },
      },
    },
  };
}

function indexDocument(
  document: Document,
  specVersion: SpecVersion,
  config: Config,
  specSource: string,
  operationsByMethod: Map<string, OpenApiOperation[]>
): void {
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  // The document is fully dereferenced during bundling, so there are no $refs
  // left to resolve; recursive schemas become circular objects that
  // resolveDocument cannot walk safely, hence the empty ref map.
  const resolvedRefMap: ResolvedRefMap = new Map();

  const ctx: WalkContext = { problems: [], specVersion, config, visitorsData: {} };
  const normalizedVisitors = normalizeVisitors(
    [
      {
        severity: 'warn',
        ruleId: 'drift-index',
        visitor: createIndexVisitor(specSource, operationsByMethod),
      },
    ],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });
}

function serverIdentity(server: OpenApiServer): string {
  return `${server.host ?? ''}|${server.basePath}`;
}

function warnAboutCollidingOperations(operationsByMethod: Map<string, OpenApiOperation[]>): void {
  for (const operations of operationsByMethod.values()) {
    const byPathPattern = new Map<string, OpenApiOperation[]>();
    for (const operation of operations) {
      const group = byPathPattern.get(operation.pathRegex.source) ?? [];
      group.push(operation);
      byPathPattern.set(operation.pathRegex.source, group);
    }

    for (const group of byPathPattern.values()) {
      const sourcesByServer = new Map<string, Set<string>>();
      for (const operation of group) {
        for (const server of operation.servers) {
          const key = serverIdentity(server);
          const sources = sourcesByServer.get(key) ?? new Set<string>();
          sources.add(operation.specSource);
          sourcesByServer.set(key, sources);
        }
      }

      for (const sources of sourcesByServer.values()) {
        if (sources.size > 1) {
          const [first] = group;
          logger.warn(
            `"${first.method.toUpperCase()} ${
              first.pathTemplate
            }" is documented for the same server in multiple descriptions (${Array.from(
              sources
            ).join(', ')}). Matching traffic is validated against only one of them.\n`
          );
          break;
        }
      }
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

/**
 * Load and index every OpenAPI operation reachable from `specPath` using
 * @redocly/openapi-core for bundling and full dereferencing. Accepts either a
 * single spec file or a folder of specs. In folder mode only root OpenAPI 3.x
 * descriptions are bundled, so component/parameter files referenced by a root
 * description are skipped without noisy bundling warnings.
 */
export async function loadOpenApiIndex(specPath: string, config: Config): Promise<OpenApiIndex> {
  const { specFiles, fromDirectory } = await resolveSpecFiles(specPath);
  const operationsByMethod = new Map<string, OpenApiOperation[]>();
  const externalRefResolver = new BaseResolver(config.resolve);
  let loadedSpecs = 0;

  for (const specFile of specFiles) {
    const resolvedDocument = await externalRefResolver.resolveDocument(null, specFile, true);
    if (resolvedDocument instanceof Error) {
      logger.warn(`Failed to load OpenAPI description ${specFile}: ${resolvedDocument.message}\n`);
      continue;
    }

    const specVersion = detectOpenApi3Spec(resolvedDocument);
    if (!specVersion) {
      if (!fromDirectory) {
        logger.warn(`Skipping ${specFile}: not an OpenAPI 3.x description.\n`);
      }
      continue;
    }

    let document: Document;
    try {
      const { bundle: bundled } = await bundle({
        config,
        doc: resolvedDocument,
        externalRefResolver,
        dereference: true,
      });
      document = bundled;
    } catch (error) {
      logger.warn(
        `Failed to bundle OpenAPI description ${specFile}: ${(error as Error).message}\n`
      );
      continue;
    }

    loadedSpecs += 1;
    indexDocument(document, specVersion, config, specFile, operationsByMethod);
  }

  if (loadedSpecs > 1) {
    warnAboutCollidingOperations(operationsByMethod);
  }

  return finalizeIndex(operationsByMethod, loadedSpecs);
}
