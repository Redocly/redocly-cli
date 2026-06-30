import { isPlainObject } from '@redocly/openapi-core';

import type { NamedSchemaModel, ScalarKind, SchemaMetadata, SchemaModel } from '../ir/model.js';
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
 * Turn an IR schema into a single deterministic JS value for baked mocks. Prefers
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
  if (schema.kind !== 'scalar') return undefined;
  const format = schema.metadata?.format;
  if (format === 'binary') return new SampleExpression('new Blob([])');
  if (dateType === 'Date') {
    if (format === 'date-time') return new SampleExpression('new Date("2024-01-01T00:00:00Z")');
    if (format === 'date') return new SampleExpression('new Date("2024-01-01")');
  }
  return undefined;
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
  if (meta?.example !== undefined) return meta.example;
  if (meta?.default !== undefined) return meta.default;

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
    case 'intersection':
      return schema.members.reduce<Record<string, unknown>>((acc, m) => {
        const part = walk(m, byName, visiting, dateType);
        return isPlainObject(part) ? Object.assign(acc, part) : acc;
      }, {});
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
