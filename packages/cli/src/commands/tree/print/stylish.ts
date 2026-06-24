import { compareStrings } from '../node-id.js';
import type { DependencyGraph } from '../types.js';

export type StylishOptions = {
  summary?: string;
  emptyMessage?: string;
};

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
    children.sort(compareStrings);
  }

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const lines: string[] = [];

  const label = (id: string, parentId: string | undefined, isCycle: boolean): string => {
    const node = nodesById.get(id);
    let text = id;
    // An operation id is "<METHOD> <path>"; under its own path, show just the method.
    if (node?.kind === 'operation' && parentId && id.endsWith(` ${parentId}`)) {
      text = id.slice(0, -parentId.length - 1);
    }
    if (node?.external) text += ' (external)';
    if (node && !node.resolved) text += ' ✗ not found';
    if (isCycle) text += ' ↺';
    return text;
  };

  // `ancestors` is the path from the root to the current node. A child already on that path is a
  // cycle: mark it with `↺` and stop. A child printed elsewhere (fan-in) is shown once, unmarked,
  // and not expanded again.
  const renderSubtree = (
    id: string,
    prefix: string,
    printed: Set<string>,
    ancestors: Set<string>
  ) => {
    const children = childrenByNode.get(id) ?? [];
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const isCycle = ancestors.has(child);
      lines.push(`${prefix}${isLast ? '└── ' : '├── '}${label(child, id, isCycle)}`);
      if (!isCycle && !printed.has(child)) {
        printed.add(child);
        renderSubtree(
          child,
          `${prefix}${isLast ? '    ' : '│   '}`,
          printed,
          new Set([...ancestors, child])
        );
      }
    });
  };

  graph.roots.forEach((root, index) => {
    if (index > 0) lines.push('');
    lines.push(label(root, undefined, false));
    renderSubtree(root, '', new Set([root]), new Set([root]));
  });

  if (options.summary !== undefined) {
    lines.push('');
    lines.push(options.summary);
  }

  return lines.join('\n');
}
