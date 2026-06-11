import { isAbsoluteUrl, slash, type Document, type ResolvedRefMap } from '@redocly/openapi-core';
import * as path from 'node:path';

import type { DependencyGraph, GraphEdge, GraphNode } from './types.js';

/** Converts an absolute file path or URL into a stable node id (cwd-relative posix path; URLs as-is). */
function toNodeId(absoluteRef: string, cwd: string): string {
  return isAbsoluteUrl(absoluteRef) ? absoluteRef : slash(path.relative(cwd, absoluteRef));
}

/**
 * Builds the file-level dependency graph from the resolver's ref maps of one or more roots.
 * Only cross-file refs (isRemote) become edges; nodes/edges/refs are sorted for stable output.
 */
export function buildGraph(
  resolutions: Array<{ rootDocument: Document; refMap: ResolvedRefMap }>,
  options: { cwd: string; resolveRef: (base: string, uri: string) => string }
): DependencyGraph {
  const { cwd, resolveRef } = options;
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  /** Merges-or-creates a node, OR-ing its resolved/root/external flags. */
  const upsertNode = (id: string, resolved: boolean, root?: boolean) => {
    const node = nodes.get(id) ?? { id, resolved: false };
    if (resolved) node.resolved = true;
    if (root) node.root = true;
    if (isAbsoluteUrl(id)) node.external = true;
    nodes.set(id, node);
  };

  for (const { rootDocument, refMap } of resolutions) {
    upsertNode(toNodeId(rootDocument.source.absoluteRef, cwd), true, true);

    for (const [refId, resolvedRef] of refMap) {
      if (!resolvedRef.isRemote) continue;

      const separatorIndex = refId.indexOf('::');
      const sourceAbsolute = refId.slice(0, separatorIndex);
      const refString = refId.slice(separatorIndex + 2);
      const targetAbsolute =
        resolvedRef.document?.source.absoluteRef ??
        resolveRef(sourceAbsolute, refString.split('#')[0]);

      const from = toNodeId(sourceAbsolute, cwd);
      const to = toNodeId(targetAbsolute, cwd);
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

  // Codepoint comparison (not localeCompare): deterministic across Node ICU builds → stable snapshots.
  const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

  return {
    roots: resolutions.map(({ rootDocument }) => toNodeId(rootDocument.source.absoluteRef, cwd)),
    nodes: [...nodes.values()].sort((a, b) => byString(a.id, b.id)),
    edges: [...edges.values()]
      .map((edge) => ({ ...edge, refs: [...edge.refs].sort() }))
      .sort((a, b) => byString(a.from, b.from) || byString(a.to, b.to)),
  };
}
