import type { SpecVersion } from '../oas-types.js';
import { isAbsoluteUrl, isRef, type Location } from '../ref-utils.js';
import {
  resolveDocument,
  type BaseResolver,
  type Document,
  type ResolvedRefMap,
} from '../resolve.js';
import type { NormalizedNodeType } from '../types/index.js';
import { normalizeVisitors, type Oas3Visitor } from '../visitors.js';
import { walkDocument, type UserContext, type WalkContext } from '../walk.js';
import { COMPONENT_SECTIONS } from './build-index.js';
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

export type CollectedOperation = {
  id: string;
  method: string;
  containerKey: string;
  isWebhook: boolean;
  tags: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  location: Location;
  pathItemLocation: Location;
};

export type CollectedComponent = {
  section: string;
  name: string;
  description?: string;
  location: Location;
};

export type ApiIndexMeta = {
  info?: { title?: string; description?: string; location: Location };
  servers?: { urls: string[]; location: Location };
  declaredTags: { name: string; description?: string; location: Location }[];
  operations: CollectedOperation[];
  components: CollectedComponent[];
  pathsLocation?: Location;
  webhooksLocation?: Location;
  componentsLocation?: Location;
};

export type ApiAnalysis = {
  graph: DependencyGraph;
  meta: ApiIndexMeta;
  resolvedRefMap: ResolvedRefMap;
  rootDocument: Document;
};

export async function buildApiGraph(options: {
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  externalRefResolver: BaseResolver;
  cwd: string;
  resolveRef: (base: string, uri: string) => string;
}): Promise<DependencyGraph> {
  const { graph } = await analyzeApi(options);
  return graph;
}

export async function analyzeApi(options: {
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  externalRefResolver: BaseResolver;
  cwd: string;
  resolveRef: (base: string, uri: string) => string;
}): Promise<ApiAnalysis> {
  const { rootDocument, specVersion, types, externalRefResolver, cwd, resolveRef } = options;

  const resolvedRefMap = await resolveDocument({
    rootDocument,
    rootType: types.Root,
    externalRefResolver,
  });

  const ctx: WalkContext = { problems: [], specVersion, visitorsData: {} };

  const { graph, meta } = walkStructure({
    document: rootDocument,
    types,
    resolvedRefMap,
    ctx,
    cwd,
    resolveRef,
  });

  return { graph, meta, resolvedRefMap, rootDocument };
}

export function walkStructure(options: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  resolvedRefMap: ResolvedRefMap;
  ctx: WalkContext;
  cwd: string;
  resolveRef: (base: string, uri: string) => string;
}): { graph: DependencyGraph; meta: ApiIndexMeta } {
  const { document, types, resolvedRefMap, ctx, cwd, resolveRef } = options;

  const rootAbs = document.source.absoluteRef;
  const rootId = toNodeId(rootAbs, cwd);

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const meta: ApiIndexMeta = { declaredTags: [], operations: [], components: [] };

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

  // Remembers the spine operation whose subtree is currently being walked, plus the absolute
  // ref of the file that operation is defined in. Inside that same file — including the
  // operation's own callbacks, whose nested PathItem/Operation never overwrite this tracking,
  // same identity rule as above — a $ref's owner site collapses to a bare FILE node by
  // `mapForeignLocation` (it has no `components/...`-shaped pointer of its own); redirecting
  // that owner to the operation instead matches the old bundled walk, where the same ref's
  // owner was the operation. Once a ref has hopped into a *different* file (e.g. a component
  // schema referencing another schema), the site's absoluteRef no longer matches
  // `currentOperationFileAbs`, so it correctly keeps the current file-owner behavior.
  let currentOperationNode: unknown;
  let currentOperationNodeId: string | undefined;
  let currentOperationFileAbs: string | undefined;

  let currentWebhookPathItemNode: unknown;
  let currentWebhookKey: string | undefined;
  let currentWebhookPathItemLocation: Location | undefined;

  const collectNamed =
    (section: string) =>
    (node: Record<string, unknown>, collectorCtx: Pick<UserContext, 'location' | 'resolve'>) => {
      for (const name of Object.keys(node)) {
        const value = node[name];
        const target = isRef(value)
          ? collectorCtx.resolve(value)
          : { node: value, location: collectorCtx.location.child([name]) };
        if (!target.location) continue;
        // Resolved nodes are untyped JSON, so narrowing to the one field we read is safe.
        const description = (target.node as { description?: string } | undefined)?.description;
        meta.components.push({ section, name, description, location: target.location });
      }
    };

  // Each section's visitor is its Named* node type: schemas → NamedSchemas, and so on.
  const namedComponentVisitors = Object.fromEntries(
    COMPONENT_SECTIONS.map((section) => [
      `Named${section[0].toUpperCase()}${section.slice(1)}`,
      collectNamed(section),
    ])
  );

  // The dynamically built Named* keys can't be inferred as visitor members,
  // so the assembled object needs an explicit Oas3Visitor assertion.
  const visitor = {
    ...namedComponentVisitors,
    Info(node, vctx) {
      meta.info = { title: node.title, description: node.description, location: vctx.location };
    },
    // Oas3Visitor has no dedicated ServerList entry, so node falls back to the visitor
    // type's untyped catch-all — annotate it explicitly to avoid implicit `any` below.
    ServerList(node: { url?: string }[], vctx) {
      meta.servers = {
        urls: node.map((server) => server.url).filter((url): url is string => Boolean(url)),
        location: vctx.location,
      };
    },
    Tag(node, vctx) {
      meta.declaredTags.push({
        name: node.name,
        description: node.description,
        location: vctx.location,
      });
    },
    Paths: {
      enter(_node, vctx) {
        meta.pathsLocation ??= vctx.location;
      },
    },
    WebhooksMap: {
      enter(_node, vctx) {
        meta.webhooksLocation ??= vctx.location;
      },
    },
    Components: {
      enter(_node, vctx) {
        meta.componentsLocation ??= vctx.location;
      },
    },
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
        if (segments.length === 2 && segments[0] === 'webhooks') {
          currentWebhookPathItemNode = node;
          currentWebhookKey = segments[1];
          currentWebhookPathItemLocation = vctx.location;
        }
      },
    },
    Operation: {
      enter(node, vctx) {
        if (
          currentWebhookPathItemNode !== undefined &&
          vctx.parent === currentWebhookPathItemNode
        ) {
          const method = String(vctx.key);
          if (OPERATION_METHODS.has(method)) {
            meta.operations.push({
              id: `${method.toUpperCase()} ${currentWebhookKey}`,
              method: method.toUpperCase(),
              containerKey: currentWebhookKey!,
              isWebhook: true,
              tags: node.tags ?? [],
              summary: node.summary,
              description: node.description,
              operationId: node.operationId,
              deprecated: node.deprecated,
              location: vctx.location,
              pathItemLocation: currentWebhookPathItemLocation!,
            });
          }
          return;
        }
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

        currentOperationNode = node;
        currentOperationNodeId = operationNodeId;
        currentOperationFileAbs = vctx.location.source.absoluteRef;

        meta.operations.push({
          id: operationNodeId,
          method: method.toUpperCase(),
          containerKey: parsePointerSegments(currentPathItemRawLocation.pointer)[1],
          isWebhook: false,
          tags: node.tags ?? [],
          summary: node.summary,
          description: node.description,
          operationId: node.operationId,
          deprecated: node.deprecated,
          location: vctx.location,
          pathItemLocation: currentPathItemRawLocation,
        });
      },
      leave(node) {
        if (node === currentOperationNode) {
          currentOperationNode = undefined;
          currentOperationNodeId = undefined;
          currentOperationFileAbs = undefined;
        }
      },
    },
    ref: {
      enter(refNode, vctx, resolved) {
        const mappedOwner = mapToNode(vctx.location.source.absoluteRef, vctx.location.pointer);
        const ownerId =
          currentOperationNodeId !== undefined &&
          mappedOwner.kind === 'file' &&
          vctx.location.source.absoluteRef === currentOperationFileAbs
            ? currentOperationNodeId
            : nodeFor(vctx.location);
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
  } as Oas3Visitor;

  addOrUpdateNode({ id: rootId, kind: 'root', file: rootId }, true);
  nodes.get(rootId)!.root = true;

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'tree', visitor }],
    types
  );
  walkDocument({ document, rootType: types.Root, normalizedVisitors, resolvedRefMap, ctx });

  return { graph: finalizeGraph(rootId, nodes, edges), meta };
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
