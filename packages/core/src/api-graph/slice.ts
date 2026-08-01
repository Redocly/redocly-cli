import { isRef } from '../ref-utils.js';
import type { Document } from '../resolve.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { ApiAnalysis } from './build-graph.js';
import { toRelativePath, type ApiIndex, type ApiIndexNode } from './build-index.js';
import type { NodeKind } from './types.js';

export type ApiNodeRef = {
  ref: string;
  resolved: boolean;
  file?: string;
  pointer?: string;
};

export type ApiNodeEnvelope = {
  id: string;
  pointer?: string;
  file: string;
  start_line: number;
  end_line: number;
  content: string;
  refs: ApiNodeRef[];
  deps?: ApiNodeEnvelope[];
  truncated?: boolean;
};

export type LocatedIndexNode = ApiIndexNode & {
  file: string;
  start_line: number;
  end_line: number;
};

export function hasIndexLocation(node: ApiIndexNode): node is LocatedIndexNode {
  return node.file !== undefined && node.start_line !== undefined && node.end_line !== undefined;
}

export function findIndexNode(
  structure: ApiIndexNode[],
  selector: string
): ApiIndexNode | undefined {
  for (const node of structure) {
    if (node.id === selector) return node;
    if (
      node.file !== undefined &&
      node.pointer !== undefined &&
      `${node.file}${node.pointer}` === selector
    ) {
      return node;
    }
    const found = node.nodes ? findIndexNode(node.nodes, selector) : undefined;
    if (found) return found;
  }
  return undefined;
}

export function buildNodeEnvelope(options: {
  indexNode: LocatedIndexNode;
  analysis: ApiAnalysis;
  cwd: string;
}): ApiNodeEnvelope {
  const { indexNode, analysis, cwd } = options;

  const document = documentsByFile(analysis, cwd).get(indexNode.file);
  if (!document) {
    throw new Error(`Source document for "${indexNode.file}" is not resolved.`);
  }

  const lines = document.source.body.split('\n');
  const content = lines.slice(indexNode.start_line - 1, indexNode.end_line).join('\n');

  const subtree =
    indexNode.pointer === undefined
      ? undefined
      : getNodeAtPointer(document.parsed, indexNode.pointer);
  const refs = [...collectRefStrings(subtree)].sort().map((ref): ApiNodeRef => {
    // Key format mirrors core's internal makeRefId: `${absoluteRef}::${$ref}`.
    const resolvedRef = analysis.resolvedRefMap.get(`${document.source.absoluteRef}::${ref}`);
    if (!resolvedRef?.resolved || resolvedRef.node === undefined) return { ref, resolved: false };
    return {
      ref,
      resolved: true,
      file: toRelativePath(resolvedRef.document.source.absoluteRef, cwd),
      pointer: resolvedRef.nodePointer.startsWith('#')
        ? resolvedRef.nodePointer
        : `#${resolvedRef.nodePointer}`,
    };
  });

  return {
    id: indexNode.id,
    ...(indexNode.pointer !== undefined ? { pointer: indexNode.pointer } : {}),
    file: indexNode.file,
    start_line: indexNode.start_line,
    end_line: indexNode.end_line,
    content,
    refs,
  };
}

// Nested by analysis, then cwd: the same analysis can be sliced against more than one cwd.
const documentsByFileCache = new WeakMap<ApiAnalysis, Map<string, Map<string, Document>>>();

export const DEPS_CONTENT_CAP_BYTES = 65536;

// Only these graph node kinds carry content of their own; a root/path node is pure structure.
const SEEDABLE_KINDS = new Set<NodeKind>(['operation', 'component', 'file']);

/**
 * Deps are meaningful only for content leaves — operations and components (or the file that
 * defines one). A grouping or structural node (a section, a tag group, a path spine node)
 * yields an empty closure by design: it has no content of its own to walk from.
 */
export function appendDepsClosure(options: {
  envelope: ApiNodeEnvelope;
  indexNode: LocatedIndexNode;
  analysis: ApiAnalysis;
  index: ApiIndex;
  cwd: string;
  capBytes?: number;
}): ApiNodeEnvelope {
  const { envelope, indexNode, analysis, index, cwd } = options;
  const capBytes = options.capBytes ?? DEPS_CONTENT_CAP_BYTES;

  const nodesById = new Map(analysis.graph.nodes.map((node) => [node.id, node]));
  const seed = nodesById.has(indexNode.id) ? indexNode.id : indexNode.file;
  const seedNode = nodesById.get(seed);
  if (!seedNode?.kind || !SEEDABLE_KINDS.has(seedNode.kind)) {
    return { ...envelope, deps: [] };
  }

  const leavesById = new Map<string, LocatedIndexNode>();
  const leavesByFile = new Map<string, LocatedIndexNode>();
  collectLocatedLeaves(index.structure, leavesById, leavesByFile);

  const adjacency = new Map<string, string[]>();
  for (const edge of analysis.graph.edges) {
    const neighbours = adjacency.get(edge.from) ?? [];
    neighbours.push(edge.to);
    adjacency.set(edge.from, neighbours);
  }

  const deps: ApiNodeEnvelope[] = [];
  let truncated = false;
  let budget = capBytes;
  const seen = new Set([seed]);
  const queue = [...(adjacency.get(seed) ?? [])];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (seen.has(currentId)) continue;
    seen.add(currentId);

    const depNode = leavesById.get(currentId) ?? leavesByFile.get(currentId);
    const depEnvelope = depNode
      ? buildNodeEnvelope({ indexNode: depNode, analysis, cwd })
      : wholeFileEnvelope(currentId, analysis, cwd);
    if (depEnvelope) {
      if (depEnvelope.content.length > budget) {
        truncated = true;
        break;
      }
      budget -= depEnvelope.content.length;
      deps.push(depEnvelope);
    }
    for (const next of adjacency.get(currentId) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }

  return { ...envelope, deps, ...(truncated ? { truncated: true } : {}) };
}

// Mirrors the component sections in build-index.ts's groupComponents: a leaf's id is
// `${section}/${name}`, e.g. `schemas/Ticket`.
const COMPONENT_SECTIONS = [
  'schemas',
  'responses',
  'parameters',
  'requestBodies',
  'headers',
  'securitySchemes',
  'examples',
  'links',
  'callbacks',
];

function isComponentLeafId(id: string): boolean {
  return COMPONENT_SECTIONS.some((section) => id.startsWith(`${section}/`));
}

function collectLocatedLeaves(
  nodes: ApiIndexNode[],
  byId: Map<string, LocatedIndexNode>,
  byFile: Map<string, LocatedIndexNode>
): void {
  for (const node of nodes) {
    if (node.nodes) {
      collectLocatedLeaves(node.nodes, byId, byFile);
      continue;
    }
    if (hasIndexLocation(node)) {
      byId.set(node.id, node);
      // Only a component leaf may stand in for its whole file: a component file holds exactly
      // one component, but a path-item file can hold several operations, so an operation leaf
      // must never alias the shared file back to itself.
      if (isComponentLeafId(node.id) && !byFile.has(node.file)) byFile.set(node.file, node);
    }
  }
}

function wholeFileEnvelope(
  fileId: string,
  analysis: ApiAnalysis,
  cwd: string
): ApiNodeEnvelope | undefined {
  const document = documentsByFile(analysis, cwd).get(fileId);
  if (!document) return undefined;
  const lineCount = document.source.body.split('\n').length;
  return {
    id: fileId,
    file: fileId,
    start_line: 1,
    end_line: lineCount,
    content: document.source.body,
    refs: [],
  };
}

function documentsByFile(analysis: ApiAnalysis, cwd: string): Map<string, Document> {
  const byCwd = documentsByFileCache.get(analysis) ?? new Map<string, Map<string, Document>>();
  const cached = byCwd.get(cwd);
  if (cached) return cached;

  const documents = new Map<string, Document>();
  documents.set(
    toRelativePath(analysis.rootDocument.source.absoluteRef, cwd),
    analysis.rootDocument
  );
  for (const resolvedRef of analysis.resolvedRefMap.values()) {
    if (resolvedRef.document) {
      documents.set(
        toRelativePath(resolvedRef.document.source.absoluteRef, cwd),
        resolvedRef.document
      );
    }
  }
  byCwd.set(cwd, documents);
  documentsByFileCache.set(analysis, byCwd);
  return documents;
}

function getNodeAtPointer(parsed: unknown, pointer: string): unknown {
  const fragment = pointer.replace(/^#/, '');
  if (fragment === '/' || fragment === '') return parsed;
  let current = parsed;
  for (const segment of fragment.split('/').slice(1)) {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function collectRefStrings(node: unknown, refs = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) collectRefStrings(item, refs);
  } else if (isPlainObject(node)) {
    if (isRef(node)) refs.add(node.$ref);
    for (const value of Object.values(node)) collectRefStrings(value, refs);
  }
  return refs;
}
