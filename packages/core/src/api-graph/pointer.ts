import { Location } from '../ref-utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type {
  ApiAnalysis,
  ApiIndexMeta,
  CollectedComponent,
  CollectedOperation,
} from './build-graph.js';
import { COMPONENT_SECTIONS, toFileRange } from './build-index.js';
import { parsePointerSegments } from './node-id.js';
import {
  findComponent,
  findOperationByPathMethod,
  findWebhookOperation,
  HTTP_METHODS,
} from './select.js';
import { buildNodeEnvelope, type ApiNodeEnvelope } from './slice.js';
import { buildUsedBy } from './views.js';

export type PointerAncestor = {
  id: string;
  component?: CollectedComponent;
  operation?: CollectedOperation;
  usedByCount: number;
};

export type PointerResolution =
  | { kind: 'component'; component: CollectedComponent }
  | { kind: 'operation'; operation: CollectedOperation }
  | {
      kind: 'deep';
      pointer: string;
      envelope: ApiNodeEnvelope;
      ancestor?: PointerAncestor;
    }
  | { kind: 'unresolved'; pointer: string; nearestResolvable?: string };

/** Same shape a typed tree selector would resolve to: a named component, or a path/webhook operation. */
type IndexedMatch =
  | { kind: 'component'; component: CollectedComponent }
  | { kind: 'operation'; operation: CollectedOperation };

/**
 * Resolves a raw JSON pointer (as it appears in lint problems, `--format=json` refs, or diffs)
 * against the analyzed API: an indexed match (component/operation/webhook) routes to the same
 * result a typed selector would produce; anything else that still resolves inside the root
 * document comes back as a `deep` node with its own coordinates, content, and nearest indexed
 * ancestor. Root-document pointers only — a split layout's other files are out of scope for v1.
 */
export function resolvePointerSelector(
  analysis: ApiAnalysis,
  pointerInput: string,
  options: { cwd: string }
): PointerResolution {
  const { cwd } = options;
  const normalizedPointer = normalizePointerInput(pointerInput);
  const rawSegments = splitRawSegments(normalizedPointer);
  const segments = parsePointerSegments(normalizedPointer);

  const indexed = classifyIndexedSegments(analysis.meta, segments);
  if (indexed) return indexed;

  const resolvedNode = resolveNodeAtSegments(analysis.rootDocument.parsed, segments);
  if (resolvedNode === undefined) {
    return {
      kind: 'unresolved',
      pointer: normalizedPointer,
      nearestResolvable: findNearestResolvable(analysis.rootDocument.parsed, rawSegments, segments),
    };
  }

  const location = new Location(analysis.rootDocument.source, normalizedPointer);
  const fileRange = toFileRange(location, cwd);
  const envelope = buildNodeEnvelope({
    indexNode: { id: normalizedPointer, title: normalizedPointer, ...fileRange },
    analysis,
    cwd,
  });

  const ancestorMatch = findAncestor(analysis.meta, segments);
  return {
    kind: 'deep',
    pointer: normalizedPointer,
    envelope,
    ...(ancestorMatch ? { ancestor: toAncestor(analysis, ancestorMatch, cwd) } : {}),
  };
}

/** Accepts a pointer with or without a leading `#`, and ensures a leading `/` follows it. */
function normalizePointerInput(pointerInput: string): string {
  const withoutHash = pointerInput.startsWith('#') ? pointerInput.slice(1) : pointerInput;
  const withLeadingSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  return `#${withLeadingSlash}`;
}

/** Splits a normalized `#/a/b` pointer into its raw segments, still `~0`/`~1`-escaped. */
function splitRawSegments(normalizedPointer: string): string[] {
  return normalizedPointer
    .slice(1)
    .split('/')
    .filter((segment) => segment.length > 0);
}

/** Walks the parsed document by unescaped segments; `undefined` means the pointer doesn't resolve. */
function resolveNodeAtSegments(parsed: unknown, segments: string[]): unknown {
  let current = parsed;
  for (const segment of segments) {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Trims trailing segments off a pointer that failed to resolve until a shorter prefix does. */
function findNearestResolvable(
  rootParsed: unknown,
  rawSegments: string[],
  segments: string[]
): string | undefined {
  for (let length = segments.length - 1; length >= 1; length--) {
    if (resolveNodeAtSegments(rootParsed, segments.slice(0, length)) !== undefined) {
      return `#/${rawSegments.slice(0, length).join('/')}`;
    }
  }
  return undefined;
}

function classifyIndexedSegments(meta: ApiIndexMeta, segments: string[]): IndexedMatch | undefined {
  if (segments.length !== 3) return undefined;
  const [head, second, third] = segments;

  if (head === 'components' && COMPONENT_SECTIONS.includes(second)) {
    const component = findComponent(meta, second, third);
    return component ? { kind: 'component', component } : undefined;
  }
  if (head === 'paths' && HTTP_METHODS.has(third)) {
    const operation = findOperationByPathMethod(meta, second, third);
    return operation ? { kind: 'operation', operation } : undefined;
  }
  if (head === 'webhooks' && HTTP_METHODS.has(third)) {
    const operation = findWebhookOperation(meta, second, third);
    return operation ? { kind: 'operation', operation } : undefined;
  }
  return undefined;
}

/** Trims trailing segments off a deep pointer until a shorter prefix matches an indexed node. */
function findAncestor(meta: ApiIndexMeta, segments: string[]): IndexedMatch | undefined {
  for (let length = segments.length - 1; length >= 1; length--) {
    const match = classifyIndexedSegments(meta, segments.slice(0, length));
    if (match) return match;
  }
  return undefined;
}

/** The graph node id an indexed match counts reverse edges against (see `views.ts`/`buildUsedBy`). */
function ancestorGraphId(match: IndexedMatch): string {
  if (match.kind === 'component') return `${match.component.section}/${match.component.name}`;
  // Every method under a webhook shares one container node; the operation's own id isn't a
  // graph node, so reverse edges must be counted against the container instead.
  return match.operation.isWebhook
    ? `webhooks/${match.operation.containerKey}`
    : match.operation.id;
}

function toAncestor(analysis: ApiAnalysis, match: IndexedMatch, cwd: string): PointerAncestor {
  const id = ancestorGraphId(match);
  return {
    id,
    ...(match.kind === 'component'
      ? { component: match.component }
      : { operation: match.operation }),
    usedByCount: buildUsedBy(analysis, id, cwd).length,
  };
}
