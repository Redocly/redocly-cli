import type { Location, Pair } from '@redocly/openapi-core';

/** A pair for a node that stands alone, for tests that only need its type and location. */
export function lonePair(type: string, location: Location): Pair {
  const key = location.pointer.slice(location.pointer.lastIndexOf('/') + 1);
  const node = { type, key, location, value: {}, parent: null, children: [] };
  return { base: node, revision: node, parent: null, children: [], occurrence: 1 };
}
