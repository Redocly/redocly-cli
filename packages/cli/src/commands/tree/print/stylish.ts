import { byString } from '../node-id.js';
import type { DependencyGraph } from '../types.js';

export type StylishOptions = {
  /** Node ids queried via --affected-by that exist in the graph. */
  changed?: string[];
  /** Pre-composed summary line; appended after a blank line when set. */
  summary?: string;
  /** Message returned for an empty graph. */
  emptyMessage?: string;
};

/**
 * Renders one ASCII tree per root. A node already expanded in the current tree
 * is printed with `↺` and not expanded again (handles cycles and fan-in).
 */
export function renderStylish(graph: DependencyGraph, options: StylishOptions = {}): string {
  if (graph.nodes.length === 0) {
    return options.emptyMessage ?? 'No files affected.';
  }

  const childrenByNode = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const children = childrenByNode.get(edge.from) ?? [];
    children.push(edge.to);
    childrenByNode.set(edge.from, children);
  }
  for (const children of childrenByNode.values()) {
    children.sort(byString);
  }

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const changed = new Set(options.changed ?? []);
  const lines: string[] = [];

  /** Formats one node line: id plus external/broken/repeat/changed markers. */
  const label = (id: string, isRepeat: boolean): string => {
    const node = nodesById.get(id);
    let text = id;
    if (node?.external) text += ' (external)';
    if (node && !node.resolved) text += ' ✗ not found';
    if (isRepeat) text += ' ↺';
    if (changed.has(id)) text += ' ← changed';
    return text;
  };

  /** Recursively prints the children of a node with tree connectors. */
  const renderSubtree = (id: string, prefix: string, printed: Set<string>) => {
    const children = childrenByNode.get(id) ?? [];
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const isRepeat = printed.has(child);
      lines.push(`${prefix}${isLast ? '└── ' : '├── '}${label(child, isRepeat)}`);
      if (!isRepeat) {
        printed.add(child);
        renderSubtree(child, `${prefix}${isLast ? '    ' : '│   '}`, printed);
      }
    });
  };

  graph.roots.forEach((root, index) => {
    if (index > 0) lines.push('');
    lines.push(label(root, false));
    renderSubtree(root, '', new Set([root]));
  });

  if (options.summary !== undefined) {
    lines.push('');
    lines.push(options.summary);
  }

  return lines.join('\n');
}
