import type { NodeEntry } from './types.js';

/** Looks a node up on either side; ancestors of a removed node only exist in the base. */
export type NodeLookup = (key: string) => NodeEntry | undefined;

/** The node's ancestors and itself, root first, as far as the map can resolve them. */
export function ancestorChain(key: string, lookup: NodeLookup): NodeEntry[] {
  const chain: NodeEntry[] = [];
  const seen = new Set<string>();

  for (let current: string | null = key; current && !seen.has(current); ) {
    seen.add(current);
    const entry = lookup(current);
    if (!entry) break;
    chain.unshift(entry);
    current = entry.parentKey;
  }

  return chain;
}

/**
 * The key of the reusable component a node belongs to, or `undefined` when the node is
 * not inside one. Found structurally: the type tree marks the container as `Components`,
 * its children are the per-kind maps (`NamedSchemas`, …), and their children are the
 * components themselves.
 */
export function getComponentRoot(key: string, lookup: NodeLookup): string | undefined {
  const chain = ancestorChain(key, lookup);
  const componentsIndex = chain.findIndex((entry) => entry.typeName === 'Components');
  return componentsIndex === -1 ? undefined : chain[componentsIndex + 2]?.key;
}
