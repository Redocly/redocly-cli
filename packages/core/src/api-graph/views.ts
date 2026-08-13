import type { SpecVersion } from '../oas-types.js';
import type { Location } from '../ref-utils.js';
import {
  collectReversePathsTo,
  type ApiAnalysis,
  type CollectedComponent,
  type CollectedOperation,
} from './build-graph.js';
import {
  COMPONENT_SECTIONS,
  buildApiIndex,
  toFileRange,
  toRelativePath,
  truncateSummary,
} from './build-index.js';
import { listOperations } from './select.js';
import {
  appendDepsClosure,
  buildNodeEnvelope,
  collectNodeRefs,
  type ApiNodeEnvelope,
  type ApiNodeRef,
  type LocatedIndexNode,
} from './slice.js';
import type { GraphEdge, GraphNode } from './types.js';

export type FileRange = { pointer: string; file: string; start_line: number; end_line: number };

export type ApiOverview = {
  docName: string;
  spec: SpecVersion;
  docDescription?: string;
  overview?: Partial<FileRange> & { summary?: string };
  servers?: Partial<FileRange> & { urls: string[] };
  tags: { name: string; summary?: string; operations: number }[];
  operations: number;
  webhooks: { name: string; operations: number }[];
  components: { section: string; count: number }[];
};

export type OperationListItem = {
  method: string;
  path?: string;
  webhook?: string;
  operationId?: string;
  deprecated?: boolean;
  summary?: string;
  tags: string[];
} & FileRange;

export type ComponentListItem = { name: string; summary?: string } & FileRange;

const UNTAGGED = 'untagged';

export function buildOverview(
  analysis: ApiAnalysis,
  options: { specVersion: SpecVersion; cwd: string }
): ApiOverview {
  const { meta, rootDocument } = analysis;
  const { specVersion, cwd } = options;

  const tagCounts = new Map<string, number>();
  for (const operation of meta.operations) {
    if (operation.isWebhook) continue;
    const tagNames = operation.tags.length > 0 ? operation.tags : [UNTAGGED];
    for (const tagName of new Set(tagNames)) {
      tagCounts.set(tagName, (tagCounts.get(tagName) ?? 0) + 1);
    }
  }
  const orderedTagNames = [
    ...meta.declaredTags.map((tag) => tag.name).filter((name) => tagCounts.has(name)),
    ...[...tagCounts.keys()].filter(
      (name) => name !== UNTAGGED && !meta.declaredTags.some((tag) => tag.name === name)
    ),
    ...(tagCounts.has(UNTAGGED) ? [UNTAGGED] : []),
  ];

  const componentCounts = new Map<string, number>();
  for (const component of meta.components) {
    componentCounts.set(component.section, (componentCounts.get(component.section) ?? 0) + 1);
  }
  const orderedSections = [...componentCounts.keys()].sort(
    (left, right) => COMPONENT_SECTIONS.indexOf(left) - COMPONENT_SECTIONS.indexOf(right)
  );

  // Ordered by first appearance, like tags and components above: the order operations were
  // encountered while walking the document, not alphabetical.
  const webhookCounts = new Map<string, number>();
  const webhookOrder: string[] = [];
  for (const operation of meta.operations) {
    if (!operation.isWebhook) continue;
    if (!webhookCounts.has(operation.containerKey)) webhookOrder.push(operation.containerKey);
    webhookCounts.set(operation.containerKey, (webhookCounts.get(operation.containerKey) ?? 0) + 1);
  }

  const docDescription = meta.info
    ? truncateSummary([meta.info.title, meta.info.description].filter(Boolean).join(' — '))
    : undefined;

  return {
    docName: toRelativePath(rootDocument.source.absoluteRef, cwd),
    spec: specVersion,
    ...(docDescription ? { docDescription } : {}),
    ...(meta.info
      ? {
          overview: {
            ...toFileRange(meta.info.location, cwd),
            ...(truncateSummary(meta.info.description)
              ? { summary: truncateSummary(meta.info.description) }
              : {}),
          },
        }
      : {}),
    ...(meta.servers
      ? { servers: { ...toFileRange(meta.servers.location, cwd), urls: meta.servers.urls } }
      : {}),
    tags: orderedTagNames.map((name) => {
      const declared = meta.declaredTags.find((tag) => tag.name === name);
      const summary = truncateSummary(declared?.description);
      return { name, ...(summary ? { summary } : {}), operations: tagCounts.get(name)! };
    }),
    // The true operation count: an operation with more than one tag is counted once here,
    // unlike the per-tag counts above, which each count it under every tag it has.
    operations: meta.operations.filter((operation) => !operation.isWebhook).length,
    webhooks: webhookOrder.map((name) => ({ name, operations: webhookCounts.get(name)! })),
    components: orderedSections.map((section) => ({
      section,
      count: componentCounts.get(section)!,
    })),
  };
}

export function toOperationListItem(operation: CollectedOperation, cwd: string): OperationListItem {
  const summary = truncateSummary(operation.summary ?? operation.description);
  return {
    method: operation.method.toLowerCase(),
    ...(operation.isWebhook
      ? { webhook: operation.containerKey }
      : { path: operation.containerKey }),
    ...(operation.operationId ? { operationId: operation.operationId } : {}),
    ...(operation.deprecated ? { deprecated: true } : {}),
    ...(summary ? { summary } : {}),
    tags: operation.tags,
    ...toFileRange(operation.location, cwd),
  };
}

export type TypedRef = ApiNodeRef & { component?: string; name?: string };

export type UsedByEntry = {
  id: string;
  component?: string;
  name?: string;
  method?: string;
  path?: string;
  webhook?: string;
  operationId?: string;
} & Partial<FileRange>;

export type OperationCard = OperationListItem & {
  description?: string;
  refs: TypedRef[];
  usedBy: UsedByEntry[];
  content?: string;
  deps?: ApiNodeEnvelope[];
  truncated?: boolean;
};

export type ComponentCard = {
  component: string;
  name: string;
  summary?: string;
  refs: TypedRef[];
  usedBy: UsedByEntry[];
  content?: string;
  deps?: ApiNodeEnvelope[];
  truncated?: boolean;
} & FileRange;

/** Card-shaped listing entry: everything a card carries except its retrieval-only fields. */
export type OperationListCard = Omit<OperationCard, 'content' | 'deps' | 'truncated'>;

/** Card-shaped listing entry: everything a card carries except its retrieval-only fields. */
export type ComponentListCard = Omit<ComponentCard, 'content' | 'deps' | 'truncated'>;

const COMPONENT_POINTER_PATTERN = /^#\/components\/([^/]+)\/([^/]+)$/;

/**
 * Resolves a ref to the component section/name it targets, when it targets a named component at
 * all. Exported for the CLI's `ai` tree format, which needs the same classification to name a
 * `$ref` inside a dependency's own signature and to bucket the dependency closure by BFS depth.
 */
export function classifyRef(ref: ApiNodeRef): TypedRef {
  if (!ref.resolved || ref.pointer === undefined) return { ...ref, component: 'unknown' };
  const componentMatch = ref.pointer.match(COMPONENT_POINTER_PATTERN);
  if (componentMatch && COMPONENT_SECTIONS.includes(componentMatch[1])) {
    const name = componentMatch[2].replace(/~1/g, '/').replace(/~0/g, '~');
    return { ...ref, component: componentMatch[1], name };
  }
  // A component split into its own file is referenced at the file root.
  if (ref.pointer === '#/' || ref.pointer === '#') {
    const fileMatch = ref.file?.match(/(?:^|\/)components\/([^/]+)\/([^/]+)\.(?:yaml|yml|json)$/);
    if (fileMatch && COMPONENT_SECTIONS.includes(fileMatch[1])) {
      return { ...ref, component: fileMatch[1], name: fileMatch[2] };
    }
  }
  return { ...ref, component: 'unknown' };
}

/**
 * Per-analysis lookup indexes for the reverse-reference scans below. Card-shaped listings call
 * `buildUsedBy`/`toUsedByEntry` once per operation or component (hundreds of times for a large
 * spec), so each index is built once per `analysis` — via the WeakMap — instead of the naive
 * per-call linear scan over `graph.edges`/`meta.operations`/`meta.components` it replaces.
 */
type ViewsIndex = {
  /** Edges with at least one ref, keyed by `to`: the exact set `buildUsedBy` iterates. */
  reverseEdges: Map<string, GraphEdge[]>;
  operationsById: Map<string, CollectedOperation>;
  /** Keyed by `${section}/${name}`, which is exactly a component node's id. */
  componentsById: Map<string, CollectedComponent>;
  nodesById: Map<string, GraphNode>;
  webhookOperationsByContainerKey: Map<string, CollectedOperation[]>;
};

const viewsIndexCache = new WeakMap<ApiAnalysis, ViewsIndex>();

function getViewsIndex(analysis: ApiAnalysis): ViewsIndex {
  const cached = viewsIndexCache.get(analysis);
  if (cached) return cached;

  const reverseEdges = new Map<string, GraphEdge[]>();
  for (const edge of analysis.graph.edges) {
    if (edge.refs.length === 0) continue;
    const incoming = reverseEdges.get(edge.to);
    if (incoming) incoming.push(edge);
    else reverseEdges.set(edge.to, [edge]);
  }

  // `.find`/`.filter` keep the first match on a duplicate id; mirror that with has()-guarded
  // sets so a hypothetical duplicate can't silently flip which entry wins.
  const operationsById = new Map<string, CollectedOperation>();
  const webhookOperationsByContainerKey = new Map<string, CollectedOperation[]>();
  for (const operation of analysis.meta.operations) {
    if (!operationsById.has(operation.id)) operationsById.set(operation.id, operation);
    if (operation.isWebhook) {
      const group = webhookOperationsByContainerKey.get(operation.containerKey);
      if (group) group.push(operation);
      else webhookOperationsByContainerKey.set(operation.containerKey, [operation]);
    }
  }

  const componentsById = new Map<string, CollectedComponent>();
  for (const component of analysis.meta.components) {
    const id = `${component.section}/${component.name}`;
    if (!componentsById.has(id)) componentsById.set(id, component);
  }

  const nodesById = new Map<string, GraphNode>();
  for (const node of analysis.graph.nodes) {
    nodesById.set(node.id, node);
  }

  const index: ViewsIndex = {
    reverseEdges,
    operationsById,
    componentsById,
    nodesById,
    webhookOperationsByContainerKey,
  };
  viewsIndexCache.set(analysis, index);
  return index;
}

export function buildUsedBy(analysis: ApiAnalysis, nodeId: string, cwd: string): UsedByEntry[] {
  const { reverseEdges } = getViewsIndex(analysis);
  const entries = (reverseEdges.get(nodeId) ?? []).map((edge) =>
    toUsedByEntry(analysis, edge.from, cwd)
  );
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function toUsedByEntry(analysis: ApiAnalysis, nodeId: string, cwd: string): UsedByEntry {
  const index = getViewsIndex(analysis);
  const operation = index.operationsById.get(nodeId);
  if (operation) {
    return {
      id: nodeId,
      method: operation.method.toLowerCase(),
      ...(operation.isWebhook
        ? { webhook: operation.containerKey }
        : { path: operation.containerKey }),
      ...(operation.operationId ? { operationId: operation.operationId } : {}),
      ...toFileRange(operation.location, cwd),
    };
  }
  if (nodeId.startsWith('webhooks/')) {
    const webhookName = nodeId.slice('webhooks/'.length);
    // Every method under a webhook shares one container node (see mapRootPointer), so a ref
    // made from any of its operations is attributed to the container, not to one operation.
    // Any matching operation's pathItemLocation is the same location; the first is enough here.
    const containerOperation = index.webhookOperationsByContainerKey.get(webhookName)?.[0];
    if (containerOperation) {
      return {
        id: nodeId,
        webhook: webhookName,
        ...toFileRange(containerOperation.pathItemLocation, cwd),
      };
    }
  }
  const slashIndex = nodeId.indexOf('/');
  if (slashIndex > 0) {
    const section = nodeId.slice(0, slashIndex);
    const name = nodeId.slice(slashIndex + 1);
    const component = index.componentsById.get(nodeId);
    if (component) {
      return { id: nodeId, component: section, name, ...toFileRange(component.location, cwd) };
    }
  }
  const graphNode = index.nodesById.get(nodeId);
  return { id: nodeId, ...(graphNode?.file ? { file: graphNode.file } : {}) };
}

/** The card fields shared by a full card and its list-card counterpart, with no retrieval. */
export function buildOperationListCard(
  analysis: ApiAnalysis,
  operation: CollectedOperation,
  cwd: string
): OperationListCard {
  const range = toFileRange(operation.location, cwd);
  const description = truncateSummary(operation.description);
  return {
    ...toOperationListItem(operation, cwd),
    ...(description ? { description } : {}),
    refs: collectNodeRefs({ file: range.file, pointer: range.pointer, analysis, cwd }).map(
      classifyRef
    ),
    usedBy: buildUsedBy(analysis, operation.id, cwd),
  };
}

/** The card fields shared by a full card and its list-card counterpart, with no retrieval. */
export function buildComponentListCard(
  analysis: ApiAnalysis,
  component: CollectedComponent,
  cwd: string
): ComponentListCard {
  const componentId = `${component.section}/${component.name}`;
  const range = toFileRange(component.location, cwd);
  const summary = truncateSummary(component.description);
  return {
    component: component.section,
    name: component.name,
    ...(summary ? { summary } : {}),
    ...range,
    refs: collectNodeRefs({ file: range.file, pointer: range.pointer, analysis, cwd }).map(
      classifyRef
    ),
    usedBy: buildUsedBy(analysis, componentId, cwd),
  };
}

export function buildOperationListing(
  analysis: ApiAnalysis,
  options: { cwd: string; tag?: string; path?: string; webhook?: string; allWebhooks?: boolean }
): OperationListCard[] {
  const { cwd, ...scope } = options;
  return listOperations(analysis.meta, scope).map((operation) =>
    buildOperationListCard(analysis, operation, cwd)
  );
}

export function buildComponentListing(
  analysis: ApiAnalysis,
  options: { cwd: string; section: string }
): ComponentListCard[] {
  return analysis.meta.components
    .filter((component) => component.section === options.section)
    .map((component) => buildComponentListCard(analysis, component, options.cwd));
}

function locatedNodeFor(id: string, location: Location, cwd: string): LocatedIndexNode {
  return { id, title: id, ...toFileRange(location, cwd) };
}

function appendRetrieval<
  CardType extends { content?: string; deps?: ApiNodeEnvelope[]; truncated?: boolean },
>(
  card: CardType,
  located: LocatedIndexNode,
  analysis: ApiAnalysis,
  options: { specVersion: SpecVersion; cwd: string }
): CardType {
  const envelope = appendDepsClosure({
    envelope: buildNodeEnvelope({ indexNode: located, analysis, cwd: options.cwd }),
    indexNode: located,
    analysis,
    index: buildApiIndex(analysis, {
      specVersion: options.specVersion,
      cwd: options.cwd,
      groupBy: 'tags',
    }),
    cwd: options.cwd,
  });
  return {
    ...card,
    content: envelope.content,
    deps: envelope.deps,
    ...(envelope.truncated ? { truncated: true } : {}),
  };
}

export function buildOperationCard(
  analysis: ApiAnalysis,
  operation: CollectedOperation,
  options: { specVersion: SpecVersion; cwd: string; withDeps?: boolean; withContent?: boolean }
): OperationCard {
  const { cwd } = options;
  const card = buildOperationListCard(analysis, operation, cwd);
  // A webhook operation has no graph node of its own: every method under a webhook shares one
  // container node (`webhooks/<name>`, see mapRootPointer) that actually holds the $ref edges.
  // Seed the closure from that container while keeping the operation's own range for `content`.
  const depsSeedId = operation.isWebhook ? `webhooks/${operation.containerKey}` : operation.id;
  if (!options.withDeps) {
    if (!options.withContent) return card;
    const envelope = buildNodeEnvelope({
      indexNode: locatedNodeFor(depsSeedId, operation.location, cwd),
      analysis,
      cwd,
    });
    return { ...card, content: envelope.content };
  }
  // The explicit type argument steers inference to OperationCard: `card` is typed as the
  // narrower OperationListCard (it has no content/deps/truncated keys at all), and those three
  // keys being optional on both sides trips TS's "no properties in common" weak-type check
  // if inference is left to pick OperationListCard instead.
  return appendRetrieval<OperationCard>(
    card,
    locatedNodeFor(depsSeedId, operation.location, cwd),
    analysis,
    options
  );
}

export function buildComponentCard(
  analysis: ApiAnalysis,
  component: CollectedComponent,
  options: { specVersion: SpecVersion; cwd: string; withDeps?: boolean; withContent?: boolean }
): ComponentCard {
  const { cwd } = options;
  const card = buildComponentListCard(analysis, component, cwd);
  const componentId = `${component.section}/${component.name}`;
  if (!options.withDeps) {
    if (!options.withContent) return card;
    const envelope = buildNodeEnvelope({
      indexNode: locatedNodeFor(componentId, component.location, cwd),
      analysis,
      cwd,
    });
    return { ...card, content: envelope.content };
  }
  // Same reasoning as buildOperationCard: steer inference to ComponentCard explicitly.
  return appendRetrieval<ComponentCard>(
    card,
    locatedNodeFor(componentId, component.location, cwd),
    analysis,
    options
  );
}

export type UsedByReport = {
  target: UsedByEntry;
  affectedOperations: (UsedByEntry & { via: string[] })[];
  affectedComponents: (UsedByEntry & { via: string[] })[];
};

/**
 * Classifies each reverse-reference chain into an affected operation or component and assembles
 * the report. Shared by `buildUsedByReport` (single-node target) and `buildFileUsedByReport`
 * (file target, seeded from several nodes and pre-merged), which pass different chain sources
 * and, for the file case, exclude referrers that live in the target file itself.
 */
export function buildUsedByReportFromChains(
  analysis: ApiAnalysis,
  target: UsedByEntry,
  chains: Map<string, string[]>,
  cwd: string,
  excludeIds: ReadonlySet<string> = new Set()
): UsedByReport {
  const affectedOperations: (UsedByEntry & { via: string[] })[] = [];
  const affectedComponents: (UsedByEntry & { via: string[] })[] = [];
  const { webhookOperationsByContainerKey } = getViewsIndex(analysis);

  for (const [nodeId, via] of chains) {
    if (excludeIds.has(nodeId)) continue;
    const entry = toUsedByEntry(analysis, nodeId, cwd);
    if (entry.method !== undefined) {
      affectedOperations.push({ ...entry, via });
    } else if (entry.webhook !== undefined) {
      // The container entry above covers every method under the webhook; expand it into one
      // entry per operation actually defined there, each with its own method.
      const webhookOperations = webhookOperationsByContainerKey.get(entry.webhook) ?? [];
      for (const webhookOperation of webhookOperations) {
        affectedOperations.push({
          ...entry,
          id: webhookOperation.id,
          method: webhookOperation.method.toLowerCase(),
          ...(webhookOperation.operationId ? { operationId: webhookOperation.operationId } : {}),
          via,
        });
      }
    } else if (entry.component !== undefined) {
      affectedComponents.push({ ...entry, via });
    }
    // Path spine, file, and root nodes are structural — the report lists actionable nodes only.
  }

  affectedOperations.sort((left, right) => left.id.localeCompare(right.id));
  affectedComponents.sort((left, right) => left.id.localeCompare(right.id));
  return { target, affectedOperations, affectedComponents };
}

export function buildUsedByReport(
  analysis: ApiAnalysis,
  targetId: string,
  cwd: string
): UsedByReport {
  const chains = collectReversePathsTo(targetId, analysis.graph.edges);
  return buildUsedByReportFromChains(analysis, toUsedByEntry(analysis, targetId, cwd), chains, cwd);
}
