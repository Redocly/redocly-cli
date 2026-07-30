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
  /** OpenAPI 3.0 spells a nullable value this way; 3.1 puts `null` in `type`. */
  nullable: boolean;
  required: string[];
  names: Set<string>;
}

/**
 * The constraints a value has to satisfy, gathered across `allOf` and through
 * the `$ref`s inside it. A composed schema states nothing itself, so reading
 * only its own keywords would accept any value at all.
 */
function compose(spec: Schema, schema: Schema, depth = 0): Composition {
  const { schema: target } = resolve(spec, schema);
  if (!target || depth > MAX_DEPTH) return { nullable: false, required: [], names: new Set() };

  const composition: Composition = {
    type: target.type,
    nullable: target.nullable === true,
    required: [...(target.required ?? [])],
    names: new Set(Object.keys(target.properties ?? {})),
  };

  for (const sub of target.allOf ?? []) {
    const inherited = compose(spec, sub, depth + 1);

    composition.type ??= inherited.type;
    composition.nullable ||= inherited.nullable;
    composition.required.push(...inherited.required);
    for (const name of inherited.names) composition.names.add(name);
  }

  return composition;
}

/** OpenAPI 3.1 allows a list of types, 3.0 only a single one. */
function typesOf(type: string | string[] | undefined): string[] {
  if (Array.isArray(type)) return type;

  return type ? [type] : [];
}

function matchesType(type: string, value: unknown): boolean {
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
export function matches(spec: Schema, schema: Schema, value: unknown): boolean {
  const { schema: target } = resolve(spec, schema);
  if (!target) return false;

  if (target.enum) return target.enum.includes(value as never);

  const { type, nullable, required, names } = compose(spec, target);
  const types = typesOf(type);

  if (value === null && nullable) return true;

  if (types.includes('object') || (types.length === 0 && names.size > 0)) {
    if (!isPlainObject(value)) return types.includes('null') && value === null;

    const keys = new Set(Object.keys(value));

    return required.every((key) => keys.has(key));
  }

  if (types.length === 0) return true;

  return types.some((one) => matchesType(one, value));
}

/** Every property name a schema carries, including the ones it composes in. */
export function composedNames(spec: Schema, schema: Schema): Set<string> {
  return compose(spec, schema).names;
}

/** How many of a value's own properties a branch declares. */
export function fit(spec: Schema, schema: Schema, value: unknown): number {
  if (!isPlainObject(value)) return 0;

  const { schema: target } = resolve(spec, schema);
  if (!target) return 0;

  const { names } = compose(spec, target);

  return Object.keys(value).filter((key) => names.has(key)).length;
}

/**
 * The branch a `discriminator` names, which settles the choice outright when
 * the description provides one.
 */
function discriminated(parent: Schema, branches: Schema[], value: unknown): number | undefined {
  const propertyName = parent.discriminator?.propertyName;
  if (!propertyName || !isPlainObject(value)) return undefined;

  const key = value[propertyName];
  if (typeof key !== 'string') return undefined;

  const mapped = parent.discriminator.mapping?.[key] ?? `#/components/schemas/${key}`;
  const index = branches.findIndex((branch) => isRef(branch) && branch.$ref === mapped);

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
  const named = discriminated(parent, branches, value);
  if (named !== undefined) return [named];

  const possible = branches
    .map((branch, index) => ({ branch, index }))
    .filter(({ branch }) => matches(spec, branch, value));
  if (possible.length <= 1) return possible.map(({ index }) => index);

  const scored = possible.map(({ branch, index }) => ({ index, score: fit(spec, branch, value) }));
  const best = Math.max(...scored.map(({ score }) => score));

  return scored.filter(({ score }) => score === best).map(({ index }) => index);
}
