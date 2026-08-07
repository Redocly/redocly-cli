import type { NodeEntry } from '../types.js';

/**
 * Builds a lookup over a spelled-out node tree for tests that need real node
 * types rather than bare pointers. Each line is `pointer typeName`, and a node's
 * parent is the closest preceding line whose pointer is a prefix of it — which is
 * what `collect` records when it walks a document.
 */
export function treeOf(nodes: string): Map<string, NodeEntry> {
  const entries = new Map<string, NodeEntry>();
  const pointers: string[] = [];

  for (const line of nodes.trim().split('\n')) {
    const [pointer, typeName] = line.trim().split(/\s+/);
    const parentPointer =
      [...pointers].reverse().find((candidate) => pointer.startsWith(`${candidate}/`)) ?? null;
    pointers.push(pointer);
    entries.set(pointer, {
      pointer,
      realPointer: pointer,
      parentPointer,
      keyInParent: pointer.slice(pointer.lastIndexOf('/') + 1),
      typeName,
      scalars: {},
      refs: {},
      raw: {},
    });
  }

  return entries;
}
