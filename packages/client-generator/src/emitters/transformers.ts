// Emits standalone Date-transformer functions from the IR. For each named
// schema that (recursively) carries a `format: date-time`/`date` string field,
// emits `export const transform<Name> = (data: <Name>): <Name> => { … };` that
// walks the value and rewrites those wire ISO strings to `new Date(...)` in
// place, so the runtime value matches the sdk's `--date-type Date` types.
//
// Pairs with the sdk generated under `dateType: 'Date'`; the client itself
// stays zero-dep (Date is standard). Transformers compose across refs:
// `transformPet` calls `transformPerson(data["owner"])` when `Pet.owner` is a
// `Person` that has dates.

import type {
  ApiModel,
  NamedSchemaModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { safeIdent } from './identifier.js';
import { pascalCase } from './support.js';
import { arrow, exportConstStatement, parseStatements, printStatements, ts } from './ts.js';

const { factory } = ts;

/** `transform<Name>` — the function bound to a named schema. */
function transformName(name: string): string {
  return `transform${pascalCase(name)}`;
}

/**
 * Strips `readonly` modifiers so a transform can write a `readOnly` spec field
 * (e.g. `createdTime`) — emitted into the module only when such a write exists.
 */
const WRITABLE_DECL = 'type __Writable<T> = { -readonly [K in keyof T]: T[K] };';
/** Set by `writableLhs` during a render; `renderTransformersModule` resets and reads it. */
let writableUsed = false;

/**
 * Whether transforming a value of `schema` REPLACES it (so the result must be
 * assigned back) rather than mutating it in place: date scalars, arrays of
 * them, unions containing them, and refs resolving to any of those. Objects,
 * records, and intersections mutate in place.
 */
function needsReassign(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>
): boolean {
  if (isDateScalar(schema)) return true;
  switch (schema.kind) {
    case 'array':
      return needsReassign(schema.items, byName, seen);
    case 'union':
      return schema.members.some((member) => needsReassign(member, byName, seen));
    case 'ref': {
      if (seen.has(schema.name)) return false;
      const target = byName.get(schema.name);
      return target !== undefined && needsReassign(target, byName, new Set(seen).add(schema.name));
    }
    default:
      return false;
  }
}

/** A scalar string with a `date-time`/`date` format — the leaf we convert. */
function isDateScalar(schema: SchemaModel): boolean {
  return (
    schema.kind === 'scalar' &&
    schema.scalar === 'string' &&
    (schema.metadata?.format === 'date-time' || schema.metadata?.format === 'date')
  );
}

/**
 * Whether a schema contains a date leaf, following refs. `seen` guards ref
 * cycles (a self-referential schema would otherwise recurse forever); a ref
 * back into the visited set carries no *new* dates from here.
 */
function hasDates(
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>
): boolean {
  if (isDateScalar(schema)) return true;
  switch (schema.kind) {
    case 'array':
      return hasDates(schema.items, byName, seen);
    case 'record':
      return hasDates(schema.value, byName, seen);
    case 'object':
      return schema.properties.some((p) => hasDates(p.schema, byName, seen));
    case 'union':
    case 'intersection':
      return schema.members.some((m) => hasDates(m, byName, seen));
    case 'ref': {
      const target = byName.get(schema.name);
      return target !== undefined && !seen.has(schema.name)
        ? hasDates(target, byName, new Set(seen).add(schema.name))
        : false;
    }
    default:
      return false;
  }
}

/** `<target>["key"]` — bracket access, robust for any (incl. non-identifier) key. */
function index(target: ts.Expression, key: string): ts.ElementAccessExpression {
  return factory.createElementAccessExpression(target, factory.createStringLiteral(key));
}

/** `new Date(<arg>)`. */
function newDate(arg: ts.Expression): ts.Expression {
  return factory.createNewExpression(factory.createIdentifier('Date'), undefined, [arg]);
}

/** `typeof <expr> === "string"`. */
function isStringGuard(expr: ts.Expression): ts.Expression {
  return factory.createBinaryExpression(
    factory.createTypeOfExpression(expr),
    factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
    factory.createStringLiteral('string')
  );
}

/** `Array.isArray(<expr>)`. */
function isArrayGuard(expr: ts.Expression): ts.Expression {
  return factory.createCallExpression(
    factory.createPropertyAccessExpression(factory.createIdentifier('Array'), 'isArray'),
    undefined,
    [expr]
  );
}

/** `<expr> && typeof <expr> === "object"` — truthy and a (non-null) object. */
function isObjectGuard(expr: ts.Expression): ts.Expression {
  return factory.createBinaryExpression(
    expr,
    factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
    factory.createBinaryExpression(
      factory.createTypeOfExpression(expr),
      factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
      factory.createStringLiteral('object')
    )
  );
}

/** `<expr> as <Type>` — a type assertion, to satisfy a union-narrowing transform. */
function asType(expr: ts.Expression, typeName: string): ts.Expression {
  return factory.createAsExpression(expr, factory.createTypeReferenceNode(typeName));
}

/** `if (<cond>) <then>;`. */
function ifThen(cond: ts.Expression, then: ts.Statement): ts.Statement {
  return factory.createIfStatement(cond, then);
}

function exprStatement(expr: ts.Expression): ts.Statement {
  return factory.createExpressionStatement(expr);
}

/** `<target> = <value>;` — the LHS cast writable when it is a `readonly` property. */
function assign(target: ts.Expression, value: ts.Expression, readonlyLhs = false): ts.Statement {
  const lhs = readonlyLhs ? writableLhs(target) : target;
  return exprStatement(
    factory.createBinaryExpression(lhs, factory.createToken(ts.SyntaxKind.EqualsToken), value)
  );
}

/**
 * The write target for a `readonly`-typed property:
 * `(recv as __Writable<NonNullable<typeof recv>>)["key"]`. `readonly` is shallow —
 * it blocks only the direct assignment — so nested writes stay uncast.
 */
function writableLhs(lhs: ts.Expression): ts.Expression {
  if (!ts.isElementAccessExpression(lhs)) return lhs; // a parameter reassignment is never readonly
  writableUsed = true;
  const receiver = factory.createParenthesizedExpression(
    factory.createAsExpression(
      lhs.expression,
      factory.createTypeReferenceNode('__Writable', [nonNullTypeOf(lhs.expression)])
    )
  );
  return factory.createElementAccessExpression(receiver, lhs.argumentExpression);
}

/**
 * `NonNullable<typeof <expr>>` for the expression chains this emitter builds
 * (an identifier indexed by string-literal keys), with `NonNullable` applied at
 * every step so optional intermediate properties don't poison the indexed type.
 */
function nonNullTypeOf(expr: ts.Expression): ts.TypeNode {
  let base: ts.TypeNode;
  if (ts.isIdentifier(expr)) {
    base = factory.createTypeQueryNode(expr);
  } else if (ts.isElementAccessExpression(expr) && ts.isStringLiteral(expr.argumentExpression)) {
    base = factory.createIndexedAccessTypeNode(
      nonNullTypeOf(expr.expression),
      factory.createLiteralTypeNode(factory.createStringLiteral(expr.argumentExpression.text))
    );
  } else {
    // Every write target is built here from `data`/loop identifiers + string-literal
    // element access (`index`), so any other shape is an emitter bug.
    throw new Error('transformers: unsupported write-target expression');
  }
  return factory.createTypeReferenceNode('NonNullable', [base]);
}

/** `<recv>.<method>(<args>)`. */
function method(recv: ts.Expression, name: string, args: ts.Expression[]): ts.Expression {
  return factory.createCallExpression(
    factory.createPropertyAccessExpression(recv, name),
    undefined,
    args
  );
}

function param(name: string): ts.ParameterDeclaration {
  return factory.createParameterDeclaration(undefined, undefined, name);
}

/** Next nested loop variable: `item`, `item2`, `item3`, … (avoids shadowing). */
function nextItemVar(current: string): string {
  if (current === 'data') return 'item';
  return `item${Number(current.slice('item'.length)) + 1}`;
}

/**
 * Conversion statements that, given the runtime value at `target` typed by
 * `schema`, rewrite date leaves in place. Each branch self-gates by returning
 * `[]` when nothing under it carries a date, so callers need no pre-check.
 * `seen` follows refs and guards cycles; `itemVar` names nested loop variables.
 *
 * Covers the shapes a date can hide in: date scalars, arrays of them, refs to
 * date-bearing schemas (composed via `transform<Ref>`), arrays of such refs,
 * records, nested inline objects, and the date-bearing members of a
 * union/intersection.
 */
function convert(
  target: ts.Expression,
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  readonlyLhs = false
): ts.Statement[] {
  if (isDateScalar(schema)) {
    return [ifThen(isStringGuard(target), assign(target, newDate(target), readonlyLhs))];
  }
  switch (schema.kind) {
    case 'ref':
      return convertRef(target, schema.name, byName, seen, readonlyLhs);
    case 'object': {
      const stmts: ts.Statement[] = [];
      for (const p of schema.properties) {
        stmts.push(
          ...convertProperty(
            index(target, p.name),
            p.schema,
            byName,
            seen,
            itemVar,
            p.readOnly === true
          )
        );
      }
      return stmts;
    }
    case 'array':
      return convertArray(target, schema.items, byName, seen, itemVar, readonlyLhs);
    case 'record':
      return convertCollection(target, schema.value, byName, seen, itemVar, true);
    case 'intersection': {
      // An intersection value satisfies *every* member type, so each member's
      // transform applies directly to `target` with no narrowing needed.
      const stmts: ts.Statement[] = [];
      for (const m of schema.members) {
        stmts.push(...convert(target, m, byName, seen, itemVar, readonlyLhs));
      }
      return stmts;
    }
    case 'union':
      return convertUnion(target, schema.members, byName, seen, itemVar, readonlyLhs);
    default:
      return [];
  }
}

/**
 * A union position. A runtime value inhabits exactly one member, so we apply
 * every date-bearing member's conversion to the same `target` and let the
 * unmatched members' runtime guards no-op.
 *
 * Type-safety is the catch: `target` is typed as the whole union, so an
 * object/ref member's `transform<Ref>(target)` would fail `--date-type Date`
 * strict-tsc (TS2345). We therefore gate the object-shaped members behind a
 * single `typeof target === "object"` check and CAST `target` to each member's
 * type — the cast makes it compile, the cast target's own internal string
 * guards make a wrong-member application a safe runtime no-op. Scalar date
 * members keep their `typeof === "string"` guard (their type is `Date` under
 * `--date-type Date`, so the assignment type-checks).
 */
function convertUnion(
  target: ts.Expression,
  members: SchemaModel[],
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  readonlyLhs = false
): ts.Statement[] {
  const stmts: ts.Statement[] = [];
  const objectGuarded: ts.Statement[] = [];
  for (const m of members) {
    if (isDateScalar(m)) {
      stmts.push(...convert(target, m, byName, seen, itemVar, readonlyLhs));
    } else if (m.kind === 'ref') {
      if (!hasDates(m, byName, seen)) continue;
      const call = factory.createCallExpression(
        factory.createIdentifier(transformName(m.name)),
        undefined,
        [asType(target, m.name)]
      );
      // A replace-by-value ref (scalar dates) must be assigned back; an object
      // ref mutates in place, so its return can be dropped.
      objectGuarded.push(
        needsReassign(m, byName, seen) ? assign(target, call, readonlyLhs) : exprStatement(call)
      );
    } else {
      // Object/array/record members: recurse under the shared object guard.
      objectGuarded.push(...convert(target, m, byName, seen, itemVar, readonlyLhs));
    }
  }
  if (objectGuarded.length > 0) {
    stmts.push(ifThen(isObjectGuard(target), factory.createBlock(objectGuarded, true)));
  }
  return stmts;
}

/**
 * A ref position, emitted only when the ref target carries dates (so the
 * sibling transform exists). An object-shaped ref mutates in place —
 * `if (<target>) transform<Ref>(<target>);` — but a ref resolving to a date
 * scalar (or an array/union of them) is replace-by-value, so its result is
 * assigned back: `if (<target>) <target> = transform<Ref>(<target>);`.
 */
function convertRef(
  target: ts.Expression,
  name: string,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  readonlyLhs = false
): ts.Statement[] {
  const ref: SchemaModel = { kind: 'ref', name };
  if (!hasDates(ref, byName, seen)) return [];
  const call = factory.createCallExpression(
    factory.createIdentifier(transformName(name)),
    undefined,
    [target]
  );
  return [
    ifThen(
      target,
      needsReassign(ref, byName, seen) ? assign(target, call, readonlyLhs) : exprStatement(call)
    ),
  ];
}

/**
 * A property position: a nested inline object guards presence and recurses
 * inside a block; everything else (scalars, refs, arrays, …) delegates to
 * `convert`, which guards itself.
 */
function convertProperty(
  target: ts.Expression,
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  readonlyLhs = false
): ts.Statement[] {
  if (schema.kind === 'ref') return convertRef(target, schema.name, byName, seen, readonlyLhs);
  if (schema.kind === 'object') {
    // Nested writes go one level inside — `readonly` is shallow, so no cast needed.
    const inner = convert(target, schema, byName, seen, itemVar);
    return inner.length === 0 ? [] : [ifThen(target, factory.createBlock(inner, true))];
  }
  return convert(target, schema, byName, seen, itemVar, readonlyLhs);
}

/**
 * A "replace-by-value" element is one a transform must overwrite wholesale
 * rather than mutate in place: a date scalar (`new Date(v)`) or an array of
 * such elements (`v.map(...)`). Returns the expression that yields the replaced
 * value for the element bound to `value`, or `null` when the element instead
 * mutates in place (object/ref/record). Recurses for arrays-of-arrays.
 *
 * Reassigning a loop *variable* is a no-op, so date scalars (and arrays of
 * them) can only be converted by reassigning their container slot — an array
 * via `slot = slot.map(...)`, a record via per-key assignment. This builds the
 * per-element value for those write-backs.
 */
function replacer(
  value: ts.Expression,
  element: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  depth = 0
): ts.Expression | null {
  if (isDateScalar(element)) return newDate(value);
  // A ref resolving to a replace-by-value shape (a scalar-date named schema):
  // its sibling transform returns the converted value — `transform<Ref>(v)`.
  if (element.kind === 'ref' && needsReassign(element, byName, seen)) {
    return factory.createCallExpression(
      factory.createIdentifier(transformName(element.name)),
      undefined,
      [value]
    );
  }
  if (element.kind === 'array') {
    // Map var for the level below: `v` over the scalar leaf, else `row`, `row2`,
    // … per array level — distinct names by depth avoid shadowing. Yields
    // `.map((v) => new Date(v))` and `.map((row) => row.map((v) => new Date(v)))`.
    const varName = element.items.kind === 'array' ? rowVar(depth + 1) : 'v';
    const inner = replacer(
      factory.createIdentifier(varName),
      element.items,
      byName,
      seen,
      depth + 1
    );
    if (inner === null) return null;
    return method(value, 'map', [arrow([param(varName)], inner)]);
  }
  return null;
}

/** Array map-var name by depth: `row`, `row2`, `row3`, … (avoids shadowing). */
function rowVar(depth: number): string {
  return depth <= 1 ? 'row' : `row${depth}`;
}

/** Conversions for `target` being an array whose elements are typed by `items`. */
function convertArray(
  target: ts.Expression,
  items: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  readonlyLhs = false
): ts.Statement[] {
  // Date scalars / arrays-of-date-scalars are replace-by-value: map over the
  // array and reassign the slot (reassigning a loop var would be lost).
  const varName = items.kind === 'array' ? rowVar(1) : 'v';
  const mapped = replacer(factory.createIdentifier(varName), items, byName, seen, 1);
  if (mapped !== null) {
    // `if (Array.isArray(t)) t = t.map((v) => new Date(v));`  (or nested `row`)
    return [
      ifThen(
        isArrayGuard(target),
        assign(target, method(target, 'map', [arrow([param(varName)], mapped)]), readonlyLhs)
      ),
    ];
  }
  if (items.kind === 'ref') {
    if (!hasDates(items, byName, seen)) return [];
    // `if (Array.isArray(t)) t.forEach(transformRef);`
    const forEach = method(target, 'forEach', [
      factory.createIdentifier(transformName(items.name)),
    ]);
    return [ifThen(isArrayGuard(target), exprStatement(forEach))];
  }
  return convertCollection(target, items, byName, seen, itemVar, false);
}

/**
 * Iterate a collection (array or record) of mutate-in-place elements (objects,
 * refs, records) and recurse with a fresh loop variable. Arrays iterate the
 * value directly; records iterate `Object.values(...)`. `[]` when the element
 * bears no dates.
 *
 * Replace-by-value elements (date scalars) never reach the array path here —
 * `convertArray` handles them via map-and-reassign. A *record* of date scalars
 * does land here: a `forEach` loop variable can't write back, so we iterate the
 * keys and assign back into the record (`rec[k] = new Date(rec[k])`).
 */
function convertCollection(
  target: ts.Expression,
  element: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  isRecord: boolean
): ts.Statement[] {
  if (isRecord) {
    // Replace-by-value elements (date scalars, arrays of them) can't be written
    // through a `forEach` loop var, so iterate the keys and assign back into the
    // record slot. Date scalars are string-guarded; nested arrays array-guarded.
    const slot = factory.createElementAccessExpression(target, factory.createIdentifier('__k'));
    const replaced = replacer(slot, element, byName, seen);
    if (replaced !== null) {
      const guard = isDateScalar(element) ? isStringGuard(slot) : isArrayGuard(slot);
      return [ifThen(target, keyLoop(target, ifThen(guard, assign(slot, replaced))))];
    }
  }
  const next = nextItemVar(itemVar);
  const body = convert(factory.createIdentifier(next), element, byName, seen, next);
  if (body.length === 0) return [];
  const iterable = isRecord
    ? method(factory.createIdentifier('Object'), 'values', [target])
    : target;
  const forEach = method(iterable, 'forEach', [
    arrow([param(next)], factory.createBlock(body, true)),
  ]);
  return [ifThen(isRecord ? target : isArrayGuard(target), exprStatement(forEach))];
}

/** `for (const __k of Object.keys(<target>)) <body>`. */
function keyLoop(target: ts.Expression, body: ts.Statement): ts.Statement {
  return factory.createForOfStatement(
    undefined,
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration('__k')],
      ts.NodeFlags.Const
    ),
    method(factory.createIdentifier('Object'), 'keys', [target]),
    body
  );
}

/** `export const transform<Name> = (data: <Name>): <Name> => { … };`. */
function transformStatement(
  named: NamedSchemaModel,
  byName: Map<string, SchemaModel>
): ts.Statement {
  // The sdk exports the type verbatim; only the `transform<Pascal>` NAME is PascalCased.
  const typeName = named.name;
  const data = factory.createIdentifier('data');
  const body =
    named.schema.kind === 'ref'
      ? convertRef(data, named.schema.name, byName, new Set())
      : convert(data, named.schema, byName, new Set(), 'data');
  const fn = arrow(
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'data',
        undefined,
        factory.createTypeReferenceNode(typeName)
      ),
    ],
    factory.createBlock([...body, factory.createReturnStatement(data)], true)
  );
  const typed = factory.createArrowFunction(
    fn.modifiers,
    fn.typeParameters,
    fn.parameters,
    factory.createTypeReferenceNode(typeName),
    fn.equalsGreaterThanToken,
    fn.body
  );
  return exportConstStatement(transformName(named.name), typed);
}

/** `import type { <Name>, … } from "<module>";`. */
function typeImport(names: string[], module: string): ts.Statement {
  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      true,
      undefined,
      factory.createNamedImports(
        names.map((n) =>
          factory.createImportSpecifier(false, undefined, factory.createIdentifier(safeIdent(n)))
        )
      )
    ),
    factory.createStringLiteral(module)
  );
}

/**
 * Render the transformers module. Emits one `transform<Name>` per named schema
 * that carries a date field; `''` when none do. `opts.sdkModule` is the import
 * specifier the schema TYPES are pulled from (the transformers call each other
 * as siblings, so only the types need importing).
 */
export function renderTransformersModule(model: ApiModel, opts: { sdkModule: string }): string {
  const byName = new Map(model.schemas.map((s) => [s.name, s.schema]));
  const dated = model.schemas.filter((s) => hasDates(s.schema, byName, new Set()));
  if (dated.length === 0) return '';
  const types = dated.map((s) => s.name);
  writableUsed = false; // reset the per-render flag `writableLhs` sets
  const transforms = dated.map((s) => transformStatement(s, byName));
  const statements = [
    typeImport(types, opts.sdkModule),
    ...(writableUsed ? parseStatements(WRITABLE_DECL) : []),
    ...transforms,
  ];
  return printStatements(statements);
}
