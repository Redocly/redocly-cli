import { escapePointerFragment, Location } from '../ref-utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import {
  graphNodeIdFor,
  type ApiAnalysis,
  type ApiIndexMeta,
  type CollectedComponent,
  type CollectedOperation,
} from './build-graph.js';
import { COMPONENT_SECTIONS, toFileRange } from './build-index.js';
import { parsePointerSegments } from './node-id.js';
import {
  findComponent,
  findOperationByPathMethod,
  findWebhookOperation,
  HTTP_METHODS,
} from './select.js';
import { buildNodeEnvelope, DEPS_CONTENT_CAP_BYTES, type ApiNodeEnvelope } from './slice.js';
import { buildUsedBy, classifyRef, type TypedRef } from './views.js';

export type PointerAncestor = {
  id: string;
  pointer: string;
  file: string;
  start_line: number;
  end_line: number;
  usedByCount: number;
};

export type PointerCard = {
  pointer: string;
  file: string;
  start_line: number;
  end_line: number;
  content: string;
  refs: TypedRef[];
  truncated?: boolean;
  ancestor?: PointerAncestor;
};

export type PointerResolution =
  | { kind: 'component'; component: CollectedComponent }
  | { kind: 'operation'; operation: CollectedOperation }
  /** `#/` (or empty): the same overview the bare invocation renders. */
  | { kind: 'overview' }
  /** `#/paths`: every non-webhook operation, the same listing `--operations` renders. */
  | { kind: 'all-operations' }
  /** `#/webhooks`: every webhook operation, the same listing `--webhooks` renders. */
  | { kind: 'all-webhooks' }
  /** `#/components`: not a bounded view on its own — the caller rejects it, naming the sections. */
  | { kind: 'components-root' }
  /** `#/components/<section>`: that section's components, the same listing `--component` renders. */
  | { kind: 'component-section'; section: string }
  /** `#/paths/<path>` (the path exists): that path's operations, the same listing `--path` renders. */
  | { kind: 'path-operations'; path: string }
  /** `#/webhooks/<name>` (the webhook exists): that webhook's operations, the same listing `--webhook` renders. */
  | { kind: 'webhook-operations'; webhook: string }
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

type ContainerResolution = Extract<
  PointerResolution,
  {
    kind:
      | 'overview'
      | 'all-operations'
      | 'all-webhooks'
      | 'components-root'
      | 'component-section'
      | 'path-operations'
      | 'webhook-operations';
  }
>;

/**
 * Resolves a raw JSON pointer (as it appears in lint problems, `--format=json` refs, or diffs)
 * against the analyzed API: an indexed match (component/operation/webhook) routes to the same
 * result a typed selector would produce; a pointer that lands exactly on a container boundary —
 * the document root, `paths`, `webhooks`, `components`, one component section, or one path —
 * routes to the same bounded listing its typed selector equivalent produces, instead of slicing
 * that whole subtree; anything else that still resolves inside the root document comes back as a
 * `deep` node with its own coordinates, content, and nearest indexed ancestor. Root-document
 * pointers only — a split layout's other files are out of scope for v1.
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

  const container = classifyContainerSegments(analysis.meta, segments);
  if (container) return container;

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
  const envelope = capEnvelopeContent(
    buildNodeEnvelope({
      indexNode: { id: normalizedPointer, title: normalizedPointer, ...fileRange },
      analysis,
      cwd,
    })
  );

  const ancestorMatch = findAncestor(analysis.meta, segments);
  return {
    kind: 'deep',
    pointer: normalizedPointer,
    envelope,
    ...(ancestorMatch ? { ancestor: toAncestor(analysis, ancestorMatch, cwd) } : {}),
  };
}

/** Builds the renderable card for a `deep` pointer resolution: coordinates, body, and typed refs. */
export function buildPointerCard(
  resolution: Extract<PointerResolution, { kind: 'deep' }>
): PointerCard {
  const { envelope } = resolution;
  return {
    pointer: resolution.pointer,
    file: envelope.file,
    start_line: envelope.start_line,
    end_line: envelope.end_line,
    content: envelope.content,
    refs: envelope.refs.map(classifyRef),
    ...(envelope.truncated ? { truncated: true } : {}),
    ...(resolution.ancestor ? { ancestor: resolution.ancestor } : {}),
  };
}

/** A deep node's sliced content past this cap is truncated, the same rule `--with-deps` applies. */
function capEnvelopeContent(envelope: ApiNodeEnvelope): ApiNodeEnvelope {
  if (envelope.content.length <= DEPS_CONTENT_CAP_BYTES) return envelope;
  return {
    ...envelope,
    content: envelope.content.slice(0, DEPS_CONTENT_CAP_BYTES),
    truncated: true,
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
    // Arrays own `length`, so `#/servers/length` would resolve. Reject it: require plain indices.
    if (Array.isArray(current) && !/^\d+$/.test(segment)) return undefined;
    // An own property, not just a plain index: a bogus segment like `constructor` must not
    // resolve to whatever the prototype chain happens to expose at that key.
    if (!Object.hasOwn(current, segment)) return undefined;
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

/**
 * Classifies a pointer that lands exactly on a container boundary — the document root, `paths`,
 * `webhooks`, `components`, one component section, or one path — to the same bounded view its
 * typed selector equivalent already produces. Only used for the pointer's own full segment list;
 * `findAncestor` below never calls this, since a container isn't a specific indexed node with a
 * `usedBy` count of its own, so it can't stand in as one.
 */
function classifyContainerSegments(
  meta: ApiIndexMeta,
  segments: string[]
): ContainerResolution | undefined {
  if (segments.length === 0) return { kind: 'overview' };
  if (segments.length === 1) return classifyRootContainer(segments[0]);
  if (segments.length === 2) return classifyOneLevelContainer(meta, segments[0], segments[1]);
  return undefined;
}

function classifyRootContainer(head: string): ContainerResolution | undefined {
  if (head === 'paths') return { kind: 'all-operations' };
  if (head === 'webhooks') return { kind: 'all-webhooks' };
  if (head === 'components') return { kind: 'components-root' };
  return undefined;
}

function classifyOneLevelContainer(
  meta: ApiIndexMeta,
  head: string,
  second: string
): ContainerResolution | undefined {
  if (head === 'components' && COMPONENT_SECTIONS.includes(second)) {
    return { kind: 'component-section', section: second };
  }
  const pathExists =
    head === 'paths' &&
    meta.operations.some((operation) => !operation.isWebhook && operation.containerKey === second);
  if (pathExists) return { kind: 'path-operations', path: second };
  const webhookExists =
    head === 'webhooks' &&
    meta.operations.some((operation) => operation.isWebhook && operation.containerKey === second);
  return webhookExists ? { kind: 'webhook-operations', webhook: second } : undefined;
}

/** Trims trailing segments off a deep pointer until a shorter prefix matches an indexed node. */
function findAncestor(meta: ApiIndexMeta, segments: string[]): IndexedMatch | undefined {
  for (let length = segments.length - 1; length >= 1; length--) {
    const match = classifyIndexedSegments(meta, segments.slice(0, length));
    if (match) return match;
  }
  return undefined;
}

/** A webhook operation's display label, matching the `ai` format's `<method> webhook <name>` line. */
function displayIdFor(operation: CollectedOperation): string {
  return operation.isWebhook
    ? `${operation.method.toLowerCase()} webhook ${operation.containerKey}`
    : operation.id;
}

function toAncestor(analysis: ApiAnalysis, match: IndexedMatch, cwd: string): PointerAncestor {
  if (match.kind === 'component') {
    const { component } = match;
    const id = `${component.section}/${component.name}`;
    const range = toFileRange(component.location, cwd);
    return {
      id,
      pointer: `#/components/${component.section}/${escapePointerFragment(component.name)}`,
      file: range.file,
      start_line: range.start_line,
      end_line: range.end_line,
      usedByCount: buildUsedBy(analysis, id, cwd).length,
    };
  }
  const { operation } = match;
  const range = toFileRange(operation.location, cwd);
  return {
    id: displayIdFor(operation),
    // Already the operation's own `#/paths/...` (or `#/webhooks/...`) pointer, escaped by the
    // walker that recorded it.
    pointer: operation.location.pointer,
    file: range.file,
    start_line: range.start_line,
    end_line: range.end_line,
    usedByCount: buildUsedBy(analysis, graphNodeIdFor(operation), cwd).length,
  };
}
