import type { DependencyGraph } from '../types.js';

/** Renders the dependency graph as a Mermaid flowchart definition. */
export function renderMermaid(graph: DependencyGraph): string {
  const mermaidIds = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  const escapeLabel = (label: string) => label.replace(/"/g, '#quot;');
  const lines = ['flowchart LR'];

  for (const node of graph.nodes) {
    lines.push(
      `  ${mermaidIds.get(node.id)}["${escapeLabel(node.id)}"]${node.root ? ':::root' : ''}`
    );
  }
  for (const edge of graph.edges) {
    lines.push(`  ${mermaidIds.get(edge.from)} --> ${mermaidIds.get(edge.to)}`);
  }
  if (graph.nodes.some((node) => node.root)) {
    lines.push('  classDef root font-weight:bold');
  }

  return lines.join('\n');
}
