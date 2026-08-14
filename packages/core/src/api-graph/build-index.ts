import * as path from 'node:path';

import { getContentLineColLocation } from '../format/codeframes.js';
import type { SpecVersion } from '../oas-types.js';
import { isAbsoluteUrl, type Location } from '../ref-utils.js';
import type {
  ApiAnalysis,
  ApiIndexMeta,
  CollectedComponent,
  CollectedOperation,
} from './build-graph.js';

export const SUMMARY_LIMIT = 160;
const UNTAGGED = 'untagged';

/** OpenAPI component sections, in the order the index lists them. */
export const COMPONENT_SECTIONS: readonly string[] = [
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

export type IndexGroupBy = 'tags' | 'paths';

export type ApiIndexNode = {
  id: string;
  title: string;
  pointer?: string;
  file?: string;
  start_line?: number;
  end_line?: number;
  summary?: string;
  operationId?: string;
  deprecated?: boolean;
  nodes?: ApiIndexNode[];
};

export type ApiIndex = {
  docName: string;
  spec: SpecVersion;
  docDescription?: string;
  structure: ApiIndexNode[];
};

export function buildApiIndex(
  analysis: ApiAnalysis,
  options: { specVersion: SpecVersion; cwd: string; groupBy: IndexGroupBy }
): ApiIndex {
  const { meta, rootDocument } = analysis;
  const { specVersion, cwd, groupBy } = options;

  const structure: ApiIndexNode[] = [];

  if (meta.info) {
    const summary = truncateSummary(meta.info.description);
    structure.push({
      id: 'Overview',
      title: 'Overview',
      ...toFileRange(meta.info.location, cwd),
      ...(summary ? { summary } : {}),
    });
  }

  if (meta.servers) {
    const summary = truncateSummary(meta.servers.urls.join(', '));
    structure.push({
      id: 'Servers',
      title: 'Servers',
      ...toFileRange(meta.servers.location, cwd),
      ...(summary ? { summary } : {}),
    });
  }

  const pathOperations = meta.operations.filter((operation) => !operation.isWebhook);
  if (pathOperations.length > 0) {
    structure.push({
      id: 'Operations',
      title: 'Operations',
      ...(meta.pathsLocation ? toFileRange(meta.pathsLocation, cwd) : {}),
      nodes:
        groupBy === 'tags'
          ? groupByTags(pathOperations, meta.declaredTags, cwd)
          : groupByPaths(pathOperations, cwd),
    });
  }

  const webhookOperations = meta.operations.filter((operation) => operation.isWebhook);
  if (webhookOperations.length > 0) {
    structure.push({
      id: 'Webhooks',
      title: 'Webhooks',
      ...(meta.webhooksLocation ? toFileRange(meta.webhooksLocation, cwd) : {}),
      nodes: webhookOperations.map((operation) => toOperationNode(operation, cwd)),
    });
  }

  const componentNodes = groupComponents(meta.components, cwd);
  if (componentNodes.length > 0) {
    structure.push({
      id: 'Components',
      title: 'Components',
      ...(meta.componentsLocation ? toFileRange(meta.componentsLocation, cwd) : {}),
      nodes: componentNodes,
    });
  }

  const docDescription = meta.info ? buildDocDescription(meta.info) : undefined;

  return {
    docName: toRelativePath(rootDocument.source.absoluteRef, cwd),
    spec: specVersion,
    ...(docDescription ? { docDescription } : {}),
    structure,
  };
}

export function toRelativePath(absoluteRef: string, cwd: string): string {
  return isAbsoluteUrl(absoluteRef)
    ? absoluteRef
    : path.relative(cwd, absoluteRef).split(path.sep).join('/');
}

export function toFileRange(location: Location, cwd: string) {
  const lineCol = getContentLineColLocation({
    source: location.source,
    pointer: location.pointer,
    reportOnKey: false,
  });
  return {
    pointer: location.pointer,
    file: toRelativePath(location.source.absoluteRef, cwd),
    start_line: lineCol.start.line,
    // getContentLineColLocation always computes `end` for a string pointer.
    end_line: lineCol.end!.line,
  };
}

export function truncateSummary(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  if (normalized.length <= SUMMARY_LIMIT) return normalized;
  const cut = normalized.slice(0, SUMMARY_LIMIT);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

function buildDocDescription(docInfo: {
  title?: string;
  description?: string;
}): string | undefined {
  return truncateSummary([docInfo.title, docInfo.description].filter(Boolean).join(' — '));
}

function toOperationNode(operation: CollectedOperation, cwd: string): ApiIndexNode {
  const titleSuffix = truncateSummary(operation.summary);
  const summary = truncateSummary(operation.summary ?? operation.description);
  return {
    id: operation.id,
    title: titleSuffix ? `${operation.id} — ${titleSuffix}` : operation.id,
    ...(operation.operationId ? { operationId: operation.operationId } : {}),
    ...(operation.deprecated ? { deprecated: true } : {}),
    ...toFileRange(operation.location, cwd),
    ...(summary ? { summary } : {}),
  };
}

function groupByTags(
  operations: CollectedOperation[],
  declaredTags: ApiIndexMeta['declaredTags'],
  cwd: string
): ApiIndexNode[] {
  const groups = new Map<string, CollectedOperation[]>();
  for (const operation of operations) {
    const tagNames = operation.tags.length > 0 ? operation.tags : [UNTAGGED];
    for (const tagName of new Set(tagNames)) {
      const group = groups.get(tagName) ?? [];
      group.push(operation);
      groups.set(tagName, group);
    }
  }

  const orderedNames = [
    ...declaredTags.map((tag) => tag.name),
    ...[...groups.keys()].filter(
      (name) => name !== UNTAGGED && !declaredTags.some((tag) => tag.name === name)
    ),
    UNTAGGED,
  ];

  const nodes: ApiIndexNode[] = [];
  for (const name of orderedNames) {
    const groupOperations = groups.get(name);
    if (!groupOperations) continue;
    const declared = declaredTags.find((tag) => tag.name === name);
    const summary = truncateSummary(declared?.description);
    nodes.push({
      id: name,
      title: name,
      ...(declared ? toFileRange(declared.location, cwd) : {}),
      ...(summary ? { summary } : {}),
      nodes: groupOperations.map((operation) => toOperationNode(operation, cwd)),
    });
  }
  return nodes;
}

function groupByPaths(operations: CollectedOperation[], cwd: string): ApiIndexNode[] {
  const groups = new Map<string, { location: Location; operations: CollectedOperation[] }>();
  for (const operation of operations) {
    const group = groups.get(operation.containerKey) ?? {
      location: operation.pathItemLocation,
      operations: [],
    };
    group.operations.push(operation);
    groups.set(operation.containerKey, group);
  }
  return [...groups.entries()].map(([pathKey, group]) => ({
    id: pathKey,
    title: pathKey,
    ...toFileRange(group.location, cwd),
    nodes: group.operations.map((operation) => toOperationNode(operation, cwd)),
  }));
}

function groupComponents(components: CollectedComponent[], cwd: string): ApiIndexNode[] {
  const sections = [...new Set(components.map((component) => component.section))];
  sections.sort((a, b) => COMPONENT_SECTIONS.indexOf(a) - COMPONENT_SECTIONS.indexOf(b));
  return sections.map((section) => ({
    id: `components/${section}`,
    title: section,
    nodes: components
      .filter((component) => component.section === section)
      .map((component) => {
        const summary = truncateSummary(component.description);
        return {
          id: `${section}/${component.name}`,
          title: component.name,
          ...toFileRange(component.location, cwd),
          ...(summary ? { summary } : {}),
        };
      }),
  }));
}
