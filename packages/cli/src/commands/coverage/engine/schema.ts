import { isPlainObject, isRef, unescapePointerFragment } from '@redocly/openapi-core';

import { SchemaValidator } from '../../drift/engine/schema-validator.js';

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

const validator = new SchemaValidator();
const validatable = new WeakMap<Schema, Schema>();

/**
 * A branch in the form Ajv can compile.
 *
 * Coverage reads a description that still carries `$ref`s, and a pointer like
 * `#/components/schemas/User` resolves against the root Ajv compiles. Putting
 * the components beside the branch gives those pointers something to find.
 *
 * Memoized because the validator caches compiled schemas by object identity,
 * so a fresh wrapper per call would recompile every branch of every exchange.
 */
function forValidation(spec: Schema, schema: Schema): Schema {
  const cached = validatable.get(schema);
  if (cached) return cached;

  const wrapped: Schema = { allOf: [schema], components: spec.components };
  validatable.set(schema, wrapped);

  return wrapped;
}

/**
 * Whether a value satisfies a branch, decided by the same validator `drift`
 * judges traffic with. Hand-reading keywords here only ever covered the ones
 * someone had thought of, and every gap credited a branch nothing exercised.
 */
export function matches(spec: Schema, schema: Schema, value: unknown): boolean {
  return validator.validate(forValidation(spec, schema), value).valid;
}

/** Every property name a schema carries, including the ones it composes in. */
export function composedNames(spec: Schema, schema: Schema, depth = 0): Set<string> {
  const { schema: target } = resolve(spec, schema);
  if (!target || depth > MAX_DEPTH) return new Set();

  const names = new Set(Object.keys(target.properties ?? {}));
  for (const sub of target.allOf ?? []) {
    for (const name of composedNames(spec, sub, depth + 1)) names.add(name);
  }

  return names;
}

/**
 * How much of a value a branch accounts for. The validator says which branches
 * a value could be; where several could, the one declaring most of what the
 * value carries is the one it exercised.
 */
export function fit(spec: Schema, schema: Schema, value: unknown): number {
  if (!isPlainObject(value)) return 0;

  const names = composedNames(spec, schema);

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
