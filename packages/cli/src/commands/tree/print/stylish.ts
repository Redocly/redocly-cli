import { compareStrings } from '../node-id.js';
import type { DependencyGraph } from '../types.js';

export type StylishOptions = {
  summary?: string;
  emptyMessage?: string;
  /** Deepest visible level; branches cut at this level end with `…`. Root is level 0. */
  maxLevel?: number;
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
    if (node?.external) text += ' 🔗';
    if (node && !node.resolved) text += ' ❌';
    if (isCycle) text += ' 🔁';
    return text;
  };

  // `ancestors` is the path from the root to the current node. A child already on that path is a
  // cycle: mark it with `🔁` and stop, so traversal terminates. A fan-in dependency (the same file
  // reached from several parents, without forming a cycle) is expanded under each parent.
  // `level` is the child's distance from the root; at `maxLevel` the branch is cut with `…`.
  const renderSubtree = (id: string, prefix: string, ancestors: Set<string>, level: number) => {
    const children = childrenByNode.get(id) ?? [];
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const isCycle = ancestors.has(child);
      const atLimit = options.maxLevel !== undefined && level >= options.maxLevel;
      const hasHiddenChildren = atLimit && !isCycle && (childrenByNode.get(child)?.length ?? 0) > 0;
      lines.push(
        `${prefix}${isLast ? '└── ' : '├── '}${label(child, id, isCycle)}${hasHiddenChildren ? ' …' : ''}`
      );
      if (!isCycle && !atLimit) {
        renderSubtree(
          child,
          `${prefix}${isLast ? '    ' : '│   '}`,
          new Set([...ancestors, child]),
          level + 1
        );
      }
    });
  };

  graph.roots.forEach((root, index) => {
    if (index > 0) lines.push('');
    lines.push(label(root, undefined, false));
    renderSubtree(root, '', new Set([root]), 1);
  });

  if (options.summary !== undefined) {
    lines.push('');
    lines.push(options.summary);
  }

  return lines.join('\n');
}
