// The text-template client assembly — a DEEP module: its lasting public surface is
// the same two functions client-assembly.ts exposes today (single-file / split
// emission); everything below is internal plumbing that used to be spread across
// operation-types / operation-aliases / descriptor as AST builders. The part
// renderers are exported for the printer-equivalence tests only, and the exports
// shrink to the assembly seam when the flip lands.

import {
  allOperations,
  type ApiModel,
  type OperationModel,
  type ParamModel,
  type RequestBodyModel,
  type ResponseBodyModel,
} from '../intermediate-representation/model.js';
import { safeIdent } from './identifier.js';
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

/** The `Ops` type map — text twin of `opsInterfaceStatements` (printer-equivalence-pinned). */
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

/** One operation's `<Op>*` aliases — text twin of the alias cluster (equivalence-pinned). */
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
