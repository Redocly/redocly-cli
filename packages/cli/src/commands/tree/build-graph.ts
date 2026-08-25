import { isAbsoluteUrl, type Document, type ResolvedRefMap } from '@redocly/openapi-core';

import { compareStrings, toNodeId } from './node-id.js';
import type { DependencyGraph, GraphEdge, GraphNode } from './types.js';

export function buildGraph(
  resolutions: Array<{ rootDocument: Document; refMap: ResolvedRefMap }>,
  options: { base: string; resolveRef: (base: string, uri: string) => string }
): DependencyGraph {
  const { base, resolveRef } = options;
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const upsertNode = (id: string, resolved: boolean, root?: boolean) => {
    const node = nodes.get(id) ?? { id, resolved: false };
    if (resolved) node.resolved = true;
    if (root) node.root = true;
    if (isAbsoluteUrl(id)) node.external = true;
    nodes.set(id, node);
  };

  for (const { rootDocument, refMap } of resolutions) {
    upsertNode(toNodeId(rootDocument.source.absoluteRef, base), true, true);

    for (const [refId, resolvedRef] of refMap) {
      if (!resolvedRef.isRemote) continue;

      const separatorIndex = refId.indexOf('::');
      const sourceAbsolute = refId.slice(0, separatorIndex);
      const refString = refId.slice(separatorIndex + 2);
      const targetAbsolute =
        resolvedRef.document?.source.absoluteRef ??
        resolveRef(sourceAbsolute, refString.split('#')[0]);

      const from = toNodeId(sourceAbsolute, base);
      const to = toNodeId(targetAbsolute, base);
      upsertNode(from, true);
      upsertNode(to, resolvedRef.document !== undefined);

      const edgeKey = `${from} -> ${to}`;
      const edge = edges.get(edgeKey) ?? { from, to, refs: [] };
      if (!edge.refs.includes(refString)) {
        edge.refs.push(refString);
      }
      edges.set(edgeKey, edge);
    }
  }

  return {
    roots: resolutions.map(({ rootDocument }) => toNodeId(rootDocument.source.absoluteRef, base)),
    nodes: [...nodes.values()].sort((a, b) => compareStrings(a.id, b.id)),
    edges: [...edges.values()]
      .map((edge) => ({ ...edge, refs: [...edge.refs].sort(compareStrings) }))
      .sort((a, b) => compareStrings(a.from, b.from) || compareStrings(a.to, b.to)),
  };
}
