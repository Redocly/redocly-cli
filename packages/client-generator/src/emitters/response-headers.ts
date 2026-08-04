// Success-response header helpers: descriptor parse hints + Ops / alias type shapes
// for throw-mode `{ envelope: true }`.

import type {
  NamedSchemaModel,
  ResponseHeaderModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { ResponseHeaderSpec } from '../runtime/types.js';
import { uniqueIdent } from './identifier.js';
import { headerPropertyKey } from './support.js';
import { ts } from './ts.js';

const { factory } = ts;

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

/** Type literal for Ops.`headers` / `<Op>ResponseHeaders`. */
export function responseHeadersTypeLiteral(
  headers: ResponseHeaderModel[],
  schemas: readonly NamedSchemaModel[] = []
): ts.TypeNode {
  return factory.createTypeLiteralNode(
    planResponseHeaders(headers, schemas).map((header) => {
      return factory.createPropertySignature(
        undefined,
        factory.createIdentifier(header.key),
        header.required === true ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
        headerTypeNode(header.type)
      );
    })
  );
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

function headerTypeNode(type: ResponseHeaderSpec['type']): ts.TypeNode {
  if (type === 'number') return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  if (type === 'boolean') return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}
