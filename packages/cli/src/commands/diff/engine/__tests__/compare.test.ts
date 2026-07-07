import { compareMaps } from '../compare.js';
import type { NodeEntry } from '../types.js';

function entry(partial: Partial<NodeEntry> & { pointer: string }): NodeEntry {
  return {
    realPointer: partial.pointer,
    parentPointer: null,
    typeName: 'Schema',
    scalars: {},
    refs: {},
    raw: {},
    ...partial,
  };
}

function toMap(entries: NodeEntry[]): Map<string, NodeEntry> {
  return new Map(entries.map((e) => [e.pointer, e]));
}

describe('compareMaps', () => {
  it('emits property-level changes for matched nodes', () => {
    const base = toMap([entry({ pointer: '#/a', scalars: { type: 'integer', description: 'x' } })]);
    const revision = toMap([
      entry({ pointer: '#/a', scalars: { type: 'number', description: 'x', format: 'float' } }),
    ]);

    const changes = compareMaps(base, revision);
    expect(changes).toEqual([
      {
        pointer: '#/a',
        property: 'format',
        kind: 'changed',
        typeName: 'Schema',
        base: { pointer: '#/a/format', value: undefined },
        revision: { pointer: '#/a/format', value: 'float' },
      },
      {
        pointer: '#/a',
        property: 'type',
        kind: 'changed',
        typeName: 'Schema',
        base: { pointer: '#/a/type', value: 'integer' },
        revision: { pointer: '#/a/type', value: 'number' },
      },
    ]);
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
    const revision = toMap([shared]);

    const changes = compareMaps(base, revision);
    expect(changes).toEqual([
      {
        pointer: '#/paths/~1pets',
        kind: 'removed',
        typeName: 'PathItem',
        base: { pointer: '#/paths/~1pets', value: { get: {} } },
      },
    ]);
  });

  it('treats typeName mismatch as a removed+added pair and suppresses descendants', () => {
    const base = toMap([
      entry({ pointer: '#/x', typeName: 'Schema', raw: { type: 'object' } }),
      entry({
        pointer: '#/x/properties/a',
        parentPointer: '#/x',
        scalars: { type: 'string' },
      }),
    ]);
    const revision = toMap([
      entry({ pointer: '#/x', typeName: 'Example', raw: { value: 1 } }),
      entry({
        pointer: '#/x/properties/a',
        parentPointer: '#/x',
        scalars: { type: 'number' },
      }),
    ]);

    const changes = compareMaps(base, revision);
    expect(changes).toEqual([
      {
        pointer: '#/x',
        kind: 'removed',
        typeName: 'Schema',
        base: { pointer: '#/x', value: { type: 'object' } },
      },
      {
        pointer: '#/x',
        kind: 'added',
        typeName: 'Example',
        revision: { pointer: '#/x', value: { value: 1 } },
      },
    ]);
  });

  it('emits nothing when maps are identical', () => {
    const entries = [entry({ pointer: '#/a', scalars: { type: 'string' } })];
    expect(compareMaps(toMap(entries), toMap(entries))).toEqual([]);
  });

  it('compares ref attributes like scalars', () => {
    const base = toMap([entry({ pointer: '#/m', refs: { schema: '#/components/schemas/A' } })]);
    const revision = toMap([entry({ pointer: '#/m', refs: { schema: '#/components/schemas/B' } })]);

    const changes = compareMaps(base, revision);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      pointer: '#/m',
      property: 'schema',
      kind: 'changed',
      base: { value: '#/components/schemas/A' },
      revision: { value: '#/components/schemas/B' },
    });
  });
});
