import type { SpecVersion } from '../oas-types.js';
import { isAbsoluteUrl, type Location } from '../ref-utils.js';
import {
  resolveDocument,
  type BaseResolver,
  type Document,
  type ResolvedRefMap,
} from '../resolve.js';
import type { NormalizedNodeType } from '../types/index.js';
import { normalizeVisitors, type Oas3Visitor } from '../visitors.js';
import { walkDocument, type WalkContext } from '../walk.js';
import {
  compareStrings,
  mapForeignLocation,
  mapRootPointer,
  OPERATION_METHODS,
  parsePointerSegments,
  toNodeId,
  type MappedNode,
} from './node-id.js';
import type { DependencyGraph, GraphEdge, GraphNode } from './types.js';

export async function buildApiGraph(options: {
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  externalRefResolver: BaseResolver;
  cwd: string;
  resolveRef: (base: string, uri: string) => string;
}): Promise<DependencyGraph> {
  const { rootDocument, specVersion, types, externalRefResolver, cwd, resolveRef } = options;

  const resolvedRefMap = await resolveDocument({
    rootDocument,
    rootType: types.Root,
    externalRefResolver,
  });

  const ctx: WalkContext = { problems: [], specVersion, visitorsData: {} };

  return walkStructure({ document: rootDocument, types, resolvedRefMap, ctx, cwd, resolveRef });
}

export function walkStructure(options: {
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

  const addOrUpdateNode = (mapped: MappedNode & { file: string }, resolved: boolean) => {
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

  const mapToNode = (absoluteRef: string, pointer: string): MappedNode & { file: string } =>
    absoluteRef === rootAbs
      ? { ...mapRootPointer(pointer, rootId), file: rootId }
      : mapForeignLocation(toNodeId(absoluteRef, cwd), pointer);

  const nodeFor = (location: Location): string => {
    const mapped = mapToNode(location.source.absoluteRef, location.pointer);
    addOrUpdateNode(mapped, true);
    linkToRoot(mapped);
    return mapped.id;
  };

  const linkToRoot = (mapped: MappedNode) => {
    if (mapped.ancestry === undefined) return;
    let previous = rootId;
    for (const ancestorId of mapped.ancestry) {
      // Keep a file already stamped by a direct PathItem visit (e.g. a $ref'd path file);
      // rootId is only a fallback for an ancestor first created through this link.
      const ancestorFile = nodes.get(ancestorId)?.file ?? rootId;
      addOrUpdateNode({ id: ancestorId, kind: 'path', file: ancestorFile }, true);
      addEdge(previous, ancestorId);
      previous = ancestorId;
    }
    addEdge(previous, mapped.id);
  };

  const unresolvedTargetId = (siteLocation: Location, refString: string): string => {
    const [uri, fragment] = refString.split('#');
    const siteFile = siteLocation.source.absoluteRef;

    let mapped: MappedNode & { file: string };
    if (uri === '') {
      mapped = mapToNode(siteFile, '#' + (fragment ?? '/'));
    } else {
      const fileId = toNodeId(resolveRef(siteFile, uri), cwd);
      mapped =
        fragment !== undefined
          ? mapForeignLocation(fileId, '#' + fragment)
          : { id: fileId, kind: 'file', file: fileId };
    }

    addOrUpdateNode(mapped, false);
    return mapped.id;
  };

  // Remembers the top-level PathItem currently being walked, so a $ref'd path item's
  // operations (whose own rawLocation points into the foreign file, not the root) can still
  // be traced back to a root-relative pointer. Identity, not the pointer, decides ownership:
  // an Operation nested in a callback's own PathItem has a different `parent` object and is
  // correctly ignored even though tracking is never reset between sibling operations.
  let currentPathItemNode: unknown;
  let currentPathItemRawLocation: Location | undefined;

  const visitor: Oas3Visitor = {
    PathItem: {
      enter(node, vctx) {
        if (vctx.rawLocation.source.absoluteRef !== rootAbs) return;
        const segments = parsePointerSegments(vctx.rawLocation.pointer);
        if (segments.length === 2 && segments[0] === 'paths') {
          const spineNodeId = nodeFor(vctx.rawLocation);
          nodes.get(spineNodeId)!.file = toNodeId(vctx.location.source.absoluteRef, cwd);
          currentPathItemNode = node;
          currentPathItemRawLocation = vctx.rawLocation;
        }
      },
    },
    Operation: {
      enter(node, vctx) {
        if (currentPathItemRawLocation === undefined || vctx.parent !== currentPathItemNode) {
          return;
        }
        const method = String(vctx.key);
        if (!OPERATION_METHODS.has(method)) return;

        const operationNodeId = nodeFor(currentPathItemRawLocation.child([method]));
        if (typeof node.operationId === 'string') {
          nodes.get(operationNodeId)!.operationId = node.operationId;
        }
        nodes.get(operationNodeId)!.file = toNodeId(vctx.location.source.absoluteRef, cwd);
      },
    },
    ref: {
      enter(refNode, vctx, resolved) {
        const ownerId = nodeFor(vctx.location);
        const refString = String(refNode.$ref);
        // Mirrors NoUnresolvedRefs: `resolved.location` can be truthy (pointing at a fallback
        // location) even when the pointer path inside the target document doesn't exist, so
        // `node` is the only reliable signal that the $ref actually resolved to something.
        const targetId =
          resolved.node !== undefined && resolved.location
            ? nodeFor(resolved.location)
            : unresolvedTargetId(vctx.location, refString);
        addEdge(ownerId, targetId, refString);
      },
    },
  };

  addOrUpdateNode({ id: rootId, kind: 'root', file: rootId }, true);
  nodes.get(rootId)!.root = true;

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'tree', visitor }],
    types
  );
  walkDocument({ document, rootType: types.Root, normalizedVisitors, resolvedRefMap, ctx });

  return finalizeGraph(rootId, nodes, edges);
}

/** Keeps only nodes reachable from the root, sorted for stable output. */
function finalizeGraph(
  rootId: string,
  nodeMap: Map<string, GraphNode>,
  edgeMap: Map<string, GraphEdge>
): DependencyGraph {
  const connectedIds = collectConnectedIds([rootId], [...edgeMap.values()]);

  const nodes = [...nodeMap.values()]
    .filter((node) => connectedIds.has(node.id))
    .sort((a, b) => compareStrings(a.id, b.id));

  const edges = [...edgeMap.values()]
    .filter((edge) => connectedIds.has(edge.from) && connectedIds.has(edge.to))
    .map((edge) => ({ ...edge, refs: [...edge.refs].sort(compareStrings) }))
    .sort((a, b) => compareStrings(a.from, b.from) || compareStrings(a.to, b.to));

  return { roots: [rootId], nodes, edges };
}

export function collectConnectedIds(
  seeds: string[],
  edges: GraphEdge[],
  { reverse = false }: { reverse?: boolean } = {}
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const from = reverse ? edge.to : edge.from;
    const to = reverse ? edge.from : edge.to;
    const neighbours = adjacency.get(from) ?? [];
    neighbours.push(to);
    adjacency.set(from, neighbours);
  }

  const seen = new Set(seeds);
  const queue = [...seen];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}
