import type { NodeEntry, NodeValue } from '../../node-tree/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { collectChanges } from '../changes.js';
import { buildDiffTree } from '../diff-tree.js';

const source = new Source('api.yaml', '');

/** A root with one level of children, each given as `key: { type, value }`. */
function documentOf(children: Record<string, { type?: string; value?: NodeValue }>) {
  const root: NodeEntry = {
    type: 'Root',
    key: '',
    location: new Location(source, '#/'),
    value: {},
    parent: null,
    children: [],
  };
  const nodes = new Map<string, NodeEntry>([['#/', root]]);
  for (const [key, { type = 'Schema', value = {} }] of Object.entries(children)) {
    const node: NodeEntry = {
      type,
      key,
      location: root.location.child([key]),
      value,
      parent: root,
      children: [],
    };
    root.children.push(node);
    nodes.set(node.location.pointer, node);
  }
  return nodes;
}

// No identity of its own: the structure alone decides.
const changesBetween = (
  base: ReturnType<typeof documentOf>,
  revision: ReturnType<typeof documentOf>
) => collectChanges(buildDiffTree(base.get('#/')!, revision.get('#/')!, {}).root, {});

/** `kind key · property  base-pointer → revision-pointer` per change. */
function summarize(changes: ReturnType<typeof collectChanges>): string[] {
  return changes.map((change) => {
    const property = change.kind === 'modified' ? ` · ${change.property}` : '';
    const base = change.kind === 'added' ? '-' : change.base.location.pointer;
    const revision = change.kind === 'removed' ? '-' : change.revision.location.pointer;
    return `${change.kind} ${change.key}${property}  ${base} → ${revision}`;
  });
}

describe('collectChanges', () => {
  it('emits one modified change per differing property, located at the escaped property pointer', () => {
    const base = documentOf({ a: { value: { type: 'integer', 'x/y': 1 } } });
    const revision = documentOf({ a: { value: { type: 'number', 'x/y': 2 } } });

    expect(summarize(changesBetween(base, revision))).toEqual([
      'modified #/a · type  #/a/type → #/a/type',
      'modified #/a · x/y  #/a/x~1y → #/a/x~1y',
    ]);
  });

  it('reports a removed node once, with the whole node as the value, and nothing below it', () => {
    const base = documentOf({ a: { value: { b: { c: 1 } } } });
    const nested: NodeEntry = {
      type: 'Schema',
      key: 'b',
      location: new Location(source, '#/a/b'),
      value: { c: 1 },
      parent: base.get('#/a')!,
      children: [],
    };
    base.get('#/a')!.children.push(nested);
    base.set('#/a/b', nested);

    const changes = changesBetween(base, documentOf({}));

    expect(summarize(changes)).toEqual(['removed #/a  #/a → -']);
    expect(changes[0].kind === 'removed' && changes[0].base.value).toEqual({ b: { c: 1 } });
  });

  it('treats a node whose type changed as a removed+added pair at the same key', () => {
    const base = documentOf({ a: { type: 'Schema' } });
    const revision = documentOf({ a: { type: 'Parameter' } });

    expect(summarize(changesBetween(base, revision))).toEqual([
      'removed #/a  #/a → -',
      'added #/a  - → #/a',
    ]);
  });

  it('compares the target of a $ref node like any other value of it', () => {
    const base = documentOf({ schema: { value: { $ref: '#/A' } } });
    const revision = documentOf({ schema: { value: { $ref: '#/B' } } });

    const [change] = changesBetween(base, revision);

    expect(change.kind === 'modified' && change.property).toBe('$ref');
    expect(change.kind === 'modified' && change.revision.value).toBe('#/B');
  });

  it('emits nothing when the two documents are identical', () => {
    const shape = { a: { value: { enum: ['x', 'y'] } } };

    expect(changesBetween(documentOf(shape), documentOf(shape))).toEqual([]);
  });
});
