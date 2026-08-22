import type { NodeEntry } from '../types.js';

/** Looks a node up on either side; ancestors of a removed node only exist in the base. */
export type NodeLookup = (pointer: string) => NodeEntry | undefined;

/** The node's ancestors and itself, root first, as far as the maps can resolve them. */
export function ancestorChain(pointer: string, lookup: NodeLookup): NodeEntry[] {
  const chain: NodeEntry[] = [];
  const seen = new Set<string>();

  for (let current: string | null = pointer; current && !seen.has(current); ) {
    seen.add(current);
    const entry = lookup(current);
    if (!entry) break;
    chain.unshift(entry);
    current = entry.parentPointer;
  }

  return chain;
}
