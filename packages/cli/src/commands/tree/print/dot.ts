import type { DependencyGraph } from '../types.js';

const quote = (value: string): string => `"${value.replace(/(["\\])/g, '\\$1')}"`;

/** Renders the graph as Graphviz DOT — consumable by Graphviz and most graph-drawing tools. */
export function renderDot(graph: DependencyGraph): string {
  const lines = ['digraph tree {'];
  for (const node of graph.nodes) {
    lines.push(`  ${quote(node.id)}${node.root ? ' [shape=box, style=bold]' : ''};`);
  }
  for (const edge of graph.edges) {
    lines.push(`  ${quote(edge.from)} -> ${quote(edge.to)};`);
  }
  lines.push('}');
  return lines.join('\n');
}
