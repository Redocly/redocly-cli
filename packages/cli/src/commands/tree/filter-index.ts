import type { ApiIndex, ApiIndexNode } from '@redocly/openapi-core';

// Index ids and graph ids share the same semantic space (split component aliases keep their
// `section/Name` ids in the graph), so pruning is pure id-matching.
export function filterIndexByIds(index: ApiIndex, keepIds: Set<string>): ApiIndex {
  return { ...index, structure: keepNodes(index.structure, keepIds) };
}

function keepNodes(nodes: ApiIndexNode[], keepIds: Set<string>): ApiIndexNode[] {
  const kept: ApiIndexNode[] = [];
  for (const node of nodes) {
    const keptChildren = node.nodes ? keepNodes(node.nodes, keepIds) : [];
    if (keepIds.has(node.id) && keptChildren.length === 0) {
      kept.push(node.nodes ? { ...node, nodes: undefined } : node);
    } else if (keepIds.has(node.id) || keptChildren.length > 0) {
      kept.push({ ...node, nodes: keptChildren });
    }
  }
  return kept;
}

export function limitIndexLevel(index: ApiIndex, level: number): ApiIndex {
  return { ...index, structure: pruneBelow(index.structure, level, 1) };
}

function pruneBelow(nodes: ApiIndexNode[], maxLevel: number, depth: number): ApiIndexNode[] {
  return nodes.map((node) => {
    if (!node.nodes) return node;
    if (depth >= maxLevel) {
      const { nodes: _dropped, ...rest } = node;
      return rest;
    }
    return { ...node, nodes: pruneBelow(node.nodes, maxLevel, depth + 1) };
  });
}

export function filterIndexSections(index: ApiIndex, sectionIds: string[]): ApiIndex {
  return {
    ...index,
    structure: index.structure.filter((section) => sectionIds.includes(section.id)),
  };
}
