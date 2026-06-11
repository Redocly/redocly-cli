import type { DependencyGraph } from './types.js';

/**
 * Returns the induced subgraph affected by changes to the given files:
 * the changed nodes plus every transitive dependent (reverse closure up to the roots).
 * `changedIds` must already be node ids of the graph (cwd-relative paths).
 */
export function filterAffected(graph: DependencyGraph, changedIds: string[]): DependencyGraph {
  const dependentsByTarget = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const dependents = dependentsByTarget.get(edge.to) ?? [];
    dependents.push(edge.from);
    dependentsByTarget.set(edge.to, dependents);
  }

  const affected = new Set(changedIds);
  const queue = [...affected];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of dependentsByTarget.get(current) ?? []) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return {
    roots: graph.roots.filter((root) => affected.has(root)),
    nodes: graph.nodes.filter((node) => affected.has(node.id)),
    edges: graph.edges.filter((edge) => affected.has(edge.from) && affected.has(edge.to)),
  };
}
