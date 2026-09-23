import type { NodeEntry, Reference } from '../../node-map/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import type { DiffSpec, Pair } from '../types.js';
import { usageDirections } from '../usage.js';

const source = new Source('tree.yaml', '');

/**
 * Builds nodes from a spelled-out tree for tests that need real node types rather than a
 * document. Each line is `key Type`, optionally followed by `name=value` fields; a node's
 * parent is the closest preceding line whose key is a prefix of it — which is what
 * `collectNodes` records when it walks a document.
 */
export function treeOf(nodes: string): Map<string, NodeEntry> {
  const entries = new Map<string, NodeEntry>();

  for (const line of nodes.trim().split('\n')) {
    const [key, type, ...assignments] = line.trim().split(/\s+/);
    const parentKey = [...entries.keys()]
      .reverse()
      .find((candidate) => key.startsWith(`${candidate}/`));

    const parent = (parentKey ? entries.get(parentKey) : null) ?? null;
    const entry: NodeEntry = {
      type,
      key: key.slice(key.lastIndexOf('/') + 1),
      location: new Location(source, key),
      value: Object.fromEntries(assignments.map((pair) => pair.split('='))),
      parent,
      children: [],
    };
    parent?.children.push(entry);
    entries.set(key, entry);
  }

  return entries;
}

/** The tree paired with itself: every node is both sides of its pair. */
export function pairsOfTree(entries: Map<string, NodeEntry>): Map<NodeEntry, Pair> {
  const pairs = new Map<NodeEntry, Pair>();
  for (const entry of entries.values()) {
    const parent = entry.parent ? pairs.get(entry.parent)! : null;
    const pair: Pair = { base: entry, revision: entry, parent, children: [], occurrence: 1 };
    parent?.children.push(pair);
    pairs.set(entry, pair);
  }
  return pairs;
}

export function referencesOfTree(
  entries: Map<string, NodeEntry>,
  edges: Array<[from: string, to: string]>
): Reference[] {
  return edges.map(([from, to]) => ({ from: entries.get(from)!, to: entries.get(to)! }));
}

/** The usage directions of a tree paired with itself, for tests that only vary the edges. */
export function usageOfTree(
  entries: Map<string, NodeEntry>,
  edges: Array<[from: string, to: string]>,
  spec: DiffSpec
) {
  return usageDirections(referencesOfTree(entries, edges), pairsOfTree(entries), spec);
}
