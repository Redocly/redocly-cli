// Success-response header helpers: descriptor parse hints + Ops / alias type text
// for throw-mode `{ envelope: true }`.

import {
  headerCoerceType,
  type NamedSchemaModel,
  type ResponseHeaderModel,
  type ResponseHeaderSpec,
  type SchemaModel,
} from '@redocly/client-generator';
import { headerPropertyKey, uniqueIdent } from '@redocly/client-generator/printers/typescript';

const INDENT = '    ';

type PlannedResponseHeader = ResponseHeaderModel & {
  key: string;
  type: ResponseHeaderSpec['type'];
};

/**
 * Runtime coerce hint from a header schema (complex schemas fall back to string).
 * Delegates to the neutral `headerCoerceType`; JavaScript has one number type,
 * so `integer` collapses to `number`.
 */
export function headerParseType(
  schema: SchemaModel,
  schemas: readonly NamedSchemaModel[] = []
): ResponseHeaderSpec['type'] {
  const coerce = headerCoerceType(schema, { schemas });
  return coerce === 'integer' ? 'number' : coerce;
}

/** Descriptor `responseHeaders` entries from the success response's declared headers. */
export function responseHeaderSpecs(
  headers: ResponseHeaderModel[] | undefined,
  schemas: readonly NamedSchemaModel[] = []
): ResponseHeaderSpec[] | undefined {
  const planned = planResponseHeaders(headers, schemas);
  if (planned.length === 0) return undefined;
  return planned.map((header) => ({
    name: header.name,
    key: header.key,
    type: header.type,
  }));
}

/** Type-literal text for Ops.`headers` / `<Op>ResponseHeaders`, rendered at `indent`. */
export function responseHeadersTypeText(
  headers: ResponseHeaderModel[],
  schemas: readonly NamedSchemaModel[] = [],
  indent = ''
): string {
  const inner = indent + INDENT;
  const lines = planResponseHeaders(headers, schemas).map(
    (header) => `${inner}${header.key}${header.required === true ? '' : '?'}: ${header.type};`
  );
  return lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n${indent}}`;
}

function planResponseHeaders(
  headers: ResponseHeaderModel[] | undefined,
  schemas: readonly NamedSchemaModel[]
): PlannedResponseHeader[] {
  const used = new Set<string>();
  return (headers ?? []).map((header) => ({
    ...header,
    key: uniqueIdent(headerPropertyKey(header.name), used),
    type: headerParseType(header.schema, schemas),
  }));
}
