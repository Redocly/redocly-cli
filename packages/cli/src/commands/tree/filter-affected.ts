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

export function filterOperations(graph: DependencyGraph): DependencyGraph {
  // The API surface: paths, operations, and webhook entries. Webhook nodes carry the generic
  // `component` kind, so they are matched by their id instead.
  const kept = new Set(
    graph.nodes
      .filter(
        (node) =>
          node.kind === 'root' ||
          node.kind === 'path' ||
          node.kind === 'operation' ||
          node.id.startsWith('webhooks/')
      )
      .map((node) => node.id)
  );

  return {
    roots: graph.roots,
    nodes: graph.nodes.filter((node) => kept.has(node.id)),
    edges: graph.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to)),
  };
}

export function limitGraphLevel(graph: DependencyGraph, maxLevel: number): DependencyGraph {
  const children = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = children.get(edge.from) ?? [];
    list.push(edge.to);
    children.set(edge.from, list);
  }

  // BFS from the roots: keep everything reachable in at most `maxLevel` steps.
  const kept = new Set(graph.roots);
  let frontier = graph.roots;
  for (let level = 0; level < maxLevel; level++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const child of children.get(id) ?? []) {
        if (!kept.has(child)) {
          kept.add(child);
          next.push(child);
        }
      }
    }
    frontier = next;
  }

  return {
    roots: graph.roots,
    nodes: graph.nodes.filter((node) => kept.has(node.id)),
    edges: graph.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to)),
  };
}

export function filterAffected(graph: DependencyGraph, changedIds: string[]): DependencyGraph {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const affected = collectConnectedIds(changedIds, graph.edges, { reverse: true });

  const containerSeeds = changedIds.filter((id) => {
    const node = nodesById.get(id);
    return (
      node?.root || node?.kind === 'root' || node?.kind === 'path' || node?.kind === 'operation'
    );
  });
  for (const id of collectConnectedIds(containerSeeds, graph.edges, { reverse: false })) {
    affected.add(id);
  }

  return {
    roots: graph.roots.filter((root) => affected.has(root)),
    nodes: graph.nodes.filter((node) => affected.has(node.id)),
    edges: graph.edges.filter((edge) => affected.has(edge.from) && affected.has(edge.to)),
  };
}
