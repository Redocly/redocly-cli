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

  const pointer = schema.$ref.replace(/^#\//, '').split('/').map(unescapePointerFragment);
  let node: Schema | undefined = spec;
  for (const segment of pointer) {
    node = node?.[segment];
  }

  return { schema: node, name: pointer.at(-1) };
}

/**
 * Property names a schema declares itself, following `allOf` but leaving a
 * `$ref` inside it alone: the target reports those under its own name, so
 * counting them here too would report them as unused on both schemas.
 */
export function declared(spec: Schema, schema: Schema, depth = 0): [string, Schema][] {
  if (depth > MAX_DEPTH) return [];

  const { schema: target } = resolve(spec, schema);
  if (!target) return [];

  return [
    ...(Object.entries(target.properties ?? {}) as [string, Schema][]),
    ...(target.allOf ?? []).flatMap((sub: Schema) =>
      isRef(sub) ? [] : declared(spec, sub, depth + 1)
    ),
  ];
}

interface Composition {
  type?: string;
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
  if (!target || depth > MAX_DEPTH) return { required: [], names: new Set() };

  const composition: Composition = {
    type: target.type,
    required: [...(target.required ?? [])],
    names: new Set(Object.keys(target.properties ?? {})),
  };

  for (const sub of target.allOf ?? []) {
    const inherited = compose(spec, sub, depth + 1);

    composition.type ??= inherited.type;
    composition.required.push(...inherited.required);
    for (const name of inherited.names) composition.names.add(name);
  }

  return composition;
}

/**
 * Whether a value plausibly satisfies a branch. Without this a union credits
 * every alternative from a single value, and every branch reads as covered no
 * matter what the API actually returned.
 */
export function matches(spec: Schema, schema: Schema, value: unknown): boolean {
  const { schema: target } = resolve(spec, schema);
  if (!target) return false;

  if (target.enum) return target.enum.includes(value as never);

  const { type, required, names } = compose(spec, target);

  if (type === 'object' || names.size > 0) {
    if (!isPlainObject(value)) return false;

    const keys = new Set(Object.keys(value));
    if (!required.every((key) => keys.has(key))) return false;

    return names.size === 0 || [...keys].some((key) => names.has(key));
  }

  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'number') return typeof value === 'number';
  if (type === 'null') return value === null;

  return true;
}
