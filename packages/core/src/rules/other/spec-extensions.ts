import { isRef } from '../../ref-utils.js';
import { isNamedType, SpecExtension, type NormalizedNodeType } from '../../types/index.js';
import type { StatsRow, SpecVendorExtensionsAccumulator } from '../../typings/common.js';
import { getOwn } from '../../utils/get-own.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { UserContext } from '../../walk.js';

const EXTENSION_PREFIX = 'x-';

// Strings longer than this become a `<string:N>` marker, so no code / payload / prose leaves the box.
const MAX_VALUE_LENGTH = 40;
// Both caps bound cardinality for map-like extensions with client-defined keys (x-metadata, x-examples).
const MAX_VALUES_PER_PROP = 20;
const MAX_PROPS_PER_EXTENSION = 20;

const VALUE_KEY = '$value'; // holds a scalar extension's own value, e.g. `x-hideReplay: true`
const TRUNCATED = '<truncated>';

export const StatsSpecExtensions = (accumulator: SpecVendorExtensionsAccumulator) => {
  return {
    any: {
      enter(node: unknown, ctx: UserContext) {
        if (ctx.type === SpecExtension) return;

        recordExtensions(accumulator, node, ctx.type);
        // Extensions written next to a $ref sit on the raw node, not the resolved target.
        if (isRef(ctx.rawNode)) recordExtensions(accumulator, ctx.rawNode, ctx.type);
      },
    },
  };
};

function recordExtensions(
  accumulator: SpecVendorExtensionsAccumulator,
  node: unknown,
  type: NormalizedNodeType
) {
  if (!isPlainObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith(EXTENSION_PREFIX)) continue;
    if (isMapEntryKey(type, key, value)) continue;
    recordExtension(accumulator, key, value);
  }
}

// An x- key is not an extension when the type resolves it to a named map entry (a schema name, a channel address).
function isMapEntryKey(type: NormalizedNodeType, key: string, value: unknown): boolean {
  if (getOwn(type.properties, key) !== undefined) return false;
  const entryType =
    typeof type.additionalProperties === 'function'
      ? type.additionalProperties(value, key)
      : type.additionalProperties;
  return isNamedType(entryType);
}

function recordExtension(
  accumulator: SpecVendorExtensionsAccumulator,
  key: string,
  value: unknown
) {
  const entry = (accumulator[key] ??= { count: 0, props: {} });
  entry.count++;
  for (const [prop, propValue] of getExtensionProps(value)) {
    addSample(entry.props, prop, describe(propValue));
  }
}

function getExtensionProps(value: unknown): Array<[string, unknown]> {
  if (isPlainObject(value)) return Object.entries(value);
  if (Array.isArray(value)) {
    return value.flatMap((item) => (isPlainObject(item) ? Object.entries(item) : []));
  }
  return [[VALUE_KEY, value]];
}

function describe(value: unknown): string {
  if (value === null) return '<null>';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return value.length <= MAX_VALUE_LENGTH ? value : `<string:${value.length}>`;
  }
  if (Array.isArray(value)) return `<array:${value.length}>`;
  if (isPlainObject(value)) return '$ref' in value ? '<ref>' : '<object>';
  return '<unknown>';
}

function addSample(props: Record<string, Set<string>>, prop: string, value: string) {
  const isNewProp = !(prop in props);
  if (isNewProp && Object.keys(props).length >= MAX_PROPS_PER_EXTENSION) {
    prop = TRUNCATED; // too many distinct props: fold the rest under one marker
  }
  addBounded((props[prop] ??= new Set()), value);
}

function addBounded(set: Set<string>, value: string) {
  if (set.has(value) || set.has(TRUNCATED)) return;
  set.add(set.size >= MAX_VALUES_PER_PROP ? TRUNCATED : value);
}

export function applySpecExtensionsStats(
  accumulator: SpecVendorExtensionsAccumulator,
  statsRow: StatsRow
) {
  const names = Object.keys(accumulator).sort();
  statsRow.total = names.length;
  statsRow.counts = Object.fromEntries(names.map((name) => [name, accumulator[name].count]));
}
