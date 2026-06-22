import type { DependencyGraph, GraphEdge } from './types.js';

export function collectConnectedIds(
  seeds: string[],
  edges: GraphEdge[],
  { reverse = false }: { reverse?: boolean } = {}
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const from = reverse ? edge.to : edge.from;
    const to = reverse ? edge.from : edge.to;
    const neighbours = adjacency.get(from) ?? [];
    neighbours.push(to);
    adjacency.set(from, neighbours);
  }

  const seen = new Set(seeds);
  const queue = [...seen];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export function filterAffected(graph: DependencyGraph, changedIds: string[]): DependencyGraph {
  const affected = collectConnectedIds(changedIds, graph.edges, { reverse: true });
  return {
    roots: graph.roots.filter((root) => affected.has(root)),
    nodes: graph.nodes.filter((node) => affected.has(node.id)),
    edges: graph.edges.filter((edge) => affected.has(edge.from) && affected.has(edge.to)),
  };
}
