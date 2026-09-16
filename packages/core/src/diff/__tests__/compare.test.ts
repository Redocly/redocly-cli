import type { NodeEntry } from '../../node-map/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { compareMaps } from '../compare.js';

const source = new Source('api.yaml', '');

function entry(partial: Partial<NodeEntry> & { key: string }): NodeEntry {
  return {
    parentKey: null,
    location: new Location(source, partial.key),
    typeName: 'Schema',
    properties: partial.properties ?? {},
    raw: partial.raw ?? partial.properties ?? {},
    ...partial,
  };
}

function toMap(entries: NodeEntry[]): Map<string, NodeEntry> {
  return new Map(entries.map((item) => [item.key, item]));
}

/** `kind key · property  base-pointer → revision-pointer` per change. */
function summarize(changes: ReturnType<typeof compareMaps>): string[] {
  return changes.map((change) => {
    const property = change.kind === 'modified' ? ` · ${change.property}` : '';
    const base = change.kind === 'added' ? '-' : change.base.location.pointer;
    const revision = change.kind === 'removed' ? '-' : change.revision.location.pointer;
    return `${change.kind} ${change.key}${property}  ${base} → ${revision}`;
  });
}

describe('compareMaps', () => {
  it('emits one modified change per differing property, located at the escaped property pointer', () => {
    const base = toMap([entry({ key: '#/a', properties: { type: 'integer', 'x/y': 1 } })]);
    const revision = toMap([entry({ key: '#/a', properties: { type: 'number', 'x/y': 2 } })]);

    expect(summarize(compareMaps(base, revision))).toEqual([
      'modified #/a · type  #/a/type → #/a/type',
      'modified #/a · x/y  #/a/x~1y → #/a/x~1y',
    ]);
  });

  it('collapses a removed subtree into one change at its root, carrying the raw node', () => {
    const base = toMap([
      entry({ key: '#/a', raw: { b: { c: 1 } } }),
      entry({ key: '#/a/b', parentKey: '#/a', raw: { c: 1 } }),
    ]);

    const [change] = compareMaps(base, new Map());

    expect(summarize([change])).toEqual(['removed #/a  #/a → -']);
    expect(change.kind === 'removed' && change.base.value).toEqual({ b: { c: 1 } });
    expect(compareMaps(base, new Map())).toHaveLength(1);
  });

  it('treats a node whose type changed as a removed+added pair and skips its subtree', () => {
    const base = toMap([
      entry({ key: '#/a', typeName: 'Schema' }),
      entry({ key: '#/a/b', parentKey: '#/a' }),
    ]);
    const revision = toMap([
      entry({ key: '#/a', typeName: 'Parameter' }),
      entry({ key: '#/a/b', parentKey: '#/a' }),
    ]);

    expect(summarize(compareMaps(base, revision))).toEqual([
      'removed #/a  #/a → -',
      'added #/a  - → #/a',
    ]);
  });

  it('compares a $ref the way it compares a scalar', () => {
    const base = toMap([entry({ key: '#/a', properties: { schema: { $ref: '#/A' } } })]);
    const revision = toMap([entry({ key: '#/a', properties: { schema: { $ref: '#/B' } } })]);

    const [change] = compareMaps(base, revision);

    expect(change.kind === 'modified' && change.property).toBe('schema');
    expect(change.kind === 'modified' && change.revision.value).toEqual({ $ref: '#/B' });
  });

  it('emits nothing when the two maps are identical', () => {
    const entries = [entry({ key: '#/a', properties: { enum: ['x', 'y'] } })];

    expect(compareMaps(toMap(entries), toMap(entries))).toEqual([]);
  });
});
