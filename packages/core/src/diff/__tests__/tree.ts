import type { NodeEntry, Reference } from '../../node-tree/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { directionsOf } from '../direction.js';
import type { DiffNode, Directions } from '../types.js';

const source = new Source('tree.yaml', '');

/**
 * Builds nodes from a spelled-out tree for tests that need real node types rather than a
 * document. Each line is `key Type`, optionally followed by `name=value` fields; a node's
 * parent is the closest preceding line whose key is a prefix of it — which is what
 * `buildNodeTree` records when it walks a document.
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

/** The tree compared with itself: every entry is both sides of its node. */
export function diffNodesOfTree(entries: Map<string, NodeEntry>): Map<NodeEntry, DiffNode> {
  const diffNodes = new Map<NodeEntry, DiffNode>();
  for (const entry of entries.values()) {
    const parent = entry.parent ? diffNodes.get(entry.parent)! : null;
    const node: DiffNode = {
      base: entry,
      revision: entry,
      parent,
      children: [],
      key: entry.location.pointer,
    };
    parent?.children.push(node);
    diffNodes.set(entry, node);
  }
  return diffNodes;
}

export function referencesOfTree(
  entries: Map<string, NodeEntry>,
  edges: Array<[from: string, to: string]>
): Reference[] {
  return edges.map(([from, to]) => ({ from: entries.get(from)!, to: entries.get(to)! }));
}

/** The directions of a tree compared with itself, for tests that only vary the references. */
export function directionsOfTree(
  entries: Map<string, NodeEntry>,
  edges: Array<[from: string, to: string]>,
  directions: Directions
) {
  return directionsOf(referencesOfTree(entries, edges), diffNodesOfTree(entries), directions);
}
