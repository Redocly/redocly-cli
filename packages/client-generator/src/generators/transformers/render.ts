// Emits standalone Date-transformer functions from the IR. For each named
// schema that (recursively) carries a `format: date-time`/`date` string field,
// emits `export const transform<Name> = (data: <Name>): <Name> => { … };` that
// walks the value and rewrites those wire ISO strings to `new Date(...)` in
// place, so the runtime value matches the sdk's `--date-type Date` types.
//
// Pairs with the sdk generated under `dateType: 'Date'`; the client itself
// stays zero-dep (Date is standard). Transformers compose across refs:
// `transformPet` calls `transformOwner(data["owner"])` when `Pet.owner` is an
// `Owner` that has dates. Source-text templates throughout.

import type { ApiModel, NamedSchemaModel, SchemaModel } from '@redocly/client-generator';
import { pascalCase, safeIdent } from '@redocly/client-generator/printers/typescript';

const INDENT = '    ';

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
 * A write target: the rendered expression plus its access path (base identifier
 * followed by string keys), so the `readonly` cast can rebuild the
 * `NonNullable<typeof …>` chain. Loop variables have a bare one-segment path.
 */
type Target = { text: string; path: string[] };

function ident(name: string): Target {
  return { text: name, path: [name] };
}

/** `<target>["key"]` — bracket access, robust for any (incl. non-identifier) key. */
function index(target: Target, key: string): Target {
  return { text: `${target.text}[${JSON.stringify(key)}]`, path: [...target.path, key] };
}

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

/**
 * `if (<cond>) …` — a brace-less single-statement `then` prints on the next line one
 * level deeper (`block: false`), a braced one wraps in `{ … }` (`block: true`);
 * `then` receives the indent its lines must start at.
 */
function ifThen(
  cond: string,
  then: (indent: string) => string[],
  indent: string,
  block = false
): string[] {
  if (block) return [`${indent}if (${cond}) {`, ...then(indent + INDENT), `${indent}}`];
  return [`${indent}if (${cond})`, ...then(indent + INDENT)];
}

/** `<target> = <value>;` — the LHS cast writable when it is a `readonly` property. */
function assign(target: Target, value: string, readonlyLhs = false): (indent: string) => string[] {
  const lhs = readonlyLhs ? writableLhs(target) : target.text;
  return (indent) => [`${indent}${lhs} = ${value};`];
}

function statement(expr: string): (indent: string) => string[] {
  return (indent) => [`${indent}${expr};`];
}

/**
 * The write target for a `readonly`-typed property:
 * `(recv as __Writable<NonNullable<typeof recv>>)["key"]`. `readonly` is shallow —
 * it blocks only the direct assignment — so nested writes stay uncast.
 */
function writableLhs(target: Target): string {
  if (target.path.length < 2) return target.text; // a parameter reassignment is never readonly
  writableUsed = true;
  const receiver: Target = {
    text: target.text.slice(0, target.text.lastIndexOf('[')),
    path: target.path.slice(0, -1),
  };
  const key = target.path[target.path.length - 1];
  return `(${receiver.text} as __Writable<${nonNullTypeOf(receiver)}>)[${JSON.stringify(key)}]`;
}

/**
 * `NonNullable<typeof <expr>>` for the access paths this emitter builds, with
 * `NonNullable` applied at every step so optional intermediate properties don't
 * poison the indexed type.
 */
function nonNullTypeOf(target: Target): string {
  let type = `typeof ${target.path[0]}`;
  for (const key of target.path.slice(1)) {
    type = `NonNullable<${type}>[${JSON.stringify(key)}]`;
  }
  return `NonNullable<${type}>`;
}

/** Next nested loop variable: `item`, `item2`, `item3`, … (avoids shadowing). */
function nextItemVar(current: string): string {
  if (current === 'data') return 'item';
  return `item${Number(current.slice('item'.length)) + 1}`;
}

/**
 * Conversion lines that, given the runtime value at `target` typed by `schema`,
 * rewrite date leaves in place. Each branch self-gates by returning `[]` when
 * nothing under it carries a date, so callers need no pre-check. `seen` follows
 * refs and guards cycles; `itemVar` names nested loop variables.
 */
function convert(
  target: Target,
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  indent: string,
  readonlyLhs = false
): string[] {
  if (isDateScalar(schema)) {
    return ifThen(
      `typeof ${target.text} === "string"`,
      assign(target, `new Date(${target.text})`, readonlyLhs),
      indent
    );
  }
  switch (schema.kind) {
    case 'ref':
      return convertRef(target, schema.name, byName, seen, indent, readonlyLhs);
    case 'object': {
      const lines: string[] = [];
      for (const p of schema.properties) {
        lines.push(
          ...convertProperty(
            index(target, p.name),
            p.schema,
            byName,
            seen,
            itemVar,
            indent,
            p.readOnly === true
          )
        );
      }
      return lines;
    }
    case 'array':
      return convertArray(target, schema.items, byName, seen, itemVar, indent, readonlyLhs);
    case 'record':
      return convertCollection(target, schema.value, byName, seen, itemVar, indent, true);
    case 'intersection': {
      // An intersection value satisfies *every* member type, so each member's
      // transform applies directly to `target` with no narrowing needed.
      const lines: string[] = [];
      for (const m of schema.members) {
        lines.push(...convert(target, m, byName, seen, itemVar, indent, readonlyLhs));
      }
      return lines;
    }
    case 'union':
      return convertUnion(target, schema.members, byName, seen, itemVar, indent, readonlyLhs);
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
  target: Target,
  members: SchemaModel[],
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  indent: string,
  readonlyLhs = false
): string[] {
  const lines: string[] = [];
  const guardedIndent = indent + INDENT;
  const objectGuarded: string[] = [];
  for (const m of members) {
    if (isDateScalar(m)) {
      lines.push(...convert(target, m, byName, seen, itemVar, indent, readonlyLhs));
    } else if (m.kind === 'ref') {
      if (!hasDates(m, byName, seen)) continue;
      const call = `${transformName(m.name)}(${target.text} as ${m.name})`;
      // A replace-by-value ref (scalar dates) must be assigned back; an object
      // ref mutates in place, so its return can be dropped.
      const build = needsReassign(m, byName, seen)
        ? assign(target, call, readonlyLhs)
        : statement(call);
      objectGuarded.push(...build(guardedIndent));
    } else {
      // Object/array/record members: recurse under the shared object guard.
      objectGuarded.push(...convert(target, m, byName, seen, itemVar, guardedIndent, readonlyLhs));
    }
  }
  if (objectGuarded.length > 0) {
    lines.push(
      ...ifThen(
        `${target.text} && typeof ${target.text} === "object"`,
        () => objectGuarded,
        indent,
        true
      )
    );
  }
  return lines;
}

/**
 * A ref position, emitted only when the ref target carries dates (so the
 * sibling transform exists). An object-shaped ref mutates in place —
 * `if (<target>) transform<Ref>(<target>);` — but a ref resolving to a date
 * scalar (or an array/union of them) is replace-by-value, so its result is
 * assigned back: `if (<target>) <target> = transform<Ref>(<target>);`.
 */
function convertRef(
  target: Target,
  name: string,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  indent: string,
  readonlyLhs = false
): string[] {
  const ref: SchemaModel = { kind: 'ref', name };
  if (!hasDates(ref, byName, seen)) return [];
  const call = `${transformName(name)}(${target.text})`;
  return ifThen(
    target.text,
    needsReassign(ref, byName, seen) ? assign(target, call, readonlyLhs) : statement(call),
    indent
  );
}

/**
 * A property position: a nested inline object guards presence and recurses
 * inside a block; everything else (scalars, refs, arrays, …) delegates to
 * `convert`, which guards itself.
 */
function convertProperty(
  target: Target,
  schema: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  indent: string,
  readonlyLhs = false
): string[] {
  if (schema.kind === 'ref') {
    return convertRef(target, schema.name, byName, seen, indent, readonlyLhs);
  }
  if (schema.kind === 'object') {
    // Nested writes go one level inside — `readonly` is shallow, so no cast needed.
    const inner = convert(target, schema, byName, seen, itemVar, indent + INDENT);
    if (inner.length === 0) return [];
    return ifThen(target.text, () => inner, indent, true);
  }
  return convert(target, schema, byName, seen, itemVar, indent, readonlyLhs);
}

/**
 * A "replace-by-value" element is one a transform must overwrite wholesale
 * rather than mutate in place: a date scalar (`new Date(v)`) or an array of
 * such elements (`v.map(...)`). Returns the expression that yields the replaced
 * value for the element bound to `value`, or `null` when the element instead
 * mutates in place (object/ref/record). Recurses for arrays-of-arrays.
 */
function replacer(
  value: string,
  element: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  depth = 0
): string | null {
  if (isDateScalar(element)) return `new Date(${value})`;
  // A ref resolving to a replace-by-value shape (a scalar-date named schema):
  // its sibling transform returns the converted value — `transform<Ref>(v)`.
  if (element.kind === 'ref' && needsReassign(element, byName, seen)) {
    return `${transformName(element.name)}(${value})`;
  }
  if (element.kind === 'array') {
    // Map var for the level below: `v` over the scalar leaf, else `row`, `row2`,
    // … per array level — distinct names by depth avoid shadowing. Yields
    // `.map(v => new Date(v))` and `.map(row => row.map(v => new Date(v)))`.
    const varName = element.items.kind === 'array' ? rowVar(depth + 1) : 'v';
    const inner = replacer(varName, element.items, byName, seen, depth + 1);
    if (inner === null) return null;
    return `${value}.map(${varName} => ${inner})`;
  }
  return null;
}

/** Array map-var name by depth: `row`, `row2`, `row3`, … (avoids shadowing). */
function rowVar(depth: number): string {
  return depth <= 1 ? 'row' : `row${depth}`;
}

/** Conversions for `target` being an array whose elements are typed by `items`. */
function convertArray(
  target: Target,
  items: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  indent: string,
  readonlyLhs = false
): string[] {
  // Date scalars / arrays-of-date-scalars are replace-by-value: map over the
  // array and reassign the slot (reassigning a loop var would be lost).
  const varName = items.kind === 'array' ? rowVar(1) : 'v';
  const mapped = replacer(varName, items, byName, seen, 1);
  if (mapped !== null) {
    // `if (Array.isArray(t)) t = t.map(v => new Date(v));`  (or nested `row`)
    return ifThen(
      `Array.isArray(${target.text})`,
      assign(target, `${target.text}.map(${varName} => ${mapped})`, readonlyLhs),
      indent
    );
  }
  if (items.kind === 'ref') {
    if (!hasDates(items, byName, seen)) return [];
    // `if (Array.isArray(t)) t.forEach(transformRef);`
    return ifThen(
      `Array.isArray(${target.text})`,
      statement(`${target.text}.forEach(${transformName(items.name)})`),
      indent
    );
  }
  return convertCollection(target, items, byName, seen, itemVar, indent, false);
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
 * keys and assign back into the record (`rec[__k] = new Date(rec[__k])`).
 */
function convertCollection(
  target: Target,
  element: SchemaModel,
  byName: Map<string, SchemaModel>,
  seen: Set<string>,
  itemVar: string,
  indent: string,
  isRecord: boolean
): string[] {
  if (isRecord) {
    // Replace-by-value elements (date scalars, arrays of them) can't be written
    // through a `forEach` loop var, so iterate the keys and assign back into the
    // record slot. Date scalars are string-guarded; nested arrays array-guarded.
    const slot: Target = { text: `${target.text}[__k]`, path: [...target.path, '__k'] };
    const replaced = replacer(slot.text, element, byName, seen);
    if (replaced !== null) {
      const guard = isDateScalar(element)
        ? `typeof ${slot.text} === "string"`
        : `Array.isArray(${slot.text})`;
      return ifThen(
        target.text,
        (loopIndent) => [
          `${loopIndent}for (const __k of Object.keys(${target.text}))`,
          ...ifThen(guard, (inner) => [`${inner}${slot.text} = ${replaced};`], loopIndent + INDENT),
        ],
        indent
      );
    }
  }
  const next = nextItemVar(itemVar);
  // The loop sits one `if` level in, and the forEach body one more.
  const body = convert(ident(next), element, byName, seen, next, indent + INDENT + INDENT);
  if (body.length === 0) return [];
  const iterable = isRecord ? `Object.values(${target.text})` : target.text;
  return ifThen(
    isRecord ? target.text : `Array.isArray(${target.text})`,
    (inner) => [`${inner}${iterable}.forEach(${next} => {`, ...body, `${inner}});`],
    indent
  );
}

/** `export const transform<Name> = (data: <Name>): <Name> => { … };`. */
function transformBlock(named: NamedSchemaModel, byName: Map<string, SchemaModel>): string {
  // The sdk exports the type verbatim; only the `transform<Pascal>` NAME is PascalCased.
  const typeName = named.name;
  const data = ident('data');
  const body =
    named.schema.kind === 'ref'
      ? convertRef(data, named.schema.name, byName, new Set(), INDENT)
      : convert(data, named.schema, byName, new Set(), 'data', INDENT);
  return [
    `export const ${transformName(named.name)} = (data: ${typeName}): ${typeName} => {`,
    ...body,
    `${INDENT}return data;`,
    '};',
  ].join('\n');
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
  const types = dated.map((s) => safeIdent(s.name)).join(', ');
  writableUsed = false; // reset the per-render flag `writableLhs` sets
  const transforms = dated.map((s) => transformBlock(s, byName));
  const blocks = [
    `import type { ${types} } from ${JSON.stringify(opts.sdkModule)};`,
    ...(writableUsed ? [WRITABLE_DECL] : []),
    ...transforms,
  ];
  return blocks.join('\n\n');
}
