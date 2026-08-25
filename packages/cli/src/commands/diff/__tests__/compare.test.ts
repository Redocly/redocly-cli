import { compareMaps } from '../engine/compare.js';
import type { NodeEntry } from '../engine/types.js';

function entry(partial: Partial<NodeEntry> & { pointer: string }): NodeEntry {
  return {
    realPointer: partial.pointer,
    parentPointer: null,
    keyInParent: '',
    typeName: 'Schema',
    scalars: {},
    refs: {},
    raw: {},
    ...partial,
  };
}

function toMap(entries: NodeEntry[]): Map<string, NodeEntry> {
  return new Map(entries.map((entry) => [entry.pointer, entry]));
}

describe('compareMaps', () => {
  it('emits one change per differing property, in pointer order', () => {
    const base = toMap([entry({ pointer: '#/a', scalars: { type: 'integer', description: 'x' } })]);
    const revision = toMap([
      entry({ pointer: '#/a', scalars: { type: 'number', description: 'x', format: 'float' } }),
    ]);

    expect(compareMaps(base, revision)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "pointer": "#/a/format",
            "value": undefined,
          },
          "kind": "changed",
          "pointer": "#/a",
          "property": "format",
          "revision": {
            "pointer": "#/a/format",
            "value": "float",
          },
          "typeName": "Schema",
        },
        {
          "base": {
            "pointer": "#/a/type",
            "value": "integer",
          },
          "kind": "changed",
          "pointer": "#/a",
          "property": "type",
          "revision": {
            "pointer": "#/a/type",
            "value": "number",
          },
          "typeName": "Schema",
        },
      ]
    `);
  });

  it('collapses a removed subtree into one change at its root', () => {
    const shared = entry({ pointer: '#/paths', typeName: 'PathsMap' });
    const base = toMap([
      shared,
      entry({
        pointer: '#/paths/~1pets',
        parentPointer: '#/paths',
        typeName: 'PathItem',
        raw: { get: {} },
      }),
      entry({
        pointer: '#/paths/~1pets/get',
        parentPointer: '#/paths/~1pets',
        typeName: 'Operation',
      }),
    ]);

    expect(compareMaps(base, toMap([shared]))).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "pointer": "#/paths/~1pets",
            "value": {
              "get": {},
            },
          },
          "kind": "removed",
          "pointer": "#/paths/~1pets",
          "typeName": "PathItem",
        },
      ]
    `);
  });

  it('treats a node whose type changed as a removed+added pair and suppresses its subtree', () => {
    const base = toMap([
      entry({ pointer: '#/x', typeName: 'Schema', raw: { type: 'object' } }),
      entry({ pointer: '#/x/properties/a', parentPointer: '#/x', scalars: { type: 'string' } }),
    ]);
    const revision = toMap([
      entry({ pointer: '#/x', typeName: 'Example', raw: { value: 1 } }),
      entry({ pointer: '#/x/properties/a', parentPointer: '#/x', scalars: { type: 'number' } }),
    ]);

    expect(compareMaps(base, revision)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "pointer": "#/x",
            "value": {
              "type": "object",
            },
          },
          "kind": "removed",
          "pointer": "#/x",
          "typeName": "Schema",
        },
        {
          "kind": "added",
          "pointer": "#/x",
          "revision": {
            "pointer": "#/x",
            "value": {
              "value": 1,
            },
          },
          "typeName": "Example",
        },
      ]
    `);
  });

  it('compares a $ref the way it compares a scalar', () => {
    const base = toMap([entry({ pointer: '#/m', refs: { schema: '#/components/schemas/A' } })]);
    const revision = toMap([entry({ pointer: '#/m', refs: { schema: '#/components/schemas/B' } })]);

    expect(compareMaps(base, revision)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "pointer": "#/m/schema",
            "value": "#/components/schemas/A",
          },
          "kind": "changed",
          "pointer": "#/m",
          "property": "schema",
          "revision": {
            "pointer": "#/m/schema",
            "value": "#/components/schemas/B",
          },
          "typeName": "Schema",
        },
      ]
    `);
  });

  it('emits nothing when the two maps are identical', () => {
    const entries = [entry({ pointer: '#/a', scalars: { type: 'string' } })];

    expect(compareMaps(toMap(entries), toMap(entries))).toEqual([]);
  });
});
