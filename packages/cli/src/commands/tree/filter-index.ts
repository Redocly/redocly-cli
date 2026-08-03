import { COMPONENT_SECTIONS, type ApiIndex, type ApiIndexNode } from '@redocly/openapi-core';

const COMPONENT_LEAF_PREFIXES = COMPONENT_SECTIONS.map((section) => `${section}/`);

// A split component's graph id is the file that defines it (e.g. `components/schemas/Order.yaml`),
// while its index id is semantic (`schemas/Order`) — so a component leaf is also kept when its
// `file` is in the keep set. An inline component's `file` is the root document itself, so that
// fallback must exclude `docName`: otherwise every inline component would be kept as soon as the
// root document is affected, which is true for almost any match. Inline components fall back to
// pure id-matching instead, which the graph already supports for them. Operations always use pure
// id-matching: an unrelated operation that happens to live in the same file as a kept one must
// still be dropped.
function isComponentLeaf(node: ApiIndexNode): boolean {
  return COMPONENT_LEAF_PREFIXES.some((prefix) => node.id.startsWith(prefix));
}

function isKept(node: ApiIndexNode, keepIds: Set<string>, docName: string): boolean {
  return (
    keepIds.has(node.id) ||
    (isComponentLeaf(node) &&
      node.file !== undefined &&
      node.file !== docName &&
      keepIds.has(node.file))
  );
}

export function filterIndexByIds(index: ApiIndex, keepIds: Set<string>): ApiIndex {
  return { ...index, structure: keepNodes(index.structure, keepIds, index.docName) };
}

function keepNodes(nodes: ApiIndexNode[], keepIds: Set<string>, docName: string): ApiIndexNode[] {
  const kept: ApiIndexNode[] = [];
  for (const node of nodes) {
    const keptChildren = node.nodes ? keepNodes(node.nodes, keepIds, docName) : [];
    if (isKept(node, keepIds, docName) && keptChildren.length === 0) {
      kept.push(node.nodes ? { ...node, nodes: undefined } : node);
    } else if (isKept(node, keepIds, docName) || keptChildren.length > 0) {
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
