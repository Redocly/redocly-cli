import type { NodeEntry } from '../../node-map/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';

const source = new Source('tree.yaml', '');

/**
 * Builds a lookup over a spelled-out node tree for tests that need real node types rather
 * than bare keys. Each line is `key typeName`, optionally followed by `name=value`
 * properties; a node's parent is the closest preceding line whose key is a prefix of it —
 * which is what `collectNodeMap` records when it walks a document.
 */
export function treeOf(nodes: string): Map<string, NodeEntry> {
  const entries = new Map<string, NodeEntry>();
  const keys: string[] = [];

  for (const line of nodes.trim().split('\n')) {
    const [key, typeName, ...assignments] = line.trim().split(/\s+/);
    const parentKey =
      [...keys].reverse().find((candidate) => key.startsWith(`${candidate}/`)) ?? null;
    keys.push(key);
    entries.set(key, {
      key,
      parentKey,
      location: new Location(source, key),
      typeName,
      properties: Object.fromEntries(assignments.map((pair) => pair.split('='))),
      raw: {},
    });
  }

  return entries;
}
