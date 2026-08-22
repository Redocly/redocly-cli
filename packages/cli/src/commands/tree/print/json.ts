import type { DependencyGraph } from '../types.js';

export function renderJson(graph: DependencyGraph): string {
  const data = {
    nodes: graph.nodes,
    links: graph.edges.map(({ from, to, refs }) => ({ source: from, target: to, refs })),
  };
  return JSON.stringify(data, null, 2);
}
