import type { DiffNode, Location } from '@redocly/openapi-core';

/** A diff node that stands alone, for tests that only need its type and location. */
export function loneNode(type: string, location: Location): DiffNode {
  const key = location.pointer.slice(location.pointer.lastIndexOf('/') + 1);
  const node = { type, key, location, value: {}, parent: null, children: [] };
  return { base: node, revision: node, parent: null, children: [], label: '#/' };
}
