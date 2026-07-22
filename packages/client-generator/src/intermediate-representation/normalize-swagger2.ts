import { isPlainObject, type Oas3Definition } from '@redocly/openapi-core';

/**
 * Convert a Swagger 2.0 document into the OpenAPI 3.x shape the IR builder expects.
 * All 2.0-specific quirks live here so `buildApiModel` stays 3.x-only. Operations
 * are normalized too (body/formData → requestBody, inline param types → `schema`,
 * `responses[].schema` + `produces` → `responses[].content`). Every `#/definitions`,
 * `#/parameters`, `#/responses` `$ref` is rewritten to its `#/components/...` home.
 */
export function normalizeSwagger2(doc: Record<string, unknown>): Oas3Definition {
  const rewritten = rewriteRefs(doc) as Record<string, unknown>;

  const out: Record<string, unknown> = { ...rewritten };
  delete out.swagger;
  delete out.host;
  delete out.basePath;
  delete out.schemes;
  delete out.definitions;
  delete out.securityDefinitions;
  delete out.consumes;
  delete out.produces;
  delete out.parameters;
  delete out.responses;

  out.openapi = '3.0.3';

  const servers = buildServers(rewritten);
  if (servers) out.servers = servers;

  out.components = buildComponents(rewritten);

  out.paths = normalizePaths(
    (rewritten.paths as Record<string, unknown>) ?? {},
    (rewritten.consumes as string[] | undefined) ?? undefined,
    (rewritten.produces as string[] | undefined) ?? undefined
  );

  return out as unknown as Oas3Definition;
}

function buildServers(doc: Record<string, unknown>): Array<{ url: string }> | undefined {
  const host = doc.host as string | undefined;
  const basePath = (doc.basePath as string | undefined) ?? '';
  const scheme = ((doc.schemes as string[] | undefined) ?? ['https'])[0] ?? 'https';
  if (!host) return undefined;
  return [{ url: `${scheme}://${host}${basePath}` }];
}

function buildComponents(doc: Record<string, unknown>): Record<string, unknown> {
  const components: Record<string, unknown> = {};
  if (doc.definitions) components.schemas = doc.definitions;
  if (doc.parameters) {
    components.parameters = Object.fromEntries(
      Object.entries(doc.parameters as Record<string, Record<string, unknown>>).map(
        ([name, param]) => [name, normalizeParameter(param)]
      )
    );
  }
  if (doc.responses)
    components.responses = normalizeResponses(doc.responses as Record<string, unknown>, undefined);
  const securityDefinitions = doc.securityDefinitions as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (securityDefinitions) {
    const securitySchemes: Record<string, unknown> = {};
    for (const [key, scheme] of Object.entries(securityDefinitions)) {
      securitySchemes[key] = mapSecurityScheme(scheme);
    }
    components.securitySchemes = securitySchemes;
  }
  return components;
}

function mapSecurityScheme(scheme: Record<string, unknown>): Record<string, unknown> {
  switch (scheme.type) {
    case 'basic':
      return { type: 'http', scheme: 'basic' };
    case 'apiKey':
      return { type: 'apiKey', name: scheme.name, in: scheme.in };
    case 'oauth2': {
      const flowName =
        scheme.flow === 'accessCode'
          ? 'authorizationCode'
          : scheme.flow === 'application'
            ? 'clientCredentials'
            : (scheme.flow as string);
      const flow: Record<string, unknown> = { scopes: scheme.scopes ?? {} };
      if (scheme.authorizationUrl) flow.authorizationUrl = scheme.authorizationUrl;
      if (scheme.tokenUrl) flow.tokenUrl = scheme.tokenUrl;
      return { type: 'oauth2', flows: { [flowName]: flow } };
    }
    default:
      return scheme;
  }
}

/** Deep-clone `node`, rewriting Swagger-2 local `$ref` pointers to their 3.x homes. */
function rewriteRefs(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (isPlainObject(node)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === '$ref' && typeof value === 'string') {
        out.$ref = value
          .replace('#/definitions/', '#/components/schemas/')
          .replace('#/parameters/', '#/components/parameters/')
          .replace('#/responses/', '#/components/responses/');
      } else {
        out[key] = rewriteRefs(value);
      }
    }
    return out;
  }
  return node;
}

const DEFAULT_CONSUMES = 'application/json';
const DEFAULT_PRODUCES = 'application/json';
const NON_SCHEMA_PARAM_KEYS = new Set([
  'name',
  'in',
  'required',
  'description',
  'deprecated',
  'allowEmptyValue',
  'collectionFormat',
]);

function normalizePaths(
  paths: Record<string, unknown>,
  rootConsumes?: string[],
  rootProduces?: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, itemRaw] of Object.entries(paths)) {
    const item = itemRaw as Record<string, unknown>;
    const newItem: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === 'parameters' && Array.isArray(value)) {
        // Path-level parameters are shared by every operation and carry the same
        // Swagger-2 inline-type shape as operation-level ones.
        newItem.parameters = (value as Array<Record<string, unknown>>).map(normalizeParameter);
        continue;
      }
      if (!isHttpMethod(key)) {
        newItem[key] = value;
        continue;
      }
      newItem[key] = normalizeOperation(
        value as Record<string, unknown>,
        rootConsumes,
        rootProduces
      );
    }
    out[path] = newItem;
  }
  return out;
}

function isHttpMethod(key: string): boolean {
  return ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'].includes(key.toLowerCase());
}

function normalizeOperation(
  operation: Record<string, unknown>,
  rootConsumes?: string[],
  rootProduces?: string[]
): Record<string, unknown> {
  const consumes = (operation.consumes as string[] | undefined) ?? rootConsumes;
  const produces = (operation.produces as string[] | undefined) ?? rootProduces;
  const params = (operation.parameters as Array<Record<string, unknown>> | undefined) ?? [];

  const bodyParam = params.find((p) => p.in === 'body');
  const formDataParams = params.filter((p) => p.in === 'formData');
  const otherParams = params
    .filter((p) => p.in !== 'body' && p.in !== 'formData')
    .map(normalizeParameter);

  const out: Record<string, unknown> = { ...operation, parameters: otherParams };
  delete out.consumes;
  delete out.produces;

  const contentType = consumes?.[0] ?? DEFAULT_CONSUMES;
  if (bodyParam) {
    out.requestBody = {
      required: Boolean(bodyParam.required),
      content: { [contentType]: { schema: bodyParam.schema } },
    };
  } else if (formDataParams.length > 0) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const p of formDataParams) {
      properties[p.name as string] = paramSchema(p);
      if (p.required) required.push(p.name as string);
    }
    const schema: Record<string, unknown> = { type: 'object', properties };
    if (required.length > 0) schema.required = required;
    // form-urlencoded unless a multipart consumes is declared.
    const formType =
      consumes?.find((c) => c === 'multipart/form-data') ??
      consumes?.[0] ??
      'application/x-www-form-urlencoded';
    out.requestBody = {
      required: required.length > 0,
      content: { [formType]: { schema } },
    };
  }

  if (operation.responses) {
    out.responses = normalizeResponses(operation.responses as Record<string, unknown>, produces);
  }
  return out;
}

/** A Swagger-2 simple parameter carries its schema inline; OAS3 nests it under `schema`. */
function normalizeParameter(param: Record<string, unknown>): Record<string, unknown> {
  // A $ref passes through (deref'd later against the normalized components), and
  // body/formData params keep their shape — the operation normalizer consumes them,
  // and anywhere else the IR builder rejects those locations loudly.
  if (param.$ref !== undefined || param.in === 'body' || param.in === 'formData') return param;
  const base: Record<string, unknown> = {};
  const schema: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(param)) {
    if (NON_SCHEMA_PARAM_KEYS.has(key)) base[key] = value;
    else schema[key] = value;
  }
  base.schema = schema;
  return base;
}

/** The schema half of a formData/simple param (everything except the param-level keys). */
function paramSchema(param: Record<string, unknown>): Record<string, unknown> {
  const schema: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(param)) {
    if (!NON_SCHEMA_PARAM_KEYS.has(key)) schema[key] = value;
  }
  return schema;
}

function normalizeResponses(
  responses: Record<string, unknown>,
  produces?: string[]
): Record<string, unknown> {
  const contentType = produces?.[0] ?? DEFAULT_PRODUCES;
  const out: Record<string, unknown> = {};
  for (const [code, responseRaw] of Object.entries(responses)) {
    const response = responseRaw as Record<string, unknown>;
    if (response.schema === undefined) {
      out[code] = response;
      continue;
    }
    const { schema, ...rest } = response;
    out[code] = { ...rest, content: { [contentType]: { schema } } };
  }
  return out;
}
