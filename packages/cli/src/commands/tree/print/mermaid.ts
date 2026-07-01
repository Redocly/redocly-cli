import type { DependencyGraph } from '../types.js';

export function renderMermaid(graph: DependencyGraph): string {
  const mermaidIds = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  // Escape `#` first: it starts Mermaid HTML-entity codes (e.g. `#quot;`), so a literal `#`
  // in an id (foreign-component ids look like `file.yaml#/components/...`) must become `#35;`.
  const escapeLabel = (label: string) => label.replace(/#/g, '#35;').replace(/"/g, '#quot;');
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
