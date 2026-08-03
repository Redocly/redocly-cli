// The operation-level renderers behind the client assembly: the `Ops` type map,
// the `<Op>*` alias cluster, the flat call sugar, and the split layout's schema
// import list — all derived from the IR and the shared `EmitContext`.

import {
  allOperations,
  type ApiModel,
  type OperationModel,
  type ParamModel,
  type RequestBodyModel,
  type ResponseBodyModel,
  type SchemaModel,
} from '../intermediate-representation/model.js';
import { isIdentifier, safeIdent } from './identifier.js';
import { operationSignature } from './operation-signature.js';
import { isTypedMultipart } from './operation-types.js';
import type { EmitContext } from './operations.js';
import { eventSchema, isSseOp } from './sse.js';
import { pascalCase } from './support.js';
import { tsJsdoc, tsType } from './ts-type.js';
import type { DateType } from './types.js';

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
  const schema = eventSchema(op);
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

/** The `<Op>Variables` object type literal (see operation-aliases.ts for the contract). */
export function variablesTypeText(
  op: OperationModel,
  name: string,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext,
  pathKeys: 'ident' | 'wire',
  indent = ''
): string {
  const { dateType, schemaNames } = ctx;
  const inner = indent + INDENT;
  const lines: string[] = [];
  for (const param of orderedPathParams) {
    const key = pathKeys === 'wire' ? safeIdent(param.name) : pathParamIdent.get(param.name)!;
    lines.push(
      ...tsJsdoc(param.description, param.schema.metadata, inner),
      `${inner}${key}: ${tsType(param.schema, dateType, inner)};`
    );
  }
  if (op.queryParams.length > 0) {
    lines.push(
      inputPropLine(
        'params',
        `${name}Params`,
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
    const { pathParams } = operationSignature(op);
    const inner = INDENT + INDENT;
    const args = variablesTypeText(
      op,
      name,
      pathParams.map((p) => p.param),
      new Map(pathParams.map((p) => [p.param.name, p.ident])),
      ctx,
      'wire',
      inner
    );
    const sse = isSseOp(op);
    const result = sse
      ? sseEventText(op, ctx.dateType, inner)
      : ctx.errorMode === 'result'
        ? `Result<${rawResultText(op, ctx, inner)}, ${errorArgText(op, ctx, inner)}>`
        : rawResultText(op, ctx, inner);
    const lines = [`${inner}args: ${args};`, `${inner}result: ${result};`];
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

/** One operation's `<Op>*` aliases (Result/Error/Params/Body/Headers/Cookies/Variables), collision-suppressed. */
export function renderAliases(
  op: OperationModel,
  ctx: EmitContext,
  pathKeys: 'ident' | 'wire'
): string {
  const { dateType, schemaNames } = ctx;
  const name = pascalCase(op.name);
  const sse = isSseOp(op);
  const { pathParams, hasInputs } = operationSignature(op);
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
  if (op.queryParams.length > 0 && !schemaNames.has(`${name}Params`)) {
    blocks.push(`export type ${name}Params = ${paramsTypeText(op.queryParams, dateType)};`);
  }
  if (op.requestBody && !schemaNames.has(`${name}Body`)) {
    blocks.push(`export type ${name}Body = ${bodyTypeText(op.requestBody, dateType)};`);
  }
  if (op.headerParams.length > 0 && !schemaNames.has(`${name}Headers`)) {
    blocks.push(`export type ${name}Headers = ${paramsTypeText(op.headerParams, dateType)};`);
  }
  if (op.cookieParams.length > 0 && !schemaNames.has(`${name}Cookies`)) {
    blocks.push(`export type ${name}Cookies = ${paramsTypeText(op.cookieParams, dateType)};`);
  }
  if (hasInputs && !schemaNames.has(`${name}Variables`)) {
    const variables = variablesTypeText(
      op,
      name,
      pathParams.map((p) => p.param),
      new Map(pathParams.map((p) => [p.param.name, p.ident])),
      ctx,
      pathKeys
    );
    blocks.push(`export type ${name}Variables = ${variables};`);
  }
  return blocks.join('\n\n');
}

/** The flat sugar's parameter list (path args, slots, trailing `init`), as text. */
function argListText(
  op: OperationModel,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext
): string {
  const { dateType } = ctx;
  const args: string[] = orderedPathParams.map(
    (param) => `${pathParamIdent.get(param.name)!}: ${tsType(param.schema, dateType)}`
  );
  const slot = (name: string, params: ParamModel[]) =>
    `${name}: ${paramsTypeText(params, dateType)}${params.some((p) => p.required) ? '' : ' = {}'}`;
  if (op.queryParams.length > 0) args.push(slot('params', op.queryParams));
  if (op.requestBody) {
    args.push(
      `body${op.requestBody.required ? '' : '?'}: ${bodyTypeText(op.requestBody, dateType)}`
    );
  }
  if (op.headerParams.length > 0) args.push(slot('headers', op.headerParams));
  if (op.cookieParams.length > 0) args.push(slot('cookies', op.cookieParams));
  args.push(`init: ${isSseOp(op) ? 'SseOptions' : 'RequestOptions'} = {}`);
  return args.join(', ');
}

/** One flat one-liner: the positional signature forwarding to the grouped client method. */
export function renderFlatSugar(op: OperationModel, ident: string, ctx: EmitContext): string {
  const { pathParams } = operationSignature(op);
  const params = argListText(
    op,
    pathParams.map((p) => p.param),
    new Map(pathParams.map((p) => [p.param.name, p.ident])),
    ctx
  );
  const props: string[] = pathParams.map(({ param, ident: paramIdent }) =>
    param.name === paramIdent
      ? paramIdent
      : `${isIdentifier(param.name) ? param.name : JSON.stringify(param.name)}: ${paramIdent}`
  );
  if (op.queryParams.length > 0) props.push('params');
  if (op.requestBody) props.push('body');
  if (op.headerParams.length > 0) props.push('headers');
  if (op.cookieParams.length > 0) props.push('cookies');
  const args = props.length === 0 ? '{}' : `{ ${props.join(', ')} }`;
  const fn = `(${params}) => client.${ident}(${args}, init)`;
  if (!ctx.pagination?.has(op.name)) return `export const ${ident} = ${fn};`;
  return `export const ${ident} = Object.assign(${fn}, { pages: client.${ident}.pages, items: client.${ident}.items });`;
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
