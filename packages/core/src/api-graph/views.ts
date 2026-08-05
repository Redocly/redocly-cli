import type { SpecVersion } from '../oas-types.js';
import type { ApiAnalysis, CollectedOperation } from './build-graph.js';
import { COMPONENT_SECTIONS, toFileRange, toRelativePath, truncateSummary } from './build-index.js';
import { listOperations } from './select.js';

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
