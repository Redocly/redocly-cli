import { getTypes } from '../../oas-types.js';
import { async3Rules, oas3Rules } from '../rules/index.js';

// A visitor key is a node type name; a typo (`HeaderMap` for `HeadersMap`) would make the
// rule silently never run, which no e2e fixture can tell from "nothing to report".
describe('diff rule registries', () => {
  it.each([
    ['oas3_1', oas3Rules],
    ['async3', async3Rules],
  ] as const)(
    '%s rules visit only node types that exist in that specification',
    (specVersion, rules) => {
      const typeNames = new Set(Object.keys(getTypes(specVersion)));

      const unknown = Object.values(rules)
        .flatMap((rule) => Object.keys(rule()))
        .filter((typeName) => typeName !== 'any' && !typeNames.has(typeName));

      expect(unknown).toEqual([]);
    }
  );
});
