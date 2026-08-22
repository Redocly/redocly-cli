// Language-neutral schema helpers: the cross-language variance points (allOf,
// discriminators, nullability, enums) exposed as pure functions over the IR, so
// a generator in ANY output language never re-implements schema semantics.

import type {
  ApiModel,
  NamedSchemaModel,
  PropertyModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { casing, uniqueIdentifiers } from './naming.js';

/** Follow a `ref` chain through the model's named schemas; undefined on a miss or cycle. */
function deref(schema: SchemaModel, model: ApiModel): SchemaModel | undefined {
  const seen = new Set<string>();
  let current = schema;
  while (current.kind === 'ref') {
    const { name } = current;
    if (seen.has(name)) return undefined;
    seen.add(name);
    const named = model.schemas.find((s) => s.name === name);
    if (named === undefined) return undefined;
    current = named.schema;
  }
  return current;
}

/**
 * The flattened view of an object or `allOf` composition — what every language
 * without intersection types renders. Later members win on property-name
 * conflicts (allOf refinement); returns undefined when a member is not an
 * object (nothing coherent to flatten).
 */
export function flattenAllOf(
  schema: SchemaModel,
  model: ApiModel
): { properties: PropertyModel[]; description?: string } | undefined {
  const resolved = deref(schema, model);
  if (resolved === undefined) return undefined;
  if (resolved.kind === 'object') {
    return { properties: resolved.properties, description: resolved.description };
  }
  if (resolved.kind !== 'intersection') return undefined;
  const merged = new Map<string, PropertyModel>();
  for (const member of resolved.members) {
    const flat = flattenAllOf(member, model);
    if (flat === undefined) return undefined;
    for (const property of flat.properties) merged.set(property.name, property);
  }
  return { properties: [...merged.values()], description: resolved.description };
}

/** The neutral discriminator dispatch table; each language renders its own idiom from it. */
export function discriminatorCases(
  schema: SchemaModel,
  model: ApiModel
):
  | { property: string; cases: Array<{ value: string; schemaName: string; schema: SchemaModel }> }
  | undefined {
  const resolved = deref(schema, model);
  if (resolved?.kind !== 'union' || resolved.discriminator === undefined) return undefined;
  const cases = [];
  for (const { value, schemaName } of resolved.discriminator.mapping) {
    const target = deref({ kind: 'ref', name: schemaName }, model);
    if (target === undefined) return undefined;
    cases.push({ value, schemaName, schema: target });
  }
  return { property: resolved.discriminator.propertyName, cases };
}

export function isNullable(schema: SchemaModel): boolean {
  return schema.kind === 'union' && schema.members.some((member) => member.kind === 'null');
}

/** The schema without its `null` union members (a single survivor is unwrapped). */
export function unwrapNullable(schema: SchemaModel): SchemaModel {
  if (schema.kind !== 'union' || !isNullable(schema)) return schema;
  const rest = schema.members.filter((member) => member.kind !== 'null');
  return rest.length === 1 ? rest[0] : { ...schema, members: rest };
}

/** Enum values plus language-safe SCREAMING_SNAKE member-name suggestions. */
export function enumValues(
  schema: SchemaModel
): { values: Array<string | number | boolean>; scalar: string; memberNames: string[] } | undefined {
  if (schema.kind !== 'enum') return undefined;
  // `casing` owns the value-to-word rules (`-1` → `MINUS_1`), and `uniqueIdentifiers` owns
  // the rest of "language-safe": two values may fold to one name (`a-b` and `a b`), and an
  // empty string folds to nothing at all — both must still yield distinct usable members.
  const memberNames = uniqueIdentifiers(
    schema.values.map((value) =>
      typeof value === 'string'
        ? casing.screaming(value)
        : `VALUE_${casing.screaming(String(value))}`
    ),
    { style: 'screaming' }
  );
  return { values: schema.values, scalar: schema.scalar, memberNames };
}

/** Description text as trimmed lines ready for any comment syntax; blank edges dropped. */
export function docText(description?: string): string[] {
  if (!description) return [];
  const lines = description.split(/\r\n|\n|\r/).map((line) => line.trim());
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** One pointer step over a (dereferenced) schema; an intersection takes the LAST member that resolves, since later `allOf` members refine earlier ones. */
function stepIntoSchema(
  schema: SchemaModel,
  key: string,
  model: ApiModel
): SchemaModel | undefined {
  if (schema.kind === 'object') return schema.properties.find((p) => p.name === key)?.schema;
  if (schema.kind === 'record') return schema.value;
  if (schema.kind === 'array' && /^(0|[1-9]\d*)$/.test(key)) return schema.items;
  if (schema.kind === 'intersection') {
    let match: SchemaModel | undefined;
    for (const member of schema.members) {
      const target = deref(member, model);
      if (target === undefined) continue;
      match = stepIntoSchema(target, key, model) ?? match;
    }
    return match;
  }
  return undefined;
}

/**
 * Resolve an RFC 6901 JSON pointer (`~1` → `/`, `~0` → `~`) over a schema, walking the
 * VALUE shape it describes: object property steps by name, record values for any token,
 * array items for numeric tokens, with `ref` steps resolved through the model's named
 * schemas (cycle-guarded) and intersections (`allOf`) resolved across their members.
 * Unions bail (genuinely ambiguous). Returns `undefined` on any miss.
 */
export function schemaAtPointer(
  schema: SchemaModel,
  pointer: string,
  model: ApiModel
): SchemaModel | undefined {
  let current = deref(schema, model);
  if (current === undefined || (pointer !== '' && !pointer.startsWith('/'))) return undefined;
  if (pointer === '') return current;
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
    const next = stepIntoSchema(current, key, model);
    if (next === undefined) return undefined;
    current = deref(next, model);
    if (current === undefined) return undefined;
  }
  return current;
}

/**
 * The wire-coerce hint for a response HEADER schema: `'integer'` / `'number'` /
 * `'boolean'` for scalar-ish leaves, `'string'` for everything else (headers are
 * strings on the wire; complex schemas have no sensible coercion). Resolves `ref`s
 * through the model, peels nullable unions and constraint-only `allOf` members.
 */
export function headerCoerceType(
  schema: SchemaModel,
  model: { schemas: readonly NamedSchemaModel[] },
  seen: Set<string> = new Set()
): 'string' | 'number' | 'integer' | 'boolean' {
  if (schema.kind === 'ref') {
    if (seen.has(schema.name)) return 'string';
    seen.add(schema.name);
    const named = model.schemas.find((entry) => entry.name === schema.name);
    if (named === undefined) return 'string';
    return headerCoerceType(named.schema, model, seen);
  }
  if (schema.kind === 'intersection') {
    const members = schema.members.filter((member) => member.kind !== 'unknown');
    if (members.length === 1) return headerCoerceType(members[0], model, seen);
    const types = [
      ...new Set(members.map((member) => headerCoerceType(member, model, new Set(seen)))),
    ];
    if (types.length === 1) return types[0];
    // An integer member refined by a number bound (or vice versa) stays numeric.
    if (types.every((type) => type === 'integer' || type === 'number')) return 'number';
    return 'string';
  }
  if (schema.kind === 'union') {
    const members = schema.members.filter((member) => member.kind !== 'null');
    if (members.length === 1) return headerCoerceType(members[0], model, seen);
    return 'string';
  }
  if (schema.kind === 'scalar' || schema.kind === 'enum') {
    if (schema.scalar === 'integer') return 'integer';
    if (schema.scalar === 'number') return 'number';
    if (schema.scalar === 'boolean') return 'boolean';
  }
  if (schema.kind === 'literal') {
    if (typeof schema.value === 'number') {
      return Number.isInteger(schema.value) ? 'integer' : 'number';
    }
    if (typeof schema.value === 'boolean') return 'boolean';
  }
  return 'string';
}
