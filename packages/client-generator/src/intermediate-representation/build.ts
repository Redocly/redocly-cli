import {
  isPlainObject,
  isRef,
  logger,
  type Oas3Definition,
  type Oas3MediaType,
  type Oas3Operation,
  type Oas3Parameter,
  type Oas3PathItem,
  type Oas3Schema,
  type Oas3_1Schema,
} from '@redocly/openapi-core';

type Oas3ResponseShape = {
  content?: Record<string, Oas3MediaType>;
  description?: string;
};

import { NotSupportedError } from '../errors.js';
import type {
  ApiModel,
  DiscriminatorModel,
  NamedSchemaModel,
  OperationModel,
  ParamModel,
  PropertyModel,
  RequestBodyModel,
  ResponseBodyModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
  SecuritySchemeModel,
  ServiceModel,
} from './model.js';
import { assertSafeIdentifiers, sanitizeIdentifiers } from './sanitize-identifiers.js';

type Oas3SecurityScheme = {
  type?: string;
  scheme?: string;
  name?: string;
  in?: string;
};

type SecurityRequirement = Record<string, string[]>;

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

type Referenced<T> = T | { $ref: string };

function resolveRef<T>(doc: Oas3Definition, ref: string): T {
  if (!ref.startsWith('#/')) {
    throw new NotSupportedError(`External $ref not supported: ${ref}`);
  }
  const segments = ref
    .slice(2)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = doc;
  for (const segment of segments) {
    if (!isPlainObject(current) && !Array.isArray(current)) {
      throw new NotSupportedError(`Cannot resolve $ref: ${ref}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (current === undefined) {
    throw new NotSupportedError(`Cannot resolve $ref: ${ref}`);
  }
  return current as T;
}

function deref<T>(doc: Oas3Definition, value: Referenced<T>): T {
  if (isRef(value)) {
    return resolveRef<T>(doc, value.$ref);
  }
  return value;
}

function refName(ref: string): string {
  const idx = ref.lastIndexOf('/');
  return idx >= 0 ? ref.slice(idx + 1) : ref;
}

/**
 * Lift validation / annotation keywords off an OAS Schema Object into our
 * neutral SchemaMetadata bag.
 *
 * Normalizes OAS 3.0 boolean `exclusiveMinimum` / `exclusiveMaximum` into the
 * OAS 3.1 numeric form so downstream consumers (the emitter, in particular)
 * have exactly one shape to handle.
 *
 * Returns `undefined` when nothing of interest is present. This keeps the IR
 * uncluttered: schemas without constraints simply have no `metadata` field at
 * all rather than an empty object, which also keeps strict-equality tests
 * stable.
 */
function extractMetadata(schema: Oas3Schema): SchemaMetadata | undefined {
  // We index into the schema with looser typing than the official @redocly types
  // because OAS 3.1 keywords (numeric `exclusiveMinimum/Maximum`) aren't in the
  // 3.0-focused type, and `format`/`deprecated` live in a few different places.
  const s = schema as Record<string, unknown>;
  const out: SchemaMetadata = {};

  if (typeof s.minimum === 'number') out.minimum = s.minimum;
  if (typeof s.maximum === 'number') out.maximum = s.maximum;

  // OAS 3.0: exclusiveMinimum/Maximum are booleans paired with minimum/maximum.
  // OAS 3.1: they are numbers and stand alone.
  // We always emit the 3.1 numeric form. When the 3.0 boolean form is used,
  // hoist the paired bound up and drop the inclusive form.
  if (typeof s.exclusiveMinimum === 'number') {
    out.exclusiveMinimum = s.exclusiveMinimum;
  } else if (s.exclusiveMinimum === true && typeof s.minimum === 'number') {
    out.exclusiveMinimum = s.minimum;
    delete out.minimum;
  }
  if (typeof s.exclusiveMaximum === 'number') {
    out.exclusiveMaximum = s.exclusiveMaximum;
  } else if (s.exclusiveMaximum === true && typeof s.maximum === 'number') {
    out.exclusiveMaximum = s.maximum;
    delete out.maximum;
  }

  if (typeof s.minLength === 'number') out.minLength = s.minLength;
  if (typeof s.maxLength === 'number') out.maxLength = s.maxLength;
  if (typeof s.pattern === 'string') out.pattern = s.pattern;

  if (typeof s.minItems === 'number') out.minItems = s.minItems;
  if (typeof s.maxItems === 'number') out.maxItems = s.maxItems;
  // `uniqueItems` defaults to false; only the affirmative case carries info.
  if (s.uniqueItems === true) out.uniqueItems = true;

  if (typeof s.format === 'string') out.format = s.format;
  // Same idea as uniqueItems — explicit `false` is the default; don't emit it.
  if (s.deprecated === true) out.deprecated = true;

  if (s.example !== undefined) {
    out.example = s.example;
  } else if (Array.isArray(s.examples) && s.examples.length > 0) {
    out.example = s.examples[0];
  }
  if (s.default !== undefined) out.default = s.default;

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Build discriminator metadata for a `oneOf` / `anyOf` union, when the schema
 * declares an explicit `discriminator`. With an explicit `mapping`, each entry
 * pairs the discriminant value with its target schema name. Without a mapping,
 * the OpenAPI spec says the discriminant value equals the referenced schema's
 * name, so we derive entries from the `$ref` members.
 *
 * Returns `undefined` when there's no usable discriminator (no `discriminator`
 * block, or one that yields no named targets) — the emitter then skips guards.
 */
function buildDiscriminator(
  schema: Oas3Schema,
  members: Array<Referenced<Oas3Schema>>
): DiscriminatorModel | undefined {
  const disc = (
    schema as { discriminator?: { propertyName?: string; mapping?: Record<string, string> } }
  ).discriminator;
  if (!disc || typeof disc.propertyName !== 'string') return undefined;

  const mapping: DiscriminatorModel['mapping'] = [];
  if (disc.mapping) {
    for (const [value, target] of Object.entries(disc.mapping)) {
      mapping.push({ value, schemaName: refName(target) });
    }
  } else {
    for (const member of members) {
      if (isRef(member)) {
        const name = refName(member.$ref);
        mapping.push({ value: name, schemaName: name });
      }
    }
  }
  if (mapping.length === 0) return undefined;
  return { propertyName: disc.propertyName, mapping };
}

/** Attach metadata to a freshly-built SchemaModel (no-op when undefined). */
function withMetadata<T extends SchemaModel>(model: T, metadata: SchemaMetadata | undefined): T {
  if (!metadata) return model;
  return { ...model, metadata };
}

/** Merge two metadata bags; right wins on conflicts. Returns undefined when both are empty. */
function mergeMetadata(
  a: SchemaMetadata | undefined,
  b: SchemaMetadata | undefined
): SchemaMetadata | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

export function buildApiModel(doc: Oas3Definition): ApiModel {
  const title = doc.info?.title ?? 'Api';
  const version = doc.info?.version ?? '0.0.0';
  const description = doc.info?.description;
  const serverUrl = doc.servers?.[0]?.url ?? '';

  const schemas = buildNamedSchemas(doc);
  const securitySchemes = buildSecuritySchemes(doc);
  const services = buildServices(doc, securitySchemes);

  const model: ApiModel = {
    title,
    version,
    description,
    serverUrl,
    services,
    schemas,
    securitySchemes,
  };
  // Sanitize names into safe identifiers (and rewrite refs to match) BEFORE any later
  // pass derives names from them — `stripReadOnly` builds `omit` targets from schema
  // names, so it must see the sanitized ones.
  sanitizeIdentifiers(model);
  stripReadOnlyFromRequestBodies(services, schemas);
  // Hard gate: no unsafe name may reach the printer (see sanitize-identifiers.ts).
  assertSafeIdentifiers(model);

  return model;
}

/**
 * Drop `readOnly` (server-managed) properties from every request body, in place.
 * OpenAPI says readOnly properties must not be sent in requests, so a create/update
 * body should not demand `id`/`createdAt`/etc. A body that `$ref`s a named schema
 * becomes `Omit<Name, …readOnly>` (keeping the named type); an inline object has
 * its readOnly properties filtered out. Response types are untouched.
 */
function stripReadOnlyFromRequestBodies(
  services: ApiModel['services'],
  schemas: NamedSchemaModel[]
): void {
  const byName = new Map(schemas.map((s) => [s.name, s.schema] as const));
  for (const service of services) {
    for (const op of service.operations) {
      if (op.requestBody) op.requestBody.schema = stripReadOnly(op.requestBody.schema, byName);
    }
  }
}

/**
 * Remove `unknown` members from a union's member list. `T | unknown` is just
 * `unknown` in TypeScript, so a typeless/empty `oneOf`/`anyOf` branch would erase
 * the real members. When every member is `unknown`, the union is itself `unknown`.
 */
function dropRedundantUnknown(members: SchemaModel[]): SchemaModel[] {
  const real = members.filter((m) => m.kind !== 'unknown');
  return real.length > 0 ? real : [{ kind: 'unknown' }];
}

function stripReadOnly(schema: SchemaModel, byName: Map<string, SchemaModel>): SchemaModel {
  if (schema.kind === 'ref') {
    const keys = collectReadOnlyKeys(schema, byName, new Set());
    return keys.length > 0 ? { kind: 'omit', base: schema.name, keys } : schema;
  }
  if (schema.kind === 'object') {
    const kept = schema.properties.filter((p) => !p.readOnly);
    return kept.length === schema.properties.length ? schema : { ...schema, properties: kept };
  }
  return schema;
}

/**
 * The readOnly top-level property names of a schema, descending through `$ref`s
 * and `allOf` (intersection) members — the shape entity schemas compose with. A
 * `visited` set guards against recursive refs. Order-preserving and deduped.
 */
function collectReadOnlyKeys(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  visited: Set<string>
): string[] {
  const keys: string[] = [];
  const visit = (s: SchemaModel): void => {
    if (s.kind === 'ref') {
      if (visited.has(s.name)) return;
      visited.add(s.name);
      const target = byName.get(s.name);
      if (target) visit(target);
    } else if (s.kind === 'object') {
      for (const p of s.properties) if (p.readOnly && !keys.includes(p.name)) keys.push(p.name);
    } else if (s.kind === 'intersection') {
      for (const member of s.members) visit(member);
    }
  };
  visit(schema);
  return keys;
}

/**
 * Collect the security schemes the client can apply on the wire, keyed by their
 * `components.securitySchemes` name. Bearer (`http`+`bearer`/oauth2/openIdConnect),
 * HTTP Basic, and apiKey in header/query/cookie are all injectable. `mutualTLS`
 * (and an `http` scheme that is neither bearer nor basic) is skipped — operations
 * that reference only those will simply carry no auth.
 */
function buildSecuritySchemes(doc: Oas3Definition): SecuritySchemeModel[] {
  const schemes = doc.components?.securitySchemes;
  if (!schemes) return [];

  const result: SecuritySchemeModel[] = [];
  for (const [key, raw] of Object.entries(schemes)) {
    const scheme = deref<Oas3SecurityScheme>(doc, raw as Referenced<Oas3SecurityScheme>);
    const type = scheme.type;
    if (type === 'oauth2' || type === 'openIdConnect') {
      result.push({ kind: 'bearer', key });
    } else if (type === 'http' && (scheme.scheme ?? '').toLowerCase() === 'bearer') {
      result.push({ kind: 'bearer', key });
    } else if (type === 'http' && (scheme.scheme ?? '').toLowerCase() === 'basic') {
      result.push({ kind: 'basic', key });
    } else if (type === 'apiKey' && scheme.in === 'header' && typeof scheme.name === 'string') {
      result.push({ kind: 'apiKeyHeader', key, headerName: scheme.name });
    } else if (type === 'apiKey' && scheme.in === 'query' && typeof scheme.name === 'string') {
      result.push({ kind: 'apiKeyQuery', key, paramName: scheme.name });
    } else if (type === 'apiKey' && scheme.in === 'cookie' && typeof scheme.name === 'string') {
      result.push({ kind: 'apiKeyCookie', key, cookieName: scheme.name });
    }
    // Everything else (http schemes other than bearer/basic, mutualTLS) is not
    // injectable by the generated client — intentionally skipped.
  }
  return result;
}

/**
 * Resolve the effective security for one operation into the list of injectable
 * OR-alternatives, each an AND-set of scheme keys. The operation's own `security`
 * overrides the document default; `security: []` opts out entirely.
 *
 * Every fully-injectable alternative is kept — the runtime applies exactly ONE of
 * them (the first whose credentials are all configured), so an operation that
 * accepts "bearer OR apiKey" works with either credential and never sends both.
 * `{}` (the optional-auth marker) and alternatives with non-injectable schemes
 * are skipped; an empty result means no auth is applied.
 */
function resolveOperationSecurity(
  operation: Oas3Operation,
  doc: Oas3Definition,
  injectable: Set<string>
): string[][] {
  const requirements =
    (operation as { security?: SecurityRequirement[] }).security ??
    (doc as { security?: SecurityRequirement[] }).security;
  if (!requirements) return [];

  const alternatives: string[][] = [];
  for (const requirement of requirements) {
    const keys = Object.keys(requirement);
    if (keys.length === 0) continue;
    if (keys.every((key) => injectable.has(key))) {
      alternatives.push([...new Set(keys)]);
    }
  }
  return alternatives;
}

function buildNamedSchemas(doc: Oas3Definition): NamedSchemaModel[] {
  const namedSchemas = doc.components?.schemas;
  if (!namedSchemas) return [];

  return Object.entries(namedSchemas).map(([name, schema]) => {
    if (isRef(schema)) {
      // A top-level entry that is a $ref forwards to another component.
      const target = resolveRef<Oas3Schema>(doc, schema.$ref);
      return {
        name,
        schema: buildSchema(target, `components.schemas.${name}`, doc),
        description: target.description,
      };
    }
    const built = buildSchema(schema as Oas3Schema, `components.schemas.${name}`, doc);
    return { name, schema: built, description: schema.description };
  });
}

function buildServices(
  doc: Oas3Definition,
  securitySchemes: SecuritySchemeModel[]
): ServiceModel[] {
  const injectable = new Set(securitySchemes.map((s) => s.key));

  type Entry = {
    method: HttpMethod;
    path: string;
    operation: Oas3Operation;
    pathLevelParams: ParamModel[];
  };
  const entries: Entry[] = [];
  const usedNames = new Set<string>();
  for (const [path, pathItemRaw] of Object.entries(doc.paths ?? {})) {
    if (!pathItemRaw) continue;
    const pathItem = deref<Oas3PathItem>(doc, pathItemRaw);

    const pathLevelParams = (pathItem.parameters ?? []).map((p) =>
      buildParameter(deref<Oas3Parameter>(doc, p), `paths.${path}.parameters`, doc)
    );

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Oas3PathItem)[method];
      if (!operation) continue;
      entries.push({ method, path, operation, pathLevelParams });
      // Reserve every declared operationId up front so a synthesized fallback name
      // never collides with one — declared ids always win.
      if (operation.operationId) usedNames.add(operation.operationId);
    }
  }

  const operations = entries.map((entry) => {
    const name =
      entry.operation.operationId ??
      takeUniqueName(fallbackOperationName(entry.method, entry.path), usedNames);
    return buildOperation(
      entry.method,
      entry.path,
      entry.operation,
      name,
      entry.pathLevelParams,
      doc,
      injectable
    );
  });
  return [{ name: 'Default', operations }];
}

/**
 * Synthesize an operation name from method + path when the spec omits `operationId`:
 * `<method><PascalCasedPathSegments>` (braces stripped; each segment split on
 * non-identifier chars). Path-param segments are kept so a collection (`GET /pets`)
 * and an item (`GET /pets/{id}`) stay distinct. Always a valid identifier — the
 * lowercase `method` prefix guarantees a letter start.
 */
function fallbackOperationName(method: string, path: string): string {
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => pascalSegment(segment.replace(/[{}]/g, '')));
  return `${method}${segments.join('')}`;
}

function pascalSegment(segment: string): string {
  return segment
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
}

/** Return `base`, or `base2`/`base3`/… if already taken; records the result in `used`. */
function takeUniqueName(base: string, used: Set<string>): string {
  let name = base;
  let suffix = 2;
  while (used.has(name)) name = `${base}${suffix++}`;
  used.add(name);
  return name;
}

function buildOperation(
  method: HttpMethod,
  path: string,
  operation: Oas3Operation,
  name: string,
  pathLevelParams: ParamModel[],
  doc: Oas3Definition,
  injectable: Set<string>
): OperationModel {
  const operationParams = (operation.parameters ?? []).map((p) =>
    buildParameter(deref<Oas3Parameter>(doc, p), `paths.${path}.${method}.parameters`, doc)
  );

  // Operation-level parameters override path-level ones (by name + in).
  const seen = new Set<string>();
  const allParams: ParamModel[] = [];
  for (const p of operationParams) {
    seen.add(`${p.in}:${p.name}`);
    allParams.push(p);
  }
  for (const p of pathLevelParams) {
    if (!seen.has(`${p.in}:${p.name}`)) {
      allParams.push(p);
    }
  }

  const pathParams = allParams.filter((p) => p.in === 'path');
  const queryParams = allParams.filter((p) => p.in === 'query');
  const headerParams = allParams.filter((p) => p.in === 'header');

  // Browsers own the Cookie header, so the generated client cannot set cookie
  // params — drop them, but tell the user instead of vanishing them silently.
  const cookieParams = allParams.filter((p) => p.in === 'cookie');
  if (cookieParams.length > 0) {
    logger.warn(
      `generate-client: skipped cookie parameter(s) ${cookieParams
        .map((p) => `"${p.name}"`)
        .join(', ')} on operation "${name}" — cookie parameters are not supported.\n`
    );
  }

  const requestBody = operation.requestBody
    ? buildRequestBody(deref(doc, operation.requestBody), `${method} ${path}`, doc)
    : undefined;

  const successResponses = buildSuccessResponses(operation, path, doc);
  const errorResponses = buildErrorResponses(operation, path, doc);
  const security = resolveOperationSecurity(operation, doc, injectable);

  // Extensions aren't in the @redocly operation type — read loosely, like `deprecated`.
  const paginationExtension = (operation as unknown as Record<string, unknown>)['x-pagination'];

  return {
    name,
    method,
    path,
    summary: operation.summary,
    description: operation.description,
    pathParams,
    queryParams,
    headerParams,
    requestBody,
    successResponses,
    errorResponses,
    security,
    tags: Array.isArray(operation.tags) ? operation.tags.filter((t) => typeof t === 'string') : [],
    ...(paginationExtension !== undefined ? { paginationExtension } : {}),
  };
}

function buildParameter(param: Oas3Parameter, location: string, doc: Oas3Definition): ParamModel {
  if (!param.in) {
    throw new NotSupportedError(`Parameter ${param.name} at ${location} is missing "in"`);
  }
  if (!['path', 'query', 'header', 'cookie'].includes(param.in)) {
    throw new NotSupportedError(
      `Unsupported parameter location "${param.in}" for ${param.name} at ${location}`
    );
  }
  let schema = schemaFromSlot(param.schema, `${location}.${param.name}`, doc);

  // OpenAPI lets `deprecated: true` live on the Parameter Object itself, not
  // just on its schema. Fold it into the schema's metadata so the emitter has
  // a single source of truth when rendering tags around this param.
  if ((param as { deprecated?: boolean }).deprecated === true) {
    schema = {
      ...schema,
      metadata: mergeMetadata(schema.metadata, { deprecated: true }),
    };
  }

  const model: ParamModel = {
    name: param.name,
    in: param.in as ParamModel['in'],
    schema,
    required: Boolean(param.required),
    description: param.description,
  };

  // Query-serialization hints (OpenAPI `style`/`explode`/`allowReserved`) live on the
  // Parameter Object and aren't in the @redocly types — read them loosely, like
  // `deprecated`. Only set them for query params, and only when present (absence ⇒
  // the defaults, so the IR stays clean and downstream takes the default path).
  if (model.in === 'query') {
    const p = param as { style?: string; explode?: boolean; allowReserved?: boolean };
    if (
      p.style === 'form' ||
      p.style === 'spaceDelimited' ||
      p.style === 'pipeDelimited' ||
      p.style === 'deepObject'
    ) {
      model.style = p.style;
    }
    if (typeof p.explode === 'boolean') model.explode = p.explode;
    if (typeof p.allowReserved === 'boolean') model.allowReserved = p.allowReserved;
  }

  return model;
}

function buildRequestBody(
  rb: { content?: Record<string, Oas3MediaType>; required?: boolean; description?: string },
  location: string,
  doc: Oas3Definition
): RequestBodyModel | undefined {
  const content = rb.content ?? {};
  // Prefer JSON; fall back to first available.
  const preferred =
    content['application/json'] ??
    content['application/merge-patch+json'] ??
    content['application/x-www-form-urlencoded'] ??
    content['multipart/form-data'] ??
    Object.values(content)[0];
  if (!preferred) return undefined;
  // `preferred` is one of the values we sampled out of `content`, so its key must exist there.
  const contentType = Object.keys(content).find((k) => content[k] === preferred)!;

  const schema = schemaFromSlot(preferred.schema, `${location}.requestBody`, doc);
  return {
    contentType,
    schema,
    required: Boolean(rb.required),
    description: rb.description,
  };
}

function buildSuccessResponses(
  operation: Oas3Operation,
  path: string,
  doc: Oas3Definition
): ResponseBodyModel[] {
  const responses = operation.responses ?? {};
  const successCodes = Object.keys(responses).filter((code) => /^2\d\d$/.test(code));
  if (successCodes.length === 0) {
    if (responses['default']) successCodes.push('default');
  }
  // Pick the first success response.
  const code = successCodes[0];
  if (!code) return [];
  const responseRaw = responses[code];
  if (!responseRaw) return [];
  const response = deref<Oas3ResponseShape>(doc, responseRaw);
  const content = response.content;
  if (!content) return [];

  const status = code === 'default' ? 'default' : Number(code);
  const result: ResponseBodyModel[] = [];
  for (const [contentType, media] of Object.entries(content)) {
    const schema = schemaFromSlot(
      media.schema,
      `paths.${path}.response.${code}.${contentType}`,
      doc
    );
    const itemSlot = media.itemSchema;
    const item =
      itemSlot !== undefined
        ? schemaFromSlot(itemSlot, `paths.${path}.response.${code}.${contentType}.itemSchema`, doc)
        : undefined;
    result.push(
      item === undefined
        ? { contentType, schema, status }
        : { contentType, schema, status, itemSchema: item }
    );
  }
  return result;
}

function buildErrorResponses(
  operation: Oas3Operation,
  path: string,
  doc: Oas3Definition
): ResponseBodyModel[] {
  const responses = operation.responses ?? {};
  const codes = Object.keys(responses).filter((code) => /^[45]\d\d$/.test(code));
  // `default` is an error only when a 2xx success exists; otherwise
  // `buildSuccessResponses` already consumes it as the success response.
  const hasSuccess = Object.keys(responses).some((code) => /^2\d\d$/.test(code));
  if (hasSuccess && responses['default']) codes.push('default');

  const result: ResponseBodyModel[] = [];
  for (const code of codes) {
    const responseRaw = responses[code];
    if (!responseRaw) continue;
    const response = deref<Oas3ResponseShape>(doc, responseRaw);
    const content = response.content;
    if (!content) continue;
    const status = code === 'default' ? 'default' : Number(code);
    for (const [contentType, media] of Object.entries(content)) {
      const schema = schemaFromSlot(
        media.schema,
        `paths.${path}.response.${code}.${contentType}`,
        doc
      );
      result.push({ contentType, schema, status });
    }
  }
  return result;
}

/**
 * Decode a "schema slot" — the referenced-or-inline-or-absent schema position
 * that recurs all over an OpenAPI document (`parameter.schema`, `media.schema`,
 * property values, array `items`, `additionalProperties`) — into a SchemaModel.
 *
 * - absent (`undefined`) or a boolean JSON-Schema → `unknown` (we don't model
 *   boolean schemas; this collapses the "missing schema" fallbacks too).
 * - a `$ref` → a `ref` node carrying the target's local name (the IR keeps
 *   refs un-resolved so named schemas map back to exported types).
 * - an inline schema → recurse via `buildSchema`.
 */
function schemaFromSlot(
  slot: Referenced<Oas3Schema | Oas3_1Schema> | boolean | undefined,
  location: string,
  doc: Oas3Definition
): SchemaModel {
  if (slot === undefined || typeof slot === 'boolean') return { kind: 'unknown' };
  if (isRef(slot)) return { kind: 'ref', name: refName(slot.$ref) };
  return buildSchema(slot as Oas3Schema, location, doc);
}

function buildSchema(schema: Oas3Schema, location: string, doc: Oas3Definition): SchemaModel {
  // Note: every caller checks `isRef(schema)` before invoking this function, so a top-level
  // `{$ref: ...}` never reaches here — see `buildNamedSchemas`, `buildParameter`, etc.
  const metadata = extractMetadata(schema);

  const oneOfish = schema.oneOf ?? schema.anyOf;
  if (oneOfish) {
    const allMembers = oneOfish.map((sub, idx) =>
      isRef(sub)
        ? ({ kind: 'ref', name: refName(sub.$ref) } as SchemaModel)
        : buildSchema(sub as Oas3Schema, `${location}.[${idx}]`, doc)
    );
    // Drop `unknown` members (typeless/empty branches): `T | unknown` collapses to
    // `unknown` in TS, erasing the real members. When only one real member remains,
    // the union degenerates to it.
    const members = dropRedundantUnknown(allMembers);
    // Collapse to the lone member only when dropping `unknown` branches reduced the
    // union to one — an originally single-member union is left as-is.
    if (members.length === 1 && members.length < allMembers.length) {
      const inner = members[0];
      return {
        ...inner,
        description: inner.description ?? schema.description,
        metadata: mergeMetadata(metadata, inner.metadata),
      };
    }
    const discriminator = buildDiscriminator(schema, oneOfish);
    return withMetadata(
      { kind: 'union', members, discriminator, description: schema.description },
      metadata
    );
  }

  if (schema.allOf) {
    const members = schema.allOf.map((sub, idx) =>
      isRef(sub)
        ? ({ kind: 'ref', name: refName(sub.$ref) } as SchemaModel)
        : buildSchema(sub as Oas3Schema, `${location}.allOf[${idx}]`, doc)
    );
    // `allOf` does not replace sibling `properties`: a schema may declare its own
    // object shape (often a `const` discriminant) alongside `allOf`. Fold that own
    // object into the intersection so those properties aren't dropped.
    const ownProperties = buildProperties(schema, location, doc);
    if (ownProperties.length > 0) {
      members.unshift({ kind: 'object', properties: ownProperties });
    }
    if (members.length === 1) {
      // Single-member allOf collapses to its target. Preserve the wrapper's
      // description/metadata only when the inner doesn't already have them.
      const inner = members[0];
      return {
        ...inner,
        description: inner.description ?? schema.description,
        metadata: mergeMetadata(metadata, inner.metadata),
      };
    }
    return withMetadata(
      { kind: 'intersection', members, description: schema.description },
      metadata
    );
  }

  // OpenAPI 3.1 style nullable: `type: ['string', 'null']`.
  const rawType = (schema as { type?: string | string[] }).type;
  if (Array.isArray(rawType)) {
    const nonNull = rawType.filter((t) => t !== 'null');
    const hasNull = rawType.includes('null');
    const baseMembers = nonNull.map((t) => {
      // Strip `null` out of any `enum` before recursing: the array-type null is
      // the single source of nullability here, so the enum branch must not add a
      // second `null` member (and an enum of only `null` would otherwise throw).
      const sub = { ...schema, type: t } as Oas3Schema & { enum?: unknown[] };
      if (Array.isArray(sub.enum)) {
        const filtered = sub.enum.filter((v) => v !== null);
        sub.enum = filtered.length > 0 ? filtered : undefined;
      }
      return buildSchema(sub as Oas3Schema, location, doc);
    });
    if (hasNull) baseMembers.push({ kind: 'null' });
    if (baseMembers.length === 1) {
      return baseMembers[0];
    }
    return withMetadata(
      { kind: 'union', members: baseMembers, description: schema.description },
      metadata
    );
  }

  // OpenAPI 3.0 nullable.
  if ((schema as { nullable?: boolean }).nullable) {
    const base = buildSchema(
      { ...(schema as object), nullable: undefined } as Oas3Schema,
      location,
      doc
    );
    return {
      kind: 'union',
      members: [base, { kind: 'null' }],
      description: schema.description,
    };
  }

  if ((schema as { const?: unknown }).const !== undefined) {
    const value = (schema as { const: unknown }).const;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new NotSupportedError(
        `Unsupported const value at ${location}: ${JSON.stringify(value)}`
      );
    }
    return withMetadata({ kind: 'literal', value, description: schema.description }, metadata);
  }

  if (schema.enum) {
    // OAS 3.1 allows `null` among enum values. Model it as `<enum> | null` and
    // keep the enum itself null-free so scalar inference stays simple.
    const rawValues = schema.enum as unknown[];
    const nonNullValues = rawValues.filter((v) => v !== null) as Array<string | number | boolean>;
    const enumHasNull = nonNullValues.length !== rawValues.length;
    if (nonNullValues.length === 0) {
      return withMetadata({ kind: 'null', description: schema.description }, metadata);
    }
    const scalar = scalarForEnumValues(nonNullValues, location);
    // A boolean `enum` conveys no useful narrowing: `[true, false]` is just `boolean`, and a
    // single-value `[false]`/`[true]` is a spec quirk, not an intended literal type. Widen to
    // `boolean` so a normal boolean field never becomes a literal. (`const: false` stays a
    // literal — that's an explicit, deliberate single-value constraint, handled above.)
    const base: SchemaModel =
      scalar === 'boolean'
        ? { kind: 'scalar', scalar: 'boolean', description: schema.description }
        : { kind: 'enum', values: nonNullValues, scalar, description: schema.description };
    if (enumHasNull) {
      return withMetadata(
        { kind: 'union', members: [base, { kind: 'null' }], description: schema.description },
        metadata
      );
    }
    return withMetadata(base, metadata);
  }

  const type = rawType;

  if (type === 'null') {
    // OAS 3.1 single null type — a value that is always `null` (e.g. a field a
    // variant pins to null). Without this it would fall through to `unknown`.
    return withMetadata({ kind: 'null', description: schema.description }, metadata);
  }

  if (type === 'array') {
    const itemsRaw = (schema as { items?: Referenced<Oas3Schema> | boolean }).items;
    const items = schemaFromSlot(itemsRaw, `${location}.items`, doc);
    return withMetadata({ kind: 'array', items, description: schema.description }, metadata);
  }

  if (type === 'object' || schema.properties || schema.additionalProperties) {
    const properties = buildProperties(schema, location, doc);
    const additional = (
      schema as { additionalProperties?: boolean | Oas3Schema | { $ref: string } }
    ).additionalProperties;

    if (properties.length === 0 && additional !== false) {
      // A property-less object accepts arbitrary keys: OpenAPI defaults absent
      // `additionalProperties` to allowed. Emit a record — of the declared
      // additionalProperties schema, or `unknown` when it's absent/`true` — rather
      // than `{}`, which in TS forbids member access. An explicit
      // `additionalProperties: false` is closed and stays an empty object.
      const value = schemaFromSlot(additional, `${location}.additionalProperties`, doc);
      return withMetadata({ kind: 'record', value, description: schema.description }, metadata);
    }

    return withMetadata({ kind: 'object', properties, description: schema.description }, metadata);
  }

  if (type === 'string' || type === 'number' || type === 'integer' || type === 'boolean') {
    return withMetadata(
      { kind: 'scalar', scalar: type, description: schema.description },
      metadata
    );
  }

  // No usable type information — fall back to `unknown` instead of erroring,
  // so generation still succeeds for sparsely-typed schemas.
  return withMetadata({ kind: 'unknown', description: schema.description }, metadata);
}

function scalarForEnumValues(values: unknown[], location: string): ScalarKind {
  let hasStr = false;
  let hasNum = false;
  let hasBool = false;
  for (const v of values) {
    if (typeof v === 'string') hasStr = true;
    else if (typeof v === 'number') hasNum = true;
    else if (typeof v === 'boolean') hasBool = true;
    else
      throw new NotSupportedError(
        `Unsupported enum value type at ${location}: ${JSON.stringify(v)}`
      );
  }
  if (hasStr && !hasNum && !hasBool) return 'string';
  if (hasNum && !hasStr && !hasBool) return 'number';
  if (hasBool && !hasStr && !hasNum) return 'boolean';
  return 'string';
}

function buildProperties(
  schema: Oas3Schema,
  location: string,
  doc: Oas3Definition
): PropertyModel[] {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  return Object.entries(props).map(([name, sub]) => {
    const readOnly = !isRef(sub) && (sub as { readOnly?: boolean }).readOnly === true;
    return {
      name,
      schema: schemaFromSlot(sub, `${location}.${name}`, doc),
      required: required.has(name),
      description: (sub as { description?: string }).description,
      ...(readOnly ? { readOnly: true } : {}),
    };
  });
}
