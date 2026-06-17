import {
  isAbsoluteUrl,
  normalizeVisitors,
  walkDocument,
  type Document,
  type Location,
  type NormalizedNodeType,
  type Oas3Visitor,
  type ResolvedRefMap,
  type WalkContext,
} from '@redocly/openapi-core';

import {
  byString,
  mapForeignLocation,
  mapRootPointer,
  OPERATION_METHODS,
  parsePointerSegments,
  toNodeId,
  type MappedNode,
} from './node-id.js';
import type { DependencyGraph, GraphEdge, GraphNode } from './types.js';

export function buildStructure(options: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  resolvedRefMap: ResolvedRefMap;
  ctx: WalkContext;
  cwd: string;
  resolveRef: (base: string, uri: string) => string;
}): DependencyGraph {
  const { document, types, resolvedRefMap, ctx, cwd, resolveRef } = options;

  const rootAbs = document.source.absoluteRef;
  const rootId = toNodeId(rootAbs, cwd);

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const upsertNode = (mapped: MappedNode & { file: string }, resolved: boolean) => {
    const node = nodes.get(mapped.id) ?? { id: mapped.id, resolved: false };
    if (resolved) node.resolved = true;
    if (isAbsoluteUrl(mapped.id)) node.external = true;
    node.kind = mapped.kind;
    node.file = mapped.file;
    nodes.set(mapped.id, node);
  };

  const addEdge = (from: string, to: string, refString?: string) => {
    const edgeKey = `${from} -> ${to}`;
    const edge = edges.get(edgeKey) ?? { from, to, refs: [] };
    if (refString !== undefined && !edge.refs.includes(refString)) {
      edge.refs.push(refString);
    }
    edges.set(edgeKey, edge);
  };

  const mapByFile = (absoluteRef: string, pointer: string): MappedNode & { file: string } =>
    absoluteRef === rootAbs
      ? { ...mapRootPointer(pointer, rootId), file: rootId }
      : mapForeignLocation(toNodeId(absoluteRef, cwd), pointer);

  const nodeFor = (location: Location): string => {
    const mapped = mapByFile(location.source.absoluteRef, location.pointer);
    upsertNode(mapped, true);
    wireSpine(mapped);
    return mapped.id;
  };

  const wireSpine = (mapped: MappedNode) => {
    if (mapped.ancestry === undefined) return;
    let previous = rootId;
    for (const ancestorId of mapped.ancestry) {
      upsertNode({ id: ancestorId, kind: 'path', file: rootId }, true);
      addEdge(previous, ancestorId);
      previous = ancestorId;
    }
    addEdge(previous, mapped.id);
  };

  // Unresolved `$ref`: derive the target id from the raw string — a same-file fragment, or a uri
  // resolved against the ref site's file.
  const unresolvedTargetId = (siteLocation: Location, refString: string): string => {
    const hashIndex = refString.indexOf('#');
    const uri = hashIndex === -1 ? refString : refString.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? undefined : refString.slice(hashIndex + 1);
    const siteFile = siteLocation.source.absoluteRef;

    let mapped: MappedNode & { file: string };
    if (uri === '') {
      mapped = mapByFile(siteFile, '#' + (fragment ?? '/'));
    } else {
      const fileId = toNodeId(resolveRef(siteFile, uri), cwd);
      mapped =
        fragment !== undefined
          ? mapForeignLocation(fileId, '#' + fragment)
          : { id: fileId, kind: 'file', file: fileId };
    }

    upsertNode(mapped, false);
    return mapped.id;
  };

  const visitor: Oas3Visitor = {
    PathItem: {
      enter(_node, vctx) {
        if (vctx.rawLocation.source.absoluteRef !== rootAbs) return;
        const segments = parsePointerSegments(vctx.rawLocation.pointer);
        if (segments.length === 2 && segments[0] === 'paths') {
          nodeFor(vctx.rawLocation);
        }
      },
    },
    Operation: {
      enter(_node, vctx) {
        if (vctx.rawLocation.source.absoluteRef !== rootAbs) return;
        const segments = parsePointerSegments(vctx.rawLocation.pointer);
        if (
          segments.length === 3 &&
          segments[0] === 'paths' &&
          OPERATION_METHODS.has(segments[2])
        ) {
          nodeFor(vctx.rawLocation);
        }
      },
    },
    ref: {
      enter(refNode, vctx, resolved) {
        const ownerId = nodeFor(vctx.location);
        const refString = String(refNode.$ref);
        const targetId = resolved.location
          ? nodeFor(resolved.location)
          : unresolvedTargetId(vctx.location, refString);
        addEdge(ownerId, targetId, refString);
      },
    },
  };

  upsertNode({ id: rootId, kind: 'root', file: rootId }, true);
  nodes.get(rootId)!.root = true;

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'tree', visitor }],
    types
  );
  walkDocument({ document, rootType: types.Root, normalizedVisitors, resolvedRefMap, ctx });

  return prune(rootId, nodes, edges);
}

/** Drops nodes unreachable from the root, then codepoint-sorts nodes/edges/refs for stable output. */
function prune(
  rootId: string,
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>
): DependencyGraph {
  const adjacency = new Map<string, string[]>();
  for (const { from, to } of edges.values()) {
    const targets = adjacency.get(from) ?? [];
    targets.push(to);
    adjacency.set(from, targets);
  }

  const reachable = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return {
    roots: [rootId],
    nodes: [...nodes.values()]
      .filter((node) => reachable.has(node.id))
      .sort((a, b) => byString(a.id, b.id)),
    edges: [...edges.values()]
      .filter((edge) => reachable.has(edge.from) && reachable.has(edge.to))
      .map((edge) => ({ ...edge, refs: [...edge.refs].sort(byString) }))
      .sort((a, b) => byString(a.from, b.from) || byString(a.to, b.to)),
  };
}
