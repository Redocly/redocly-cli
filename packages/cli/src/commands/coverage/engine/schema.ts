import { isPlainObject, isRef, unescapePointerFragment } from '@redocly/openapi-core';

// A schema node is an arbitrary JSON Schema object; narrowing it to `unknown`
// would force a cast at every keyword access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Schema = Record<string, any>;

/** `oneOf`/`anyOf` are alternatives a value selects between; `allOf` always applies. */
export const VARIANT_KEYWORDS = ['oneOf', 'anyOf'] as const;

export const MAX_DEPTH = 40;

/**
 * Follow a local `$ref`, reporting the component name it pointed at.
 *
 * Coverage groups its results by schema name, so it reads a bundled document
 * that still carries `$ref`s. `drift` cannot supply one: its loader bundles
 * with `dereference: true`, which deep-clones every target, leaving no way to
 * tell which component a value belongs to.
 */
export function resolve(
  spec: Schema,
  schema: Schema | undefined
): { schema?: Schema; name?: string } {
  if (!schema) return {};
  if (!isRef(schema)) return { schema };

  // A component can be a bare alias for another one, so follow the chain to the
  // schema that actually declares something.
  let node: Schema | undefined = schema;
  let name: string | undefined;
  for (let depth = 0; isRef(node) && depth <= MAX_DEPTH; depth += 1) {
    const pointer: string[] = node.$ref
      .replace(/^#\//, '')
      .split('/')
      .map(unescapePointerFragment);
    let target: Schema | undefined = spec;
    for (const segment of pointer) {
      target = target?.[segment];
    }

    node = target;
    name = pointer.at(-1);
  }

  return { schema: node, name };
}

/**
 * Property names a schema declares itself, following `allOf` but leaving a
 * `$ref` inside it alone: the target reports those under its own name, so
 * counting them here too would report them as unused on both schemas.
 */
export function declared(spec: Schema, schema: Schema, path = '', depth = 0): [string, Schema][] {
  if (depth > MAX_DEPTH) return [];

  const { schema: target } = resolve(spec, schema);
  if (!target) return [];

  const found: [string, Schema][] = [];

  for (const [property, sub] of Object.entries(target.properties ?? {}) as [string, Schema][]) {
    const propertyPath = path ? `${path}.${property}` : property;

    found.push([propertyPath, sub]);

    // The walk records a nested inline object under a dotted path, so the two
    // have to enumerate the same shape or the nested gaps never surface. A
    // `$ref` still stops it: the walk reports what is behind one by its name.
    if (!isRef(sub)) found.push(...declared(spec, sub, propertyPath, depth + 1));
  }

  for (const sub of target.allOf ?? []) {
    if (isRef(sub)) continue;

    found.push(...declared(spec, sub, path, depth + 1));
  }

  if (target.items && !isRef(target.items)) {
    found.push(...declared(spec, target.items, path, depth + 1));
  }

  const byPath = new Map(found.map((entry) => [entry[0], entry]));

  return [...byPath.values()];
}

interface Composition {
  type?: string | string[];
  format?: string;
  /** OpenAPI 3.0 spells a nullable value this way; 3.1 puts `null` in `type`. */
  nullable: boolean;
  required: string[];
  names: Set<string>;
  /** Wrapped so that a literal `undefined` stays distinguishable from absence. */
  literal?: { values: unknown[] };
  /** One entry per `oneOf`/`anyOf`; a value has to satisfy a branch of each. */
  unions: Schema[][];
}

/**
 * Every constraint a value has to satisfy, gathered across `allOf` and through
 * the `$ref`s inside it. A composed schema states nothing itself, so reading
 * only its own keywords would accept any value at all.
 *
 * This is the single place constraints are collected. `matches` reads nothing
 * off a schema directly, so a keyword handled here is handled everywhere.
 */
function compose(spec: Schema, schema: Schema, depth = 0): Composition {
  const { schema: target } = resolve(spec, schema);
  if (!target || depth > MAX_DEPTH) {
    return { nullable: false, required: [], names: new Set(), unions: [] };
  }

  const composition: Composition = {
    type: target.type,
    format: target.format,
    nullable: target.nullable === true,
    required: [...(target.required ?? [])],
    names: new Set(Object.keys(target.properties ?? {})),
    literal: literalOf(target),
    unions: VARIANT_KEYWORDS.filter((keyword) => target[keyword]?.length).map(
      (keyword) => target[keyword] as Schema[]
    ),
  };

  for (const sub of target.allOf ?? []) {
    const inherited = compose(spec, sub, depth + 1);

    composition.type ??= inherited.type;
    composition.format ??= inherited.format;
    composition.nullable ||= inherited.nullable;
    composition.literal ??= inherited.literal;
    composition.required.push(...inherited.required);
    composition.unions.push(...inherited.unions);
    for (const name of inherited.names) composition.names.add(name);
  }

  return composition;
}

/** The values a schema pins itself to, whether by `enum` or by 3.1's `const`. */
function literalOf(schema: Schema): { values: unknown[] } | undefined {
  if (Array.isArray(schema.enum)) return { values: schema.enum };
  if ('const' in schema) return { values: [schema.const] };

  return undefined;
}

/** OpenAPI 3.1 allows a list of types, 3.0 only a single one. */
function typesOf(type: string | string[] | undefined): string[] {
  if (Array.isArray(type)) return type;

  return type ? [type] : [];
}

function matchesType(type: string, value: unknown): boolean {
  if (type === 'object') return isPlainObject(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'number') return typeof value === 'number';
  if (type === 'null') return value === null;

  return true;
}

/**
 * Whether a value could satisfy a branch at all. This is the hard filter only:
 * choosing between the branches that survive it is `fit`'s job, because a value
 * that merely shares a property name with a branch has not exercised it.
 */
export function matches(spec: Schema, schema: Schema, value: unknown, depth = 0): boolean {
  const { schema: target } = resolve(spec, schema);
  if (!target) return false;

  const { type, nullable, required, names, literal, unions } = compose(spec, target);
  const types = typesOf(type);

  // Nullability outranks every other constraint: a nullable enum still takes null.
  if (value === null && nullable) return true;

  // Without this a union of literals is indistinguishable, and every branch
  // accepts every value of the shared type.
  if (literal) return literal.values.includes(value);

  // A schema whose only constraint is a nested union states nothing itself, so
  // without this it accepts every value and its branches all read as covered.
  if (depth <= MAX_DEPTH) {
    const satisfied = unions.every((branches) =>
      branches.some((branch) => matches(spec, branch, value, depth + 1))
    );
    if (!satisfied) return false;
  }

  // Properties without a `type` still describe an object.
  const objectish = types.includes('object') || (types.length === 0 && names.size > 0);

  if (objectish && isPlainObject(value)) {
    const keys = new Set(Object.keys(value));

    return required.every((key) => keys.has(key));
  }

  // A 3.1 type array can allow an object alongside other types, so a non-object
  // value still has the rest of the list to satisfy.
  if (types.length === 0) return unions.length > 0 || !objectish;

  return types.some((one) => matchesType(one, value));
}

/** Every property name a schema carries, including the ones it composes in. */
export function composedNames(spec: Schema, schema: Schema): Set<string> {
  return compose(spec, schema).names;
}

/**
 * The `format`s worth telling apart when two branches share a type. Used only
 * to rank branches, never to reject a value: OpenAPI treats `format` as
 * advisory, so a stricter reading here would drop valid coverage.
 */
const FORMAT_TESTS: Record<string, (value: string) => boolean> = {
  uuid: (value) => /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value),
  date: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
  'date-time': (value) => !Number.isNaN(Date.parse(value)) && /[T ]/.test(value),
  email: (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
  uri: (value) => /^[a-z][a-z0-9+.-]*:/i.test(value),
  ipv4: (value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value),
};

/** How much of a value a branch accounts for, used to rank the branches it could be. */
export function fit(spec: Schema, schema: Schema, value: unknown): number {
  const { schema: target } = resolve(spec, schema);
  if (!target) return 0;

  const { names, format } = compose(spec, target);

  if (typeof value === 'string') {
    const test = format ? FORMAT_TESTS[format] : undefined;

    return test?.(value) ? 1 : 0;
  }

  if (!isPlainObject(value)) return 0;

  return Object.keys(value).filter((key) => names.has(key)).length;
}

/**
 * The branch a `discriminator` names, which settles the choice outright when
 * the description provides one.
 */
function discriminated(
  spec: Schema,
  parent: Schema,
  branches: Schema[],
  value: unknown
): number | undefined {
  const propertyName = parent.discriminator?.propertyName;
  if (!propertyName || !isPlainObject(value)) return undefined;

  const key = value[propertyName];
  if (typeof key !== 'string') return undefined;

  // A mapping value is either a `$ref` or a bare component name, and without a
  // mapping the value itself names the component.
  const mapped: string = parent.discriminator.mapping?.[key] ?? key;
  const wanted = mapped.includes('/') ? mapped.split('/').at(-1) : mapped;

  const index = branches.findIndex((branch) => resolve(spec, branch).name === wanted);

  return index === -1 ? undefined : index;
}

/**
 * The branch indices a value exercises. Where several remain possible, only the
 * best fitting ones count: crediting every branch a value merely could be makes
 * union coverage meaningless.
 */
export function selectBranches(
  spec: Schema,
  parent: Schema,
  branches: Schema[],
  value: unknown
): number[] {
  const named = discriminated(spec, parent, branches, value);
  if (named !== undefined) return [named];

  const possible = branches
    .map((branch, index) => ({ branch, index }))
    .filter(({ branch }) => matches(spec, branch, value));
  if (possible.length <= 1) return possible.map(({ index }) => index);

  const scored = possible.map(({ branch, index }) => ({ index, score: fit(spec, branch, value) }));
  const best = Math.max(...scored.map(({ score }) => score));

  return scored.filter(({ score }) => score === best).map(({ index }) => index);
}
