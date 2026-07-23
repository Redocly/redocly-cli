// Builds the body expression for a faker-mode mock factory: a tree of
// `@faker-js/faker` call expressions that produce realistic — and, with a seed,
// reproducible — data. Structurally mirrors `emitters/sample.ts`'s `walk` (same
// recursion + same visited-set cycle guard), but returns a `ts.Expression` of
// faker calls instead of a static value. Nested refs are INLINED under the same
// cycle guard (never `create<Ref>()` calls), so a cyclic schema terminates with
// `null` at the cycle instead of recursing forever at runtime — exactly like the
// static path. The factory signatures are identical to the static mode's, so a
// consumer can flip `mockData` without touching call sites; `@faker-js/faker`
// becomes their dev-dep while the real client stays dependency-free.

import type {
  NamedSchemaModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { safeIdent } from './identifier.js';
import { constArray, literalExpression, ts } from './ts.js';
import type { DateType } from './types.js';

const { factory } = ts;

/** The faker-call expression for an IR schema. Refs resolve against `schemas`;
 *  recursion is cut with a visited-set (`null` at the cycle). `dateType` mirrors
 *  the sdk's `--date-type`: under `'Date'`, date fields stay `faker.date.recent()`
 *  (a `Date`); otherwise they are stringified to match the `string`-typed sdk. */
export function fakerExpression(
  schema: SchemaModel,
  schemas: NamedSchemaModel[],
  opts: { dateType?: DateType } = {}
): ts.Expression {
  const byName = new Map(schemas.map((s) => [s.name, s.schema]));
  const expr = walk(schema, byName, new Set(), opts.dateType ?? 'string');
  // A `CYCLE` that reaches the root has no container to absorb it (e.g. a
  // self-referential union); fall back to null.
  return expr === CYCLE ? factory.createNull() : expr;
}

/**
 * Sentinel returned by `walk` when a `$ref` re-enters a name already on the stack.
 * Containers turn it into the type-correct empty value for their position — an array
 * to `[]`, a record to `{}`, an optional property to omission — mirroring `emitters/sample.ts`
 * so a recursive schema yields a faker tree that still satisfies its non-nullable type.
 * Only a required, non-container self-reference (an uninhabitable schema) degrades to null.
 */
const CYCLE = Symbol('cycle');

type WalkResult = ts.Expression | typeof CYCLE;

function walk(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  visiting: Set<string>,
  dateType: DateType
): WalkResult {
  switch (schema.kind) {
    case 'scalar':
      return scalarExpr(schema.scalar, schema.metadata, dateType);
    case 'array': {
      // A cyclic item type collapses the array to `[]` — itself a valid `T[]`.
      const item = walk(schema.items, byName, visiting, dateType);
      return item === CYCLE ? factory.createArrayLiteralExpression([], false) : multiple(item);
    }
    case 'object':
      return objectExpr(
        schema.properties.flatMap((p): Array<[string, ts.Expression]> => {
          const value = walk(p.schema, byName, visiting, dateType);
          // A cyclic optional property is omitted; a cyclic required property is
          // uninhabitable, so null is the only stand-in.
          if (value === CYCLE) return p.required ? [[p.name, factory.createNull()]] : [];
          return [[p.name, value]];
        })
      );
    case 'record': {
      const value = walk(schema.value, byName, visiting, dateType);
      return value === CYCLE
        ? factory.createObjectLiteralExpression([], false)
        : objectExpr([['key', value]]);
    }
    case 'enum':
      return call('faker.helpers.arrayElement', [constArray(schema.values.map(literalExpression))]);
    case 'literal':
      return literalExpression(schema.value);
    case 'union': {
      // First non-cyclic member; if every member cycles, propagate `CYCLE`.
      for (const member of schema.members) {
        const value = walk(member, byName, visiting, dateType);
        if (value !== CYCLE) return value;
      }
      return schema.members.length > 0 ? CYCLE : factory.createNull();
    }
    case 'intersection':
      return factory.createObjectLiteralExpression(
        schema.members.flatMap((m) => {
          const part = walk(m, byName, visiting, dateType);
          return part !== CYCLE && ts.isObjectLiteralExpression(part) ? assignments(part) : [];
        }),
        true
      );
    case 'omit':
      return omitExpr(schema.base, schema.keys, byName, visiting, dateType);
    case 'ref': {
      if (visiting.has(schema.name)) return CYCLE;
      const target = byName.get(schema.name);
      if (!target) return factory.createNull();
      visiting.add(schema.name);
      const result = walk(target, byName, visiting, dateType);
      visiting.delete(schema.name);
      return result;
    }
    case 'null':
    case 'unknown':
      return factory.createNull();
  }
}

/** The faker call for a scalar, keyed by kind then `format`. A binary field has no
 *  faker generator (its type is `Blob`), so it emits `new Blob([])` — the same
 *  type-demanded expression the static path uses, taking precedence over any example. */
function scalarExpr(
  scalar: ScalarKind,
  meta: SchemaMetadata | undefined,
  dateType: DateType
): ts.Expression {
  if (meta?.format === 'binary') return newBlob();
  if (scalar === 'boolean') return call('faker.datatype.boolean', []);
  if (scalar === 'integer') return call('faker.number.int', boundsArg(meta));
  if (scalar === 'number') return call('faker.number.float', boundsArg(meta));
  switch (meta?.format) {
    case 'email':
      return call('faker.internet.email', []);
    case 'uuid':
      return call('faker.string.uuid', []);
    case 'uri':
    case 'url':
      return call('faker.internet.url', []);
    case 'hostname':
      return call('faker.internet.domainName', []);
    case 'ipv4':
      return call('faker.internet.ipv4', []);
    case 'date-time':
      return dateExpr(dateType, false);
    case 'date':
      return dateExpr(dateType, true);
    default:
      return call('faker.lorem.word', []);
  }
}

/** `faker.date.recent()` (under `dateType: 'Date'`); else its ISO string, sliced to
 *  `YYYY-MM-DD` for a `date` so the wire shape matches the `string`-typed field. */
function dateExpr(dateType: DateType, dateOnly: boolean): ts.Expression {
  const recent = call('faker.date.recent', []);
  if (dateType === 'Date') return recent;
  const iso = call(member(recent, 'toISOString'), []);
  if (!dateOnly) return iso;
  return call(member(iso, 'slice'), [
    factory.createNumericLiteral(0),
    factory.createNumericLiteral(10),
  ]);
}

/** `{ min, max }` arg list for a bounded numeric, or no args when neither bound is set. */
function boundsArg(meta: SchemaMetadata | undefined): ts.Expression[] {
  const props: ts.PropertyAssignment[] = [];
  if (meta?.minimum !== undefined) {
    props.push(factory.createPropertyAssignment('min', literalExpression(meta.minimum)));
  }
  if (meta?.maximum !== undefined) {
    props.push(factory.createPropertyAssignment('max', literalExpression(meta.maximum)));
  }
  return props.length > 0 ? [factory.createObjectLiteralExpression(props, false)] : [];
}

/** `faker.helpers.multiple(() => <item>, { count: 1 })` — one element keeps output small. */
function multiple(item: ts.Expression): ts.Expression {
  const fn = factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    item
  );
  const count = factory.createObjectLiteralExpression(
    [factory.createPropertyAssignment('count', factory.createNumericLiteral(1))],
    false
  );
  return call('faker.helpers.multiple', [fn, count]);
}

/** An `omit`: the base named schema's faker expr minus the dropped keys. Resolves the
 *  base via the schema set (cycle-guarded); a non-object base passes through unchanged. */
function omitExpr(
  base: string,
  keys: string[],
  byName: Map<string, SchemaModel>,
  visiting: Set<string>,
  dateType: DateType
): WalkResult {
  const target = byName.get(base);
  if (!target) return factory.createNull();
  const expr = walk(target, byName, visiting, dateType);
  // A cyclic or non-object base passes through unchanged (a container/root absorbs `CYCLE`).
  if (expr === CYCLE || !ts.isObjectLiteralExpression(expr)) return expr;
  const drop = new Set(keys.map(safeIdent));
  return factory.createObjectLiteralExpression(
    assignments(expr).filter((a) => !drop.has(propKey(a))),
    true
  );
}

/** An object literal from `[key, expr]` entries; keys are quoted when not bare identifiers. */
function objectExpr(entries: Array<[string, ts.Expression]>): ts.Expression {
  return factory.createObjectLiteralExpression(
    entries.map(([key, value]) => {
      const safe = safeIdent(key);
      const name = safe === key ? factory.createIdentifier(key) : factory.createStringLiteral(key);
      return factory.createPropertyAssignment(name, value);
    }),
    true
  );
}

/** The property assignments of an object literal (the spread/intersection merge unit). */
function assignments(object: ts.ObjectLiteralExpression): ts.PropertyAssignment[] {
  return object.properties.filter((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p));
}

/** The printed key text of a property assignment (matching `safeIdent`'s quoting). */
function propKey(a: ts.PropertyAssignment): string {
  return ts.isStringLiteral(a.name) ? safeIdent(a.name.text) : (a.name as ts.Identifier).text;
}

/** `new Blob([])` — the type-correct stand-in for a `format: binary` field. */
function newBlob(): ts.Expression {
  return factory.createNewExpression(factory.createIdentifier('Blob'), undefined, [
    factory.createArrayLiteralExpression([], false),
  ]);
}

/** A call expression from a dotted callee name (`faker.number.int`) or a built node. */
function call(callee: string | ts.Expression, args: ts.Expression[]): ts.CallExpression {
  const target = typeof callee === 'string' ? dotted(callee) : callee;
  return factory.createCallExpression(target, undefined, args);
}

/** Turn `a.b.c` into nested property access on an identifier. */
function dotted(path: string): ts.Expression {
  const [head, ...rest] = path.split('.');
  return rest.reduce<ts.Expression>(
    (acc, name) => member(acc, name),
    factory.createIdentifier(head)
  );
}

function member(target: ts.Expression, name: string): ts.PropertyAccessExpression {
  return factory.createPropertyAccessExpression(target, name);
}
