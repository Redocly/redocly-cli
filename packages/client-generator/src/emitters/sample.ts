import { isPlainObject } from '@redocly/openapi-core';

import type {
  NamedSchemaModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { DateType } from './types.js';

/** A sampled value the emitter must print as a raw TS expression rather than a JSON
 *  literal — e.g. a `format: binary` field, whose generated type is `Blob`. The `code`
 *  strings are generator-authored constants (never spec-derived), so emitting them
 *  verbatim is safe. */
export class SampleExpression {
  constructor(readonly code: string) {}
}

/** Options for `sampleValue`. `dateType` mirrors the type emitter's `--date-type`
 *  knob: when `'Date'`, date/date-time fields are typed `Date` (not `string`), so
 *  the sample must be a `new Date(...)` expression to match. Defaults to `'string'`. */
export type SampleOptions = { dateType?: DateType };

/**
 * Turn an IR schema into a single deterministic JS value for static mocks. Prefers
 * a spec `example`, then `default`, then a type/format-aware synthesized value —
 * EXCEPT for type-demanding fields (binary, or date/date-time under `dateType: 'Date'`)
 * whose generated type is not a JSON literal: those emit a fixed raw expression that
 * matches the type, regardless of any example/default (see `typeDemandedExpression`).
 * Refs resolve against `schemas`; recursion is cut with a visited-set so cyclic
 * schemas terminate (`null` at the cycle) instead of looping forever.
 */
export function sampleValue(
  schema: SchemaModel,
  schemas: NamedSchemaModel[],
  opts: SampleOptions = {}
): unknown {
  const byName = new Map(schemas.map((s) => [s.name, s.schema]));
  const value = walk(schema, byName, new Set(), opts.dateType ?? 'string');
  // A `CYCLE` that propagates all the way to the root has no container to absorb it
  // into a valid empty value (e.g. a self-referential union); fall back to null.
  return value === CYCLE ? null : value;
}

/**
 * Sentinel returned by `walk` when a `$ref` re-enters a name already on the stack.
 * Containers turn it into the type-correct empty value for their position — an array
 * to `[]`, a record to `{}`, an optional property to omission — so a recursive schema
 * yields data that still satisfies its (non-nullable) generated type. Only a required,
 * non-container self-reference (a genuinely uninhabitable schema) degrades to null.
 */
const CYCLE = Symbol('cycle');

/**
 * The expression a field MUST sample to because its generated type is not a JSON
 * literal — so it takes precedence over any spec `example`/`default` (baking those
 * would not type-check). The returned `code` is a generator-authored CONSTANT and
 * is NEVER interpolated from spec data: it flows verbatim into `parseExpression`,
 * so feeding a spec example string in here would be an injection vector. `undefined`
 * when the field has no type demand (the normal example/default/synthesis path applies).
 */
function typeDemandedExpression(
  schema: SchemaModel,
  dateType: DateType
): SampleExpression | undefined {
  // A nullable field (`type: ['string', 'null']`) wraps the demanding scalar in a
  // union — the demand (and its precedence over any example) applies to the member.
  if (schema.kind === 'union') {
    for (const member of schema.members) {
      const demanded = typeDemandedExpression(member, dateType);
      if (demanded) return demanded;
    }
    return undefined;
  }
  if (schema.kind !== 'scalar') return undefined;
  const format = schema.metadata?.format;
  if (format === 'binary') return new SampleExpression('new Blob([])');
  if (dateType === 'Date') {
    if (format === 'date-time') return new SampleExpression('new Date("2024-01-01T00:00:00Z")');
    if (format === 'date') return new SampleExpression('new Date("2024-01-01")');
  }
  return undefined;
}

/**
 * Split intersection members for sampling: object-shaped members (inline, or refs
 * resolving to objects) merge into ONE synthetic object schema whose conflicting
 * properties are resolved by SPECIFICITY — mirroring TS intersection algebra, where
 * `string & "Apple Pay"` is `"Apple Pay"` regardless of member order. Constraint-only
 * `unknown` members (`not`, unmodeled keywords) are dropped; everything else is
 * returned in `rest` untouched.
 */
export function splitIntersection(
  members: SchemaModel[],
  byName: Map<string, SchemaModel>
): { merged: SchemaModel | undefined; rest: SchemaModel[] } {
  const properties = new Map<string, { schema: SchemaModel; required: boolean; rank: number }>();
  const rest: SchemaModel[] = [];
  let sawObject = false;
  for (const member of members) {
    if (member.kind === 'unknown') continue;
    const resolved = derefChain(member, byName);
    if (resolved?.kind !== 'object') {
      rest.push(member);
      continue;
    }
    sawObject = true;
    for (const property of resolved.properties) {
      const rank = specificity(property.schema, byName, new Set());
      const existing = properties.get(property.name);
      // Higher specificity wins; a tie goes to the later member (extension over base).
      if (existing === undefined || rank >= existing.rank) {
        properties.set(property.name, {
          schema: property.schema,
          required: property.required || (existing?.required ?? false),
          rank,
        });
      }
    }
  }
  if (!sawObject) return { merged: undefined, rest };
  return {
    merged: {
      kind: 'object',
      properties: [...properties.entries()].map(([name, p]) => ({
        name,
        schema: p.schema,
        required: p.required,
      })),
    },
    rest,
  };
}

/** Follow a ref chain to its target (cycle-safe); `undefined` on a miss or cycle. */
function derefChain(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>
): SchemaModel | undefined {
  const seen = new Set<string>();
  let current: SchemaModel | undefined = schema;
  while (current?.kind === 'ref') {
    if (seen.has(current.name)) return undefined;
    seen.add(current.name);
    current = byName.get(current.name);
  }
  return current;
}

/**
 * How narrowly a schema types its values — the winner of an intersection property
 * conflict. Literals and single-value enums (both emitted as literal types) beat
 * enums, which beat everything else; `null`/`unknown` lose to any real shape, and
 * a union ranks just below its narrowest member (so `T | null` loses to `T`).
 */
function specificity(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>
): number {
  switch (schema.kind) {
    case 'literal':
      return 40;
    case 'enum':
      return schema.values.length === 1 ? 40 : 30;
    case 'union':
      return Math.max(0, ...schema.members.map((m) => specificity(m, byName, seen))) - 1;
    case 'ref': {
      if (seen.has(schema.name)) return 20;
      const target = byName.get(schema.name);
      return target === undefined
        ? 20
        : specificity(target, byName, new Set(seen).add(schema.name));
    }
    case 'null':
    case 'unknown':
      return 10;
    default:
      return 20;
  }
}

function walk(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  visiting: Set<string>,
  dateType: DateType
): unknown {
  const demanded = typeDemandedExpression(schema, dateType);
  if (demanded) return demanded;

  const meta = schema.metadata;
  // An example/default is honored only when it inhabits the generated type — real specs
  // carry `example: null` on non-nullable fields and defaults outside a narrowed enum
  // (`enum: [cram-md5], default: none`); baking those would not type-check.
  const inhabits = (value: unknown): boolean => {
    if (value === null) {
      return (
        schema.kind === 'null' ||
        (schema.kind === 'union' && schema.members.some((member) => member.kind === 'null'))
      );
    }
    if (schema.kind === 'enum') return (schema.values as unknown[]).includes(value);
    if (schema.kind === 'literal') return value === schema.value;
    return true;
  };
  if (meta?.example !== undefined && inhabits(meta.example)) return meta.example;
  if (meta?.default !== undefined && inhabits(meta.default)) return meta.default;

  switch (schema.kind) {
    case 'scalar':
      return scalarSample(schema.scalar, meta);
    case 'array': {
      // A cyclic item type collapses the array to `[]` — itself a valid `T[]`.
      const item = walk(schema.items, byName, visiting, dateType);
      return item === CYCLE ? [] : [item];
    }
    case 'object':
      return Object.fromEntries(
        schema.properties.flatMap((p) => {
          const value = walk(p.schema, byName, visiting, dateType);
          // A cyclic optional property is omitted (a null would not satisfy `T | undefined`);
          // a cyclic required property is uninhabitable, so null is the only stand-in.
          if (value === CYCLE) return p.required ? [[p.name, null]] : [];
          return [[p.name, value]];
        })
      );
    case 'record': {
      const value = walk(schema.value, byName, visiting, dateType);
      return value === CYCLE ? {} : { key: value };
    }
    case 'enum':
      return schema.values[0];
    case 'literal':
      return schema.value;
    case 'union': {
      // Pick the first member that is not itself a cycle; if every member cycles the
      // union is uninhabitable, so propagate `CYCLE` for a container/root to absorb.
      for (const member of schema.members) {
        const value = walk(member, byName, visiting, dateType);
        if (value !== CYCLE) return value;
      }
      return schema.members.length > 0 ? CYCLE : null;
    }
    case 'intersection': {
      const { merged, rest } = splitIntersection(schema.members, byName);
      const parts = rest
        .map((member) => walk(member, byName, visiting, dateType))
        .filter((part) => part !== CYCLE);
      if (merged) {
        const value = walk(merged, byName, visiting, dateType);
        const base = isPlainObject(value) ? (value as Record<string, unknown>) : {};
        // Fold in plain-object samples of non-object members (records, omits).
        for (const part of parts) if (isPlainObject(part)) Object.assign(base, part);
        return base;
      }
      const objects = parts.filter(isPlainObject);
      if (objects.length > 0) {
        return objects.reduce<Record<string, unknown>>((acc, part) => Object.assign(acc, part), {});
      }
      // No object member: a scalar-narrowing intersection (e.g. an enum ref constrained
      // by `not`) — the first member's sample IS the value.
      return parts.length > 0 ? parts[0] : {};
    }
    case 'omit': {
      // base is a named schema reference (string), resolve it then drop the listed keys
      const target = byName.get(schema.base);
      if (!target) return null;
      const base = walk(target, byName, visiting, dateType);
      if (isPlainObject(base)) {
        const copy = { ...(base as Record<string, unknown>) };
        for (const key of schema.keys) delete copy[key];
        return copy;
      }
      return base;
    }
    case 'ref': {
      if (visiting.has(schema.name)) return CYCLE;
      const target = byName.get(schema.name);
      if (!target) return null;
      visiting.add(schema.name);
      const result = walk(target, byName, visiting, dateType);
      visiting.delete(schema.name);
      return result;
    }
    case 'null':
    case 'unknown':
      return null;
  }
}

function scalarSample(scalar: ScalarKind, meta: SchemaMetadata | undefined): unknown {
  if (scalar === 'boolean') return true;
  if (scalar === 'integer' || scalar === 'number') return 0;
  // Type-demanding formats (binary, and date/date-time under `dateType: 'Date'`) are
  // handled earlier in `walk` via `typeDemandedExpression`; here the date formats fall
  // through to the ISO-string path (the `dateType: 'string'` types them as `string`).
  switch (meta?.format) {
    case 'email':
      return 'user@example.com';
    case 'uuid':
      return '00000000-0000-4000-8000-000000000000';
    case 'date-time':
      return '2024-01-01T00:00:00Z';
    case 'date':
      return '2024-01-01';
    case 'uri':
    case 'url':
      return 'https://example.com';
    default:
      return 'string';
  }
}
