import type { SpecVersion } from '../oas-types.js';
import type { Location } from '../ref-utils.js';
import type { ApiAnalysis, CollectedComponent, CollectedOperation } from './build-graph.js';
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

export type FileRange = { pointer: string; file: string; start_line: number; end_line: number };

export type ApiOverview = {
  docName: string;
  spec: SpecVersion;
  docDescription?: string;
  overview?: Partial<FileRange> & { summary?: string };
  servers?: Partial<FileRange> & { urls: string[] };
  tags: { name: string; summary?: string; operations: number }[];
  webhooks: number;
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

export type PathListItem = { path: string; methods: string[] } & FileRange;

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
    webhooks: meta.operations.filter((operation) => operation.isWebhook).length,
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

export function buildOperationListing(
  analysis: ApiAnalysis,
  options: { cwd: string; tag?: string; path?: string; webhook?: string }
): OperationListItem[] {
  const { cwd, ...scope } = options;
  return listOperations(analysis.meta, scope).map((operation) =>
    toOperationListItem(operation, cwd)
  );
}

export function buildPathListing(analysis: ApiAnalysis, options: { cwd: string }): PathListItem[] {
  const groups = new Map<string, CollectedOperation[]>();
  for (const operation of analysis.meta.operations) {
    if (operation.isWebhook) continue;
    const group = groups.get(operation.containerKey) ?? [];
    group.push(operation);
    groups.set(operation.containerKey, group);
  }
  return [...groups.entries()].map(([pathKey, operations]) => ({
    path: pathKey,
    methods: operations.map((operation) => operation.method.toLowerCase()),
    ...toFileRange(operations[0].pathItemLocation, options.cwd),
  }));
}

export function buildComponentListing(
  analysis: ApiAnalysis,
  options: { cwd: string; section: string }
): ComponentListItem[] {
  return analysis.meta.components
    .filter((component) => component.section === options.section)
    .map((component) => {
      const summary = truncateSummary(component.description);
      return {
        name: component.name,
        ...(summary ? { summary } : {}),
        ...toFileRange(component.location, options.cwd),
      };
    });
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

const COMPONENT_POINTER_PATTERN = /^#\/components\/([^/]+)\/([^/]+)$/;

function classifyRef(ref: ApiNodeRef): TypedRef {
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

export function buildUsedBy(analysis: ApiAnalysis, nodeId: string, cwd: string): UsedByEntry[] {
  const entries: UsedByEntry[] = [];
  for (const edge of analysis.graph.edges) {
    if (edge.to !== nodeId || edge.refs.length === 0) continue;
    entries.push(toUsedByEntry(analysis, edge.from, cwd));
  }
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function toUsedByEntry(analysis: ApiAnalysis, nodeId: string, cwd: string): UsedByEntry {
  const operation = analysis.meta.operations.find((candidate) => candidate.id === nodeId);
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
  const slashIndex = nodeId.indexOf('/');
  if (slashIndex > 0) {
    const section = nodeId.slice(0, slashIndex);
    const name = nodeId.slice(slashIndex + 1);
    const component = analysis.meta.components.find(
      (candidate) => candidate.section === section && candidate.name === name
    );
    if (component) {
      return { id: nodeId, component: section, name, ...toFileRange(component.location, cwd) };
    }
  }
  const graphNode = analysis.graph.nodes.find((candidate) => candidate.id === nodeId);
  return { id: nodeId, ...(graphNode?.file ? { file: graphNode.file } : {}) };
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
  options: { specVersion: SpecVersion; cwd: string; withDeps?: boolean }
): OperationCard {
  const { cwd } = options;
  const range = toFileRange(operation.location, cwd);
  const description = truncateSummary(operation.description);
  const card: OperationCard = {
    ...toOperationListItem(operation, cwd),
    ...(description ? { description } : {}),
    refs: collectNodeRefs({ file: range.file, pointer: range.pointer, analysis, cwd }).map(
      classifyRef
    ),
    usedBy: buildUsedBy(analysis, operation.id, cwd),
  };
  if (!options.withDeps) return card;
  return appendRetrieval(
    card,
    locatedNodeFor(operation.id, operation.location, cwd),
    analysis,
    options
  );
}

export function buildComponentCard(
  analysis: ApiAnalysis,
  component: CollectedComponent,
  options: { specVersion: SpecVersion; cwd: string; withDeps?: boolean }
): ComponentCard {
  const { cwd } = options;
  const componentId = `${component.section}/${component.name}`;
  const range = toFileRange(component.location, cwd);
  const summary = truncateSummary(component.description);
  const card: ComponentCard = {
    component: component.section,
    name: component.name,
    ...(summary ? { summary } : {}),
    ...range,
    refs: collectNodeRefs({ file: range.file, pointer: range.pointer, analysis, cwd }).map(
      classifyRef
    ),
    usedBy: buildUsedBy(analysis, componentId, cwd),
  };
  if (!options.withDeps) return card;
  return appendRetrieval(
    card,
    locatedNodeFor(componentId, component.location, cwd),
    analysis,
    options
  );
}
