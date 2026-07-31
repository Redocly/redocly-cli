// Success-response header helpers: descriptor parse hints + Ops / alias type shapes
// for throw-mode `{ envelope: true }`.

import type { ResponseHeaderModel, SchemaModel } from '../intermediate-representation/model.js';
import type { ResponseHeaderSpec } from '../runtime/types.js';
import { uniqueIdent } from './identifier.js';
import { headerPropertyKey } from './support.js';
import { ts } from './ts.js';

const { factory } = ts;

type PlannedResponseHeader = ResponseHeaderModel & {
  key: string;
  type: ResponseHeaderSpec['type'];
};

/** Runtime coerce hint from a header schema (complex schemas fall back to string). */
export function headerParseType(schema: SchemaModel): ResponseHeaderSpec['type'] {
  if (schema.kind === 'scalar') {
    if (schema.scalar === 'integer' || schema.scalar === 'number') return 'number';
    if (schema.scalar === 'boolean') return 'boolean';
  }
  if (schema.kind === 'literal') {
    if (typeof schema.value === 'number') return 'number';
    if (typeof schema.value === 'boolean') return 'boolean';
  }
  if (schema.kind === 'enum') {
    if (schema.scalar === 'integer' || schema.scalar === 'number') return 'number';
    if (schema.scalar === 'boolean') return 'boolean';
  }
  return 'string';
}

/** Descriptor `responseHeaders` entries from the success response's declared headers. */
export function responseHeaderSpecs(
  headers: ResponseHeaderModel[] | undefined
): ResponseHeaderSpec[] | undefined {
  const planned = planResponseHeaders(headers);
  if (planned.length === 0) return undefined;
  return planned.map((header) => ({
    name: header.name,
    key: header.key,
    type: header.type,
  }));
}

/** Type literal for Ops.`headers` / `<Op>ResponseHeaders`. */
export function responseHeadersTypeLiteral(headers: ResponseHeaderModel[]): ts.TypeNode {
  return factory.createTypeLiteralNode(
    planResponseHeaders(headers).map((header) => {
      return factory.createPropertySignature(
        undefined,
        factory.createIdentifier(header.key),
        header.required === true ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
        headerTypeNode(header.type)
      );
    })
  );
}

function planResponseHeaders(headers: ResponseHeaderModel[] | undefined): PlannedResponseHeader[] {
  const used = new Set<string>();
  return (headers ?? []).map((header) => ({
    ...header,
    key: uniqueIdent(headerPropertyKey(header.name), used),
    type: headerParseType(header.schema),
  }));
}

function headerTypeNode(type: ResponseHeaderSpec['type']): ts.TypeNode {
  if (type === 'number') return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  if (type === 'boolean') return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}
