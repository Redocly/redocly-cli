import type { NodeEntry } from './types.js';

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

/**
 * The pointer of the reusable component a node belongs to, or `undefined` when the
 * node is not inside one. Found structurally: the type tree marks the container as
 * `Components`, its children are the per-kind maps (`NamedSchemas`, …), and their
 * children are the components themselves.
 */
export function getComponentRoot(pointer: string, lookup: NodeLookup): string | undefined {
  const chain = ancestorChain(pointer, lookup);
  const componentsIndex = chain.findIndex((entry) => entry.typeName === 'Components');
  return componentsIndex === -1 ? undefined : chain[componentsIndex + 2]?.pointer;
}
