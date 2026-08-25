// Builds the body value for a faker-mode mock factory: a tree of
// `@faker-js/faker` call expressions that produce realistic — and, with a seed,
// reproducible — data. Structurally mirrors `./sample.ts`'s `walk` (same
// recursion + same visited-set cycle guard), but yields faker calls instead of a
// static value. Nested refs are INLINED under the same cycle guard (never
// `create<Ref>()` calls), so a cyclic schema terminates with `null` at the cycle
// instead of recursing forever at runtime — exactly like the static path. The
// factory signatures are identical to the static mode's, so a consumer can flip
// `mockData` without touching call sites; `@faker-js/faker` becomes their
// dev-dep while the real client stays dependency-free.

import {
  type DateType,
  type NamedSchemaModel,
  type ScalarKind,
  type SchemaMetadata,
  type SchemaModel,
} from '@redocly/client-generator';
import { codeLiteral } from '@redocly/client-generator/printers/typescript';

import { splitIntersection } from './sample.ts';
import { expr, isObjectValue, type MockEntry, type MockValue, objectValue } from './values.ts';

/** The faker-call value for an IR schema. Refs resolve against `schemas`;
 *  recursion is cut with a visited-set (`null` at the cycle). `dateType` mirrors
 *  the sdk's `--date-type`: under `'Date'`, date fields stay `faker.date.recent()`
 *  (a `Date`); otherwise they are stringified to match the `string`-typed sdk. */
export function fakerExpression(
  schema: SchemaModel,
  schemas: NamedSchemaModel[],
  opts: { dateType?: DateType } = {}
): MockValue {
  const byName = new Map(schemas.map((s) => [s.name, s.schema]));
  const value = walk(schema, byName, new Set(), opts.dateType ?? 'string');
  // A `CYCLE` that reaches the root has no container to absorb it (e.g. a
  // self-referential union); fall back to null.
  return value === CYCLE ? expr('null') : value;
}

/**
 * Sentinel returned by `walk` when a `$ref` re-enters a name already on the stack.
 * Containers turn it into the type-correct empty value for their position — an array
 * to `[]`, a record to `{}`, an optional property to omission — mirroring `./sample.ts`
 * so a recursive schema yields a faker tree that still satisfies its non-nullable type.
 * Only a required, non-container self-reference (an uninhabitable schema) degrades to null.
 */
const CYCLE = Symbol('cycle');

type WalkResult = MockValue | typeof CYCLE;

function walk(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  visiting: Set<string>,
  dateType: DateType
): WalkResult {
  switch (schema.kind) {
    case 'scalar':
      return expr(scalarExpr(schema.scalar, schema.metadata, dateType));
    case 'array': {
      // A cyclic item type collapses the array to `[]` — itself a valid `T[]`.
      const item = walk(schema.items, byName, visiting, dateType);
      return item === CYCLE ? expr('[]') : multiple(item);
    }
    case 'object':
      return objectValue(
        schema.properties.flatMap((p): MockEntry[] => {
          const value = walk(p.schema, byName, visiting, dateType);
          // A cyclic optional property is omitted; a cyclic required property is
          // uninhabitable, so null is the only stand-in.
          if (value === CYCLE) return p.required ? [{ key: p.name, value: expr('null') }] : [];
          return [{ key: p.name, value }];
        })
      );
    case 'record': {
      const value = walk(schema.value, byName, visiting, dateType);
      return value === CYCLE ? expr('{}') : objectValue([{ key: 'key', value }]);
    }
    case 'enum':
      return expr(
        `faker.helpers.arrayElement([${schema.values.map((value) => codeLiteral(value)).join(', ')}] as const)`
      );
    case 'literal':
      return expr(codeLiteral(schema.value));
    case 'union': {
      // First non-cyclic member; if every member cycles, propagate `CYCLE`.
      for (const member of schema.members) {
        const value = walk(member, byName, visiting, dateType);
        if (value !== CYCLE) return value;
      }
      return schema.members.length > 0 ? CYCLE : expr('null');
    }
    case 'intersection': {
      // Mirror the static sampler: object members merge into one synthetic object whose
      // property conflicts resolve by SPECIFICITY (see `splitIntersection`); `unknown`
      // members are constraint-only and dropped; with no object member, the first
      // member's expression IS the value (a scalar-narrowing intersection).
      const { merged, rest } = splitIntersection(schema.members, byName);
      const parts = rest
        .map((member) => walk(member, byName, visiting, dateType))
        .filter((part): part is MockValue => part !== CYCLE);
      if (merged) {
        const value = walk(merged, byName, visiting, dateType);
        const own = value !== CYCLE && isObjectValue(value) ? value.entries : [];
        const folded = parts.filter(isObjectValue).flatMap((part) => part.entries);
        return objectValue([...own, ...folded]);
      }
      const objects = parts.filter(isObjectValue);
      if (objects.length > 0) {
        return objectValue(objects.flatMap((part) => part.entries));
      }
      return parts[0] ?? objectValue([]);
    }
    case 'omit':
      return omitExpr(schema.base, schema.keys, byName, visiting, dateType);
    case 'ref': {
      if (visiting.has(schema.name)) return CYCLE;
      const target = byName.get(schema.name);
      if (!target) return expr('null');
      visiting.add(schema.name);
      const result = walk(target, byName, visiting, dateType);
      visiting.delete(schema.name);
      return result;
    }
    case 'null':
    case 'unknown':
      return expr('null');
  }
}

/** The faker call for a scalar, keyed by kind then `format`. A binary field has no
 *  faker generator (its type is `Blob`), so it emits `new Blob([])` — the same
 *  type-demanded expression the static path uses, taking precedence over any example. */
function scalarExpr(
  scalar: ScalarKind,
  meta: SchemaMetadata | undefined,
  dateType: DateType
): string {
  if (meta?.format === 'binary') return 'new Blob([])';
  if (scalar === 'boolean') return 'faker.datatype.boolean()';
  if (scalar === 'integer') return `faker.number.int(${boundsArg(meta)})`;
  if (scalar === 'number') return `faker.number.float(${boundsArg(meta)})`;
  switch (meta?.format) {
    case 'email':
      return 'faker.internet.email()';
    case 'uuid':
      return 'faker.string.uuid()';
    case 'uri':
    case 'url':
      return 'faker.internet.url()';
    case 'hostname':
      return 'faker.internet.domainName()';
    case 'ipv4':
      return 'faker.internet.ipv4()';
    case 'date-time':
      return dateExpr(dateType, false);
    case 'date':
      return dateExpr(dateType, true);
    default:
      return 'faker.lorem.word()';
  }
}

/** `faker.date.recent()` (under `dateType: 'Date'`); else its ISO string, sliced to
 *  `YYYY-MM-DD` for a `date` so the wire shape matches the `string`-typed field. */
function dateExpr(dateType: DateType, dateOnly: boolean): string {
  if (dateType === 'Date') return 'faker.date.recent()';
  const iso = 'faker.date.recent().toISOString()';
  return dateOnly ? `${iso}.slice(0, 10)` : iso;
}

/** `{ min, max }` arg for a bounded numeric, or empty when neither bound is set. */
function boundsArg(meta: SchemaMetadata | undefined): string {
  const props = [
    ...(meta?.minimum !== undefined ? [`min: ${meta.minimum}`] : []),
    ...(meta?.maximum !== undefined ? [`max: ${meta.maximum}`] : []),
  ];
  return props.length > 0 ? `{ ${props.join(', ')} }` : '';
}

/** `faker.helpers.multiple(() => <item>, { count: 1 })` — one element keeps output small.
 * An object-literal arrow body must be parenthesized (`() => ({ … })`), or the braces
 * parse as a block. */
function multiple(item: MockValue): MockValue {
  const object = isObjectValue(item);
  return {
    kind: 'wrap',
    before: `faker.helpers.multiple(() => ${object ? '(' : ''}`,
    value: item,
    after: `${object ? ')' : ''}, { count: 1 })`,
  };
}

/** An `omit`: the base named schema's faker value minus the dropped keys. Resolves the
 *  base via the schema set (cycle-guarded); a non-object base passes through unchanged. */
function omitExpr(
  base: string,
  keys: string[],
  byName: Map<string, SchemaModel>,
  visiting: Set<string>,
  dateType: DateType
): WalkResult {
  const target = byName.get(base);
  if (!target) return expr('null');
  const value = walk(target, byName, visiting, dateType);
  // A cyclic or non-object base passes through unchanged (a container/root absorbs `CYCLE`).
  if (value === CYCLE || !isObjectValue(value)) return value;
  const drop = new Set(keys);
  return objectValue(value.entries.filter((entry) => 'spread' in entry || !drop.has(entry.key)));
}
