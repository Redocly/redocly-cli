// Language-neutral schema helpers: the cross-language variance points (allOf,
// discriminators, nullability, enums) exposed as pure functions over the IR, so
// a generator in ANY output language never re-implements schema semantics.

import type { ApiModel, PropertyModel, SchemaModel } from '../intermediate-representation/model.js';
import { casing } from './naming.js';

/** Follow a `ref` chain through the model's named schemas; undefined on a miss or cycle. */
function deref(schema: SchemaModel, model: ApiModel): SchemaModel | undefined {
  const seen = new Set<string>();
  let current = schema;
  while (current.kind === 'ref') {
    if (seen.has(current.name)) return undefined;
    seen.add(current.name);
    const named = model.schemas.find((s) => s.name === current.name);
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
  const memberNames = schema.values.map((value) =>
    typeof value === 'string' ? casing.screaming(value) : `VALUE_${String(value).toUpperCase()}`
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
