import { getTypes } from '../../oas-types.js';
import { async3Rules, oas3Rules } from '../rules/index.js';
import type { DiffVisitor } from '../types.js';

// A visitor key is a node type name; a typo (`HeaderMap` for `HeadersMap`) would make the
// rule silently never run, which no e2e fixture can tell from "nothing to report".
function visitedTypes(visitor: DiffVisitor): string[] {
  return Object.entries(visitor).flatMap(([key, value]) =>
    typeof value === 'function'
      ? key === 'any' || key === 'enter'
        ? []
        : [key]
      : [key, ...visitedTypes(value)]
  );
}

describe('diff rule registries', () => {
  it.each([
    ['oas3_1', oas3Rules],
    ['async3', async3Rules],
  ] as const)(
    '%s rules visit only node types that exist in that specification',
    (specVersion, rules) => {
      const typeNames = new Set(Object.keys(getTypes(specVersion)));

      const unknown = Object.values(rules)
        .flatMap((rule) => visitedTypes(rule()))
        .filter((typeName) => !typeNames.has(typeName));

      expect(unknown).toEqual([]);
    }
  );
});
