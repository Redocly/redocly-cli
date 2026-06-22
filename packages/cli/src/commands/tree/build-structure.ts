import {
  bundleDocument,
  getTypes,
  isAbsoluteUrl,
  normalizeVisitors,
  resolveDocument,
  walkDocument,
  type BaseResolver,
  type Config,
  type Document,
  type Location,
  type NormalizedNodeType,
  type Oas3Visitor,
  type ResolvedRefMap,
  type SpecVersion,
  type WalkContext,
} from '@redocly/openapi-core';

import { collectConnectedIds } from './filter-affected.js';
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

export async function buildStructureGraph(options: {
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  config: Config;
  externalRefResolver: BaseResolver;
  cwd: string;
}): Promise<DependencyGraph> {
  const { rootDocument, specVersion, types, config, externalRefResolver, cwd } = options;

  const { bundle } = await bundleDocument({
    document: rootDocument,
    config,
    types: getTypes(specVersion),
    externalRefResolver,
  });

  const resolvedRefMap = await resolveDocument({
    rootDocument: bundle,
    rootType: types.Root,
    externalRefResolver,
  });

  const ctx: WalkContext = { problems: [], specVersion, config, visitorsData: {} };

  return walkStructure({
    document: bundle,
    types,
    resolvedRefMap,
    ctx,
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });
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
      addOrUpdateNode({ id: ancestorId, kind: 'path', file: rootId }, true);
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
