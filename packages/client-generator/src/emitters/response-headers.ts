// Success-response header helpers: descriptor parse hints + Ops / alias type text
// for throw-mode `{ envelope: true }`.

import type {
  NamedSchemaModel,
  ResponseHeaderModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { ResponseHeaderSpec } from '../runtime/types.js';
import { uniqueIdent } from './identifier.js';
import { headerPropertyKey } from './support.js';

const INDENT = '    ';

type PlannedResponseHeader = ResponseHeaderModel & {
  key: string;
  type: ResponseHeaderSpec['type'];
};

/**
 * Runtime coerce hint from a header schema (complex schemas fall back to string).
 * Resolves `$ref` through `schemas`, peels nullable unions and metadata-only
 * `allOf` intersections, then maps scalar/literal/enum leaves to number/boolean.
 */
export function headerParseType(
  schema: SchemaModel,
  schemas: readonly NamedSchemaModel[] = [],
  seen: Set<string> = new Set()
): ResponseHeaderSpec['type'] {
  if (schema.kind === 'ref') {
    if (seen.has(schema.name)) return 'string';
    seen.add(schema.name);
    const named = schemas.find((entry) => entry.name === schema.name);
    if (named === undefined) return 'string';
    return headerParseType(named.schema, schemas, seen);
  }
  if (schema.kind === 'intersection') {
    // Drop unknown members (constraint-only allOf branches) and unwrap a sole remainder.
    const members = schema.members.filter((member) => member.kind !== 'unknown');
    if (members.length === 1) return headerParseType(members[0], schemas, seen);
    const types = [
      ...new Set(members.map((member) => headerParseType(member, schemas, new Set(seen)))),
    ];
    return types.length === 1 ? types[0] : 'string';
  }
  // Nullable wrappers (`boolean | null`, OpenAPI 3.0 `nullable`) unwrap to the inner type.
  if (schema.kind === 'union') {
    const members = schema.members.filter((member) => member.kind !== 'null');
    if (members.length === 1) return headerParseType(members[0], schemas, seen);
    return 'string';
  }
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
