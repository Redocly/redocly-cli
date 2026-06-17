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

/**
 * Builds the internal structure graph of one API description: root -> paths -> operations and the
 * component dependency chains reached through every `$ref`. The result is pruned to nodes reachable
 * from the root and sorted by codepoint so all three renderers agree byte-for-byte.
 */
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

  /**
   * Adds or updates a node. `resolved` is OR-ed; `kind`/`file` take the latest mapping —
   * distinct mappings of one id are expected to agree (a component literally named like a
   * sibling file path is the known, accepted exception: last writer in document order wins).
   */
  const upsertNode = (mapped: MappedNode & { file: string }, resolved: boolean) => {
    const node = nodes.get(mapped.id) ?? { id: mapped.id, resolved: false };
    if (resolved) node.resolved = true;
    if (isAbsoluteUrl(mapped.id)) node.external = true;
    node.kind = mapped.kind;
    node.file = mapped.file;
    nodes.set(mapped.id, node);
  };

  /** Adds (or extends) a directed edge, deduping by `from -> to` and collecting distinct refs. */
  const addEdge = (from: string, to: string, refString?: string) => {
    const edgeKey = `${from} -> ${to}`;
    const edge = edges.get(edgeKey) ?? { from, to, refs: [] };
    if (refString !== undefined && !edge.refs.includes(refString)) {
      edge.refs.push(refString);
    }
    edges.set(edgeKey, edge);
  };

  /**
   * Materializes the node for a resolved Location and, when the mapping carries an ancestry,
   * wires the structural spine `root -> ancestry[0] -> ... -> node` (spine edges carry no refs).
   * Returns the node id so callers can attach `$ref` edges to it.
   */
  const nodeFor = (location: Location): string => {
    const inRootFile = location.source.absoluteRef === rootAbs;
    const mapped: MappedNode & { file: string } = inRootFile
      ? { ...mapRootPointer(location.pointer, rootId), file: rootId }
      : mapForeignLocation(toNodeId(location.source.absoluteRef, cwd), location.pointer);

    upsertNode(mapped, true);
    wireSpine(mapped);
    return mapped.id;
  };

  /** Wires root -> ...ancestry -> node spine edges when the mapping requests a structural link. */
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

  /**
   * Derives the target id for an unresolved `$ref` from its raw string: a same-file fragment maps
   * through the root/foreign pointer mappers; a uri part resolves against the ref site's file.
   * The node is upserted as unresolved (and external for URLs).
   */
  const unresolvedTargetId = (siteLocation: Location, refString: string): string => {
    const hashIndex = refString.indexOf('#');
    const uri = hashIndex === -1 ? refString : refString.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? undefined : refString.slice(hashIndex + 1);
    const siteFile = siteLocation.source.absoluteRef;

    let mapped: MappedNode & { file: string };
    if (uri === '') {
      const pointer = '#' + (fragment ?? '/');
      mapped =
        siteFile === rootAbs
          ? { ...mapRootPointer(pointer, rootId), file: rootId }
          : mapForeignLocation(toNodeId(siteFile, cwd), pointer);
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

  // Keys absent from a non-OpenAPI type map (AsyncAPI/Arazzo) are silently ignored by
  // normalizeVisitors, so this OAS3-shaped visitor is safe to run against any detected spec.
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

/**
 * Drops nodes unreachable from the root via directed BFS over the edges, then codepoint-sorts the
 * nodes (id), edges (from, then to), and each edge's refs with the shared `byString` comparator.
 */
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
