import type { SpecVersion } from '../oas-types.js';
import { isAbsoluteUrl, isRef, type Location } from '../ref-utils.js';
import {
  resolveDocument,
  type BaseResolver,
  type Document,
  type ResolvedRefMap,
} from '../resolve.js';
import type { NormalizedNodeType } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
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
  /** Each entry is one alternative: the schemes that must all be satisfied together, with scopes. */
  security?: Record<string, string[]>[];
  location: Location;
  pathItemLocation: Location;
};

/** What a security scheme asks the caller to send, flattened from its OpenAPI shape. */
export type CollectedSecurityScheme = {
  name: string;
  type?: string;
  in?: string;
  /** An `apiKey` scheme's own `name`: the header, query, or cookie the key goes in. */
  keyName?: string;
  /** An `http` scheme's `scheme`: `bearer`, `basic`, and so on. */
  scheme?: string;
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
  /** The root requirement, which every operation without one of its own inherits. */
  security?: { requirements: Record<string, string[]>[]; location: Location };
  securitySchemes: CollectedSecurityScheme[];
  operations: CollectedOperation[];
  components: CollectedComponent[];
  pathsLocation?: Location;
  webhooksLocation?: Location;
  componentsLocation?: Location;
};

/** A webhook operation has no graph node of its own; every method under a webhook shares one container node. */
export function graphNodeIdFor(operation: CollectedOperation): string {
  return operation.isWebhook ? `webhooks/${operation.containerKey}` : operation.id;
}

export type ApiAnalysis = {
  graph: DependencyGraph;
  meta: ApiIndexMeta;
  resolvedRefMap: ResolvedRefMap;
  rootDocument: Document;
};

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

function walkStructure(options: {
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
  const meta: ApiIndexMeta = {
    declaredTags: [],
    securitySchemes: [],
    operations: [],
    components: [],
  };

  // A split layout defines root components as whole-file refs (`Order: {$ref: Order.yaml}`).
  // Bundling used to inline those files under their component names; to keep the same canonical
  // ids without bundling, map each aliased file to its `section/Name` id up front, and remember
  // the alias entries themselves so they don't become self-edges.
  const { fileAliases, aliasEntryPointers } = collectRootComponentAliases(
    document.parsed,
    rootAbs,
    resolveRef
  );

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

  const mapToNode = (absoluteRef: string, pointer: string): MappedNode & { file: string } => {
    if (absoluteRef === rootAbs) {
      return { ...mapRootPointer(pointer, rootId), file: rootId };
    }
    const fileId = toNodeId(absoluteRef, cwd);
    const mapped = mapForeignLocation(fileId, pointer);
    const alias = fileAliases.get(absoluteRef);
    // Any location that falls back to the whole file collapses to the aliased component,
    // exactly as it did when the file was bundled under that name.
    if (alias !== undefined && mapped.kind === 'file') {
      return { id: alias, kind: 'component', file: fileId };
    }
    return mapped;
  };

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
      // Path items and operations can override servers; only the root list describes the API.
      if (vctx.rawLocation.pointer !== '#/servers') return;
      meta.servers = {
        urls: node.map((server) => server.url).filter((url): url is string => Boolean(url)),
        location: vctx.location,
      };
    },
    // Oas3Visitor types neither node, so both fall back to the untyped catch-all.
    SecurityRequirementList(node: Record<string, string[]>[], vctx) {
      // An operation carries its own list; only the root one describes the whole API.
      if (vctx.rawLocation.pointer !== '#/security') return;
      meta.security = { requirements: node, location: vctx.location };
    },
    SecurityScheme(node: CollectedSecurityScheme & { name?: string }, vctx) {
      const segments = parsePointerSegments(vctx.rawLocation.pointer);
      if (segments.length !== 3 || segments[1] !== 'securitySchemes') return;
      meta.securitySchemes.push({
        name: segments[2],
        type: node.type,
        in: node.in,
        keyName: node.name,
        scheme: node.scheme,
      });
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
              ...(node.security ? { security: node.security } : {}),
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
          ...(node.security ? { security: node.security } : {}),
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
        if (vctx.location.source.absoluteRef === rootAbs) {
          if (aliasEntryPointers.has(vctx.location.pointer)) return;
          // A root paths/webhooks entry that is a whole-file ref used to be inlined by the
          // bundler: the spine and its operations come from the PathItem visitor, so a resolved
          // entry adds no edge. An unresolved one still must surface as a broken file node.
          const segments = parsePointerSegments(vctx.location.pointer);
          if (
            segments.length === 2 &&
            (segments[0] === 'paths' || segments[0] === 'webhooks') &&
            resolved.node !== undefined &&
            resolved.location
          ) {
            return;
          }
        }
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

const OAS2_ALIAS_SECTIONS = ['definitions', 'parameters', 'responses', 'securityDefinitions'];

/** Finds root component entries that are plain whole-file refs and maps the file to the entry id. */
function collectRootComponentAliases(
  parsed: unknown,
  rootAbs: string,
  resolveRef: (base: string, uri: string) => string
): { fileAliases: Map<string, string>; aliasEntryPointers: Set<string> } {
  const fileAliases = new Map<string, string>();
  const aliasEntryPointers = new Set<string>();
  const root = parsed as Record<string, Record<string, Record<string, unknown>>> | undefined;

  const collectSection = (
    section: Record<string, unknown>,
    idPrefix: string,
    pointerPrefix: string
  ) => {
    for (const [name, value] of Object.entries(section)) {
      const refString = (value as { $ref?: unknown } | undefined)?.$ref;
      if (typeof refString !== 'string') continue;
      const [uri, fragment] = refString.split('#');
      // Only whole-file refs behave like bundle-time inlining; refs into a named section of
      // another file already map to a canonical foreign id on their own.
      if (uri === '' || (fragment !== undefined && fragment !== '/' && fragment !== '')) continue;
      fileAliases.set(resolveRef(rootAbs, uri), `${idPrefix}/${name}`);
      aliasEntryPointers.add(`${pointerPrefix}/${escapeAliasKey(name)}`);
    }
  };

  const components = root?.components;
  if (components !== undefined) {
    for (const [section, entries] of Object.entries(components)) {
      if (!isPlainObject(entries)) continue;
      collectSection(entries, section, `#/components/${escapeAliasKey(section)}`);
    }
  }
  for (const section of OAS2_ALIAS_SECTIONS) {
    const entries = root?.[section];
    if (!isPlainObject(entries)) continue;
    collectSection(entries, section, `#/${section}`);
  }

  return { fileAliases, aliasEntryPointers };
}

function escapeAliasKey(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
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

/**
 * BFS over reversed edges from `targetId`. For every node that (transitively) references the
 * target, returns the shortest reference chain ordered target-first:
 * `[targetId, …, referrerId]`.
 */
export function collectReversePathsTo(targetId: string, edges: GraphEdge[]): Map<string, string[]> {
  const referrersOf = new Map<string, string[]>();
  for (const edge of edges) {
    const referrers = referrersOf.get(edge.to) ?? [];
    referrers.push(edge.from);
    referrersOf.set(edge.to, referrers);
  }

  const parentTowardTarget = new Map<string, string>();
  const seen = new Set([targetId]);
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const referrer of referrersOf.get(current) ?? []) {
      if (seen.has(referrer)) continue;
      seen.add(referrer);
      parentTowardTarget.set(referrer, current);
      queue.push(referrer);
    }
  }

  const chains = new Map<string, string[]>();
  for (const nodeId of seen) {
    if (nodeId === targetId) continue;
    const chain = [nodeId];
    let cursor = nodeId;
    while (parentTowardTarget.has(cursor)) {
      cursor = parentTowardTarget.get(cursor)!;
      chain.push(cursor);
    }
    chains.set(nodeId, chain.reverse());
  }
  return chains;
}
