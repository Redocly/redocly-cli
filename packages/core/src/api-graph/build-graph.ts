import type { SpecVersion } from '../oas-types.js';
import { isAbsoluteUrl, type Location } from '../ref-utils.js';
import {
  resolveDocument,
  type BaseResolver,
  type Document,
  type ResolvedRefMap,
} from '../resolve.js';
import type { NormalizedNodeType } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
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

export type ApiAnalysis = {
  graph: DependencyGraph;
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

  const graph = walkStructure({
    document: rootDocument,
    types,
    resolvedRefMap,
    ctx,
    cwd,
    resolveRef,
  });

  return { graph };
}

function walkStructure(options: {
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

        currentOperationNode = node;
        currentOperationNodeId = operationNodeId;
        currentOperationFileAbs = vctx.location.source.absoluteRef;
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
