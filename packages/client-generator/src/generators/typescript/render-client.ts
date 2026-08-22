import {
  allOperations,
  type ApiModel,
  type ArgsStyle,
  type DateType,
  type ErrorMode,
  type ModelPagination,
  type NamedSchemaModel,
  type OperationModel,
  type ParamModel,
  type RequestBodyModel,
  type ResponseBodyModel,
  type SchemaModel,
} from '@redocly/client-generator';
// The operation-level renderers behind the client assembly: the `Ops` type map,
// the `<Op>*` alias cluster, the flat call sugar, and the split layout's schema
// import list — all derived from the IR and the shared `EmitContext`.
import { pascalCase, safeIdent } from '@redocly/client-generator/printers/typescript';

import { operationSignature, templatePathParams } from './operation-signature.ts';
import { isTypedMultipart } from './operation-types.ts';
import { responseHeadersTypeText } from './response-headers.ts';
import { tsJsdoc, tsType } from './ts-type.ts';

/**
 * The emit configuration every operation shares. Bundling it into one value keeps
 * it out of the positional parameter lists of the operation emitters (which would
 * otherwise thread the same arguments through every layer, inviting transposition
 * bugs). Per-call structural data (response type, ordered path params, …) stays an
 * explicit argument; only this cross-cutting config travels as `ctx`.
 */
export type EmitContext = {
  argsStyle: ArgsStyle;
  errorMode: ErrorMode;
  dateType: DateType;
  /** Names of every exported schema, used for `<Op>*` alias collision suppression. */
  schemaNames: Set<string>;
  /** Named schemas — used to resolve `$ref` / `allOf` wrappers on response-header types. */
  schemas?: readonly NamedSchemaModel[];
  /** Resolved auto-pagination per operation name (absent ⇒ nothing paginates). */
  pagination?: ModelPagination;
};

const INDENT = '    ';

/** The request-body TS type: special wrapper types per content-type, else the schema. */
export function bodyTypeText(rb: RequestBodyModel, dateType: DateType, indent = ''): string {
  if (isTypedMultipart(rb)) return tsType(rb.schema, dateType, indent);
  switch (rb.contentType) {
    case 'multipart/form-data':
      return 'FormData';
    case 'application/x-www-form-urlencoded':
      return 'URLSearchParams';
    case 'application/octet-stream':
      return 'Blob | ArrayBuffer';
    default:
      return tsType(rb.schema, dateType, indent);
  }
}

/** The `{ … }` type literal for a params object (query or headers), with per-prop JSDoc. */
export function paramsTypeText(params: ParamModel[], dateType: DateType, indent = ''): string {
  const inner = indent + INDENT;
  const lines = params.flatMap((param) => [
    ...tsJsdoc(param.description, param.schema.metadata, inner),
    `${inner}${safeIdent(param.name)}${param.required ? '' : '?'}: ${tsType(param.schema, dateType, inner)};`,
  ]);
  return lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n${indent}}`;
}

/** The success-response type + kind (JSON preferred; binary/text fall back; deduped union). */
export function responseText(
  responses: ResponseBodyModel[],
  dateType: DateType,
  indent = ''
): { type: string; kind: 'json' | 'blob' | 'text' | 'void' } {
  if (responses.length === 0) return { type: 'void', kind: 'void' };
  const jsonResponse = responses.find((r) => r.contentType.toLowerCase().includes('json'));
  if (jsonResponse) return { type: tsType(jsonResponse.schema, dateType, indent), kind: 'json' };
  const members: string[] = [];
  const seen = new Set<string>();
  let hasBinary = false;
  let hasText = false;
  for (const response of responses) {
    let member: string;
    if (
      response.contentType.startsWith('image/') ||
      response.contentType === 'application/octet-stream'
    ) {
      member = 'Blob';
      hasBinary = true;
    } else if (response.contentType.startsWith('text/')) {
      member = 'string';
      hasText = true;
    } else {
      member = tsType(response.schema, dateType, indent);
    }
    if (seen.has(member)) continue;
    seen.add(member);
    members.push(member);
  }
  return { type: members.join(' | '), kind: hasBinary ? 'blob' : hasText ? 'text' : 'json' };
}

/** The deduped error-response body types, or `[]` when none. */
export function errorTypeTexts(
  responses: ResponseBodyModel[],
  dateType: DateType,
  indent = ''
): string[] {
  const seen = new Set<string>();
  const members: string[] = [];
  for (const response of responses) {
    const member = tsType(response.schema, dateType, indent);
    if (seen.has(member)) continue;
    seen.add(member);
    members.push(member);
  }
  return members;
}

/** The TS type of a streamed event payload (`string` when no schema is declared). */
function sseEventText(op: OperationModel, dateType: DateType, indent = ''): string {
  const schema = op.sse?.eventSchema;
  return schema ? tsType(schema, dateType, indent) : 'string';
}

/** A `<key>(?): <Alias>` line, inlining the type when `<Alias>` collides with a schema. */
function inputPropLine(
  key: string,
  alias: string,
  inlineType: () => string,
  required: boolean,
  schemaNames: Set<string>,
  indent: string
): string {
  const type = schemaNames.has(alias) ? inlineType() : alias;
  return `${indent}${key}${required ? '' : '?'}: ${type};`;
}

/** The named schema a `ref` chain ends at, for deciding whether a body can merge. */
function resolvedSchema(
  schema: SchemaModel,
  schemas: readonly NamedSchemaModel[] | undefined
): SchemaModel | undefined {
  const seen = new Set<string>();
  let current = schema;
  while (current.kind === 'ref') {
    const { name } = current;
    if (seen.has(name)) return undefined;
    seen.add(name);
    const named = schemas?.find((candidate) => candidate.name === name);
    if (named === undefined) return undefined;
    current = named.schema;
  }
  return current;
}

/**
 * The property names of a body a merged call spreads. An `allOf` composition contributes the
 * names of every member, because that is what the merged object ends up carrying; a member
 * that is not an object makes the whole body unspreadable.
 */
function mergedBodyProperties(
  schema: SchemaModel,
  schemas: readonly NamedSchemaModel[] | undefined
): string[] | undefined {
  const resolved = resolvedSchema(schema, schemas);
  if (resolved?.kind === 'object') return resolved.properties.map((property) => property.name);
  if (resolved?.kind !== 'intersection') return undefined;
  // Deduplicated: `allOf` members routinely redeclare a property to refine it, and the
  // merged body still carries one key for it — counting it twice would read as a collision
  // and push a mergeable operation back to the namespaced shape.
  const names = new Set<string>();
  for (const member of resolved.members) {
    const memberNames = mergedBodyProperties(member, schemas);
    if (memberNames === undefined) return undefined;
    for (const name of memberNames) names.add(name);
  }
  return [...names];
}

/**
 * How a flat-style call spells one operation's inputs. Every parameter sits at one level,
 * and a REQUIRED object body contributes its own properties — an optional body cannot
 * (omitting it and omitting its required properties would look the same), and neither can
 * an array, scalar, or binary body, so those keep the `body` key.
 *
 * When one name appears in two layers (a path and a query parameter of the same name, which
 * OpenAPI permits) a merged call cannot say which is which, so that operation keeps the
 * namespaced shape. The caller reports it once.
 */
export function flatInputShape(
  op: OperationModel,
  schemas: readonly NamedSchemaModel[] | undefined
): { mergeBody: boolean } | { collisions: string[] } {
  const params = [
    ...templatePathParams(op),
    ...op.queryParams,
    ...op.headerParams,
    ...op.cookieParams,
  ];
  const bodyProperties =
    (op.requestBody?.required ?? false) && op.requestBody !== undefined
      ? mergedBodyProperties(op.requestBody.schema, schemas)
      : undefined;
  const mergeBody = bodyProperties !== undefined;
  const counts = new Map<string, number>();
  for (const param of params) counts.set(param.name, (counts.get(param.name) ?? 0) + 1);
  // An unmerged body keeps the `body` key, which a parameter of that name would shadow.
  if (op.requestBody && !mergeBody) counts.set('body', (counts.get('body') ?? 0) + 1);
  for (const property of bodyProperties ?? []) {
    counts.set(property, (counts.get(property) ?? 0) + 1);
  }
  const collisions = [...counts].filter(([, count]) => count > 1).map(([paramName]) => paramName);
  return collisions.length > 0 ? { collisions } : { mergeBody };
}

/** `<key>: <type>` lines for parameters written at one level (the merged, flat shape). */
function mergedParamLines(params: ParamModel[], ctx: EmitContext, inner: string): string[] {
  return params.flatMap((param) => [
    ...tsJsdoc(param.description, param.schema.metadata, inner),
    `${inner}${safeIdent(param.name)}${param.required ? '' : '?'}: ${tsType(param.schema, ctx.dateType, inner)};`,
  ]);
}

/** The `<Op>Variables` object type literal (see operation-aliases.ts for the contract). */
export function variablesTypeText(
  op: OperationModel,
  name: string,
  ctx: EmitContext,
  indent = ''
): string {
  const { dateType, schemaNames } = ctx;
  const inner = indent + INDENT;
  const flat = ctx.argsStyle === 'flat' ? flatInputShape(op, ctx.schemas) : undefined;
  if (flat !== undefined && 'mergeBody' in flat) {
    return mergedVariablesText(op, name, ctx, flat.mergeBody, indent);
  }
  const lines: string[] = [];
  const pathParams = templatePathParams(op);
  if (pathParams.length > 0) {
    lines.push(
      inputPropLine(
        'path',
        `${name}Path`,
        () => paramsTypeText(pathParams, dateType, inner),
        true,
        schemaNames,
        inner
      )
    );
  }
  if (op.queryParams.length > 0) {
    lines.push(
      inputPropLine(
        'query',
        `${name}Query`,
        () => paramsTypeText(op.queryParams, dateType, inner),
        op.queryParams.some((p) => p.required),
        schemaNames,
        inner
      )
    );
  }
  if (op.requestBody) {
    lines.push(
      inputPropLine(
        'body',
        `${name}Body`,
        () => bodyTypeText(op.requestBody!, dateType, inner),
        op.requestBody.required,
        schemaNames,
        inner
      )
    );
  }
  if (op.headerParams.length > 0) {
    lines.push(
      inputPropLine(
        'headers',
        `${name}Headers`,
        () => paramsTypeText(op.headerParams, dateType, inner),
        op.headerParams.some((p) => p.required),
        schemaNames,
        inner
      )
    );
  }
  if (op.cookieParams.length > 0) {
    lines.push(
      inputPropLine(
        'cookies',
        `${name}Cookies`,
        () => paramsTypeText(op.cookieParams, dateType, inner),
        op.cookieParams.some((p) => p.required),
        schemaNames,
        inner
      )
    );
  }
  return lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n${indent}}`;
}

/**
 * The merged (`argsStyle: flat`) `<Op>Variables`: every parameter at one level, intersected
 * with the body alias when the body merges. Intersecting reuses the `<Op>Body` alias rather
 * than reprinting its properties, so one body type stays one type.
 */
function mergedVariablesText(
  op: OperationModel,
  name: string,
  ctx: EmitContext,
  mergeBody: boolean,
  indent: string
): string {
  const inner = indent + INDENT;
  const lines = mergedParamLines(
    [...templatePathParams(op), ...op.queryParams, ...op.headerParams, ...op.cookieParams],
    ctx,
    inner
  );
  if (op.requestBody && !mergeBody) {
    lines.push(
      inputPropLine(
        'body',
        `${name}Body`,
        () => bodyTypeText(op.requestBody!, ctx.dateType, inner),
        op.requestBody.required,
        ctx.schemaNames,
        inner
      )
    );
  }
  const bodyRef = ctx.schemaNames.has(`${name}Body`)
    ? bodyTypeText(op.requestBody!, ctx.dateType, indent)
    : `${name}Body`;
  const object = lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n${indent}}`;
  if (!mergeBody) return object;
  return lines.length === 0 ? bodyRef : `${object} & ${bodyRef}`;
}

/** The raw success ref: the `<Op>Result` alias, or the inline type when that name collides. */
function rawResultText(op: OperationModel, ctx: EmitContext, indent: string): string {
  const resultName = `${pascalCase(op.name)}Result`;
  return ctx.schemaNames.has(resultName)
    ? responseText(op.successResponses, ctx.dateType, indent).type
    : resultName;
}

/** The `Result<…, E>` error argument (result mode): `unknown`, the alias, or the inline union. */
function errorArgText(op: OperationModel, ctx: EmitContext, indent: string): string {
  const members = errorTypeTexts(op.errorResponses, ctx.dateType, indent);
  if (members.length === 0) return 'unknown';
  const alias = `${pascalCase(op.name)}Error`;
  if (!ctx.schemaNames.has(alias)) return alias;
  return members.join(' | ');
}

/** `export type Ops = { <ident>: { args; result; item?; page?; kind? } }` — what `createClient<Ops>` consumes. */
export function renderOpsType(
  model: ApiModel,
  idents: Map<string, string>,
  ctx: EmitContext
): string {
  const ops = allOperations(model.services);
  if (ops.length === 0) return '';
  const memberBlocks = ops.flatMap((op) => {
    const ident = idents.get(op.name)!;
    const name = pascalCase(op.name);
    const inner = INDENT + INDENT;
    const args = variablesTypeText(op, name, ctx, inner);
    const sse = op.sse !== undefined;
    const result = sse
      ? sseEventText(op, ctx.dateType, inner)
      : ctx.errorMode === 'result'
        ? `Result<${rawResultText(op, ctx, inner)}, ${errorArgText(op, ctx, inner)}>`
        : rawResultText(op, ctx, inner);
    const lines = [`${inner}args: ${args};`, `${inner}result: ${result};`];
    // Result-mode entries mark themselves so the runtime's mapped methods skip the
    // throw-only envelope typing; declared headers type the `{ envelope: true }` bag.
    if (ctx.errorMode === 'result' && !sse) lines.push(`${inner}mode: "result";`);
    const responseHeaders = op.successResponseHeaders;
    if (responseHeaders && responseHeaders.length > 0) {
      lines.push(
        `${inner}headers: ${responseHeadersTypeText(responseHeaders, ctx.schemas, inner)};`
      );
    }
    const paginated = ctx.pagination?.get(op.name);
    if (paginated) {
      lines.push(`${inner}item: ${tsType(paginated.itemSchema, ctx.dateType, inner)};`);
      if (ctx.errorMode === 'result') {
        lines.push(`${inner}page: ${rawResultText(op, ctx, inner)};`);
      }
    }
    if (sse) lines.push(`${inner}kind: "sse";`);
    return [`${INDENT}${ident}: {`, ...lines, `${INDENT}};`];
  });
  return [
    ...tsJsdoc(
      "Per-operation `args`/`result` shapes (plus `kind: 'sse'` for event streams) — the\n" +
        'type-level companion of `OPERATIONS` that gives `createClient<Ops>` its typed methods.',
      undefined,
      ''
    ),
    'export type Ops = {',
    ...memberBlocks,
    '};',
  ].join('\n');
}

/** One operation's `<Op>*` aliases (Result/Error/Path/Query/Body/Headers/Cookies/Variables), collision-suppressed. */
export function renderAliases(op: OperationModel, ctx: EmitContext): string {
  const { dateType, schemaNames } = ctx;
  const name = pascalCase(op.name);
  const sse = op.sse !== undefined;
  const { hasInputs } = operationSignature(op);
  const blocks: string[] = [];

  if (!sse) {
    const resultName = `${name}Result`;
    if (!schemaNames.has(resultName)) {
      blocks.push(
        `export type ${resultName} = ${responseText(op.successResponses, dateType).type};`
      );
    }
    if (ctx.errorMode === 'result') {
      const members = errorTypeTexts(op.errorResponses, dateType);
      const errorAlias = `${name}Error`;
      if (members.length > 0 && !schemaNames.has(errorAlias)) {
        blocks.push(`export type ${errorAlias} = ${members.join(' | ')};`);
      }
    }
  }
  const pathParams = templatePathParams(op);
  if (pathParams.length > 0 && !schemaNames.has(`${name}Path`)) {
    blocks.push(`export type ${name}Path = ${paramsTypeText(pathParams, dateType)};`);
  }
  if (op.queryParams.length > 0 && !schemaNames.has(`${name}Query`)) {
    blocks.push(`export type ${name}Query = ${paramsTypeText(op.queryParams, dateType)};`);
  }
  if (op.requestBody && !schemaNames.has(`${name}Body`)) {
    blocks.push(`export type ${name}Body = ${bodyTypeText(op.requestBody, dateType)};`);
  }
  if (op.headerParams.length > 0 && !schemaNames.has(`${name}Headers`)) {
    blocks.push(`export type ${name}Headers = ${paramsTypeText(op.headerParams, dateType)};`);
  }
  // Response headers (envelope) — distinct from request `<Op>Headers`.
  const responseHeaders = op.successResponseHeaders;
  if (responseHeaders && responseHeaders.length > 0 && !schemaNames.has(`${name}ResponseHeaders`)) {
    blocks.push(
      `export type ${name}ResponseHeaders = ${responseHeadersTypeText(responseHeaders, ctx.schemas)};`
    );
  }
  if (op.cookieParams.length > 0 && !schemaNames.has(`${name}Cookies`)) {
    blocks.push(`export type ${name}Cookies = ${paramsTypeText(op.cookieParams, dateType)};`);
  }
  if (hasInputs && !schemaNames.has(`${name}Variables`)) {
    blocks.push(`export type ${name}Variables = ${variablesTypeText(op, name, ctx)};`);
  }
  return blocks.join('\n\n');
}

/**
 * Schema names the ENTRY file's own types reference — the split layout's type-only
 * import list. Derived from the IR (the exact sources the alias/Ops renderers type):
 * every ref reachable from operation inputs, success responses, error responses
 * (result mode only — throw mode never renders them), and pagination item schemas.
 * Named schema BODIES are not expanded: a ref renders as its bare name.
 */
export function collectEntrySchemaRefs(model: ApiModel, ctx: EmitContext): string[] {
  const referenced = new Set<string>();
  const walk = (schema: SchemaModel): void => {
    switch (schema.kind) {
      case 'ref':
        referenced.add(schema.name);
        return;
      case 'omit':
        referenced.add(schema.base);
        return;
      case 'array':
        walk(schema.items);
        return;
      case 'record':
        walk(schema.value);
        return;
      case 'object':
        for (const property of schema.properties) walk(property.schema);
        return;
      case 'union':
      case 'intersection':
        for (const member of schema.members) walk(member);
        return;
      default:
        return;
    }
  };
  for (const op of allOperations(model.services)) {
    for (const param of [
      ...op.pathParams,
      ...op.queryParams,
      ...op.headerParams,
      ...op.cookieParams,
    ]) {
      walk(param.schema);
    }
    if (op.requestBody) walk(op.requestBody.schema);
    for (const response of op.successResponses) {
      walk(response.schema);
      // SSE responses type their event payload from the stream's item schema.
      if (response.itemSchema) walk(response.itemSchema);
    }
    if (ctx.errorMode === 'result') {
      for (const response of op.errorResponses) walk(response.schema);
    }
    const paginated = ctx.pagination?.get(op.name);
    if (paginated) walk(paginated.itemSchema);
  }
  return [...referenced].filter((name) => ctx.schemaNames.has(name)).sort();
}
