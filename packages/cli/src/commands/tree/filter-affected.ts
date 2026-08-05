import { collectConnectedIds } from '@redocly/openapi-core';

import type { DependencyGraph } from './types.js';

export { collectConnectedIds };

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
