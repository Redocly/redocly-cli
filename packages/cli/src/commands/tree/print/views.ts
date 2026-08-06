import type {
  ApiNodeEnvelope,
  ApiOverview,
  ComponentCard,
  ComponentListCard,
  FileCard,
  OperationCard,
  OperationListCard,
  PathListItem,
  TypedRef,
  UsedByEntry,
  UsedByReport,
} from '@redocly/openapi-core';

import type { TreeView } from '../index.js';
import type { TreeFormat } from '../types.js';

export function renderView(view: TreeView, format: TreeFormat): string {
  const payload = viewPayload(view);
  if (format === 'json') return JSON.stringify(payload, null, 2);
  return renderViewStylish(view);
}

function viewPayload(view: TreeView): unknown {
  switch (view.kind) {
    case 'overview':
      return view.overview;
    case 'operations':
      return view.items;
    case 'paths':
      return view.items;
    case 'components':
      return { section: view.section, items: view.items };
    case 'operation-card':
    case 'component-card':
      return view.card;
    case 'file-card':
      return view.card;
    case 'used-by':
      return view.report;
  }
}

export function renderViewStylish(view: TreeView): string {
  switch (view.kind) {
    case 'overview':
      return renderOverview(view.overview);
    case 'operations':
      return renderOperationsListing(view.items);
    case 'paths':
      return renderPathsListing(view.items);
    case 'components':
      return renderComponentsListing(view.section, view.items);
    case 'operation-card':
      return renderOperationCard(view.card);
    case 'component-card':
      return renderComponentCard(view.card);
    case 'file-card':
      return renderFileCard(view.card);
    case 'used-by':
      return renderUsedByReport(view.report);
  }
}

/** A label with optional children, rendered with the same branch glyphs as the file graph tree. */
type Branch = { label: string; children?: Branch[] };

function renderBranches(branches: Branch[], prefix = ''): string[] {
  const lines: string[] = [];
  branches.forEach((branch, index) => {
    const isLast = index === branches.length - 1;
    lines.push(`${prefix}${isLast ? '└── ' : '├── '}${branch.label}`);
    if (branch.children && branch.children.length > 0) {
      lines.push(...renderBranches(branch.children, `${prefix}${isLast ? '    ' : '│   '}`));
    }
  });
  return lines;
}

function renderOverview(overview: ApiOverview): string {
  const description = overview.docDescription ? ` — ${overview.docDescription}` : '';
  const rootLabel = `${overview.docName}${description}  (${overview.spec})`;

  const branches: Branch[] = [];

  if (overview.servers && overview.servers.urls.length > 0) {
    branches.push({
      label: 'Servers',
      children: overview.servers.urls.map((url) => ({ label: url })),
    });
  }

  if (overview.tags.length > 0) {
    branches.push({
      label: `Operations (${overview.operations})`,
      children: overview.tags.map((tag) => ({
        label: `${tag.name} (${tag.operations})${tag.summary ? ` — ${tag.summary}` : ''}`,
      })),
    });
  }

  if (overview.webhooks.length > 0) {
    branches.push({
      label: `Webhooks (${overview.webhooks.length})`,
      children: overview.webhooks.map((webhook) => ({ label: webhook.name })),
    });
  }

  if (overview.components.length > 0) {
    const total = overview.components.reduce((sum, component) => sum + component.count, 0);
    branches.push({
      label: `Components (${total})`,
      children: overview.components.map((component) => ({
        label: `${component.section} (${component.count})`,
      })),
    });
  }

  if (branches.length === 0) return rootLabel;
  return [rootLabel, ...renderBranches(branches)].join('\n');
}

function operationEntryLabel(
  item: OperationListCard,
  options: { showFile?: boolean; showPath?: boolean } = {}
): string {
  const summary = item.summary ? ` "${item.summary}"` : '';
  const range = options.showFile
    ? `${item.file}:${item.start_line}..${item.end_line}`
    : `${item.start_line}..${item.end_line}`;
  const pathPrefix = options.showPath ? ` ${item.path ?? item.webhook}` : '';
  return `${item.method.toUpperCase()}${pathPrefix}${summary} ${range} [${item.tags.join(', ')}]`;
}

function renderOperationsListing(items: OperationListCard[]): string {
  const groups = new Map<string, OperationListCard[]>();
  for (const item of items) {
    const key = item.path ?? item.webhook ?? '';
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  // A multi-file layout scatters operations across files, so the range alone no longer says
  // where a line actually lives; a single-file listing keeps the plain range unchanged.
  const showFile = new Set(items.map((item) => item.file)).size > 1;
  const blocks = [...groups.entries()].map(([groupKey, groupItems]) => {
    const branches = groupItems.map((item) => ({ label: operationEntryLabel(item, { showFile }) }));
    return [`${groupKey} (${groupItems.length})`, ...renderBranches(branches)].join('\n');
  });

  return blocks.join('\n\n');
}

function renderPathsListing(items: PathListItem[]): string {
  return items
    .map(
      (item) => `${item.path}  [${item.methods.join(', ')}]  ${item.start_line}..${item.end_line}`
    )
    .join('\n');
}

function componentEntryLabel(item: ComponentListCard, showFile: boolean): string {
  const summary = item.summary ? ` "${item.summary}"` : '';
  const range = showFile
    ? `${item.file}:${item.start_line}..${item.end_line}`
    : `${item.start_line}..${item.end_line}`;
  return `${item.name}${summary} ${range}`;
}

function renderComponentsListing(section: string, items: ComponentListCard[]): string {
  // Same rule as the operations listing: only call out the file once more than one is in play.
  const showFile = new Set(items.map((item) => item.file)).size > 1;
  const branches = items.map((item) => ({ label: componentEntryLabel(item, showFile) }));
  return [`${section} (${items.length})`, ...renderBranches(branches)].join('\n');
}

function fileDefineLabel(entry: OperationListCard | ComponentListCard): string {
  // Every entry a file card lists is defined in that same file, already named at the tree root,
  // so entry lines never need their own file prefix. Unlike the grouped listings above, there is
  // no shared path or section header here, so each entry stays fully qualified on its own line.
  if ('method' in entry) return operationEntryLabel(entry, { showPath: true });
  const summary = entry.summary ? ` "${entry.summary}"` : '';
  return `${entry.component}/${entry.name}${summary} ${entry.start_line}..${entry.end_line}`;
}

function renderFileCard(card: FileCard): string {
  const branches = card.defines.map((entry) => ({ label: fileDefineLabel(entry) }));
  return [card.file, ...renderBranches(branches)].join('\n');
}

function renderOperationCard(card: OperationCard): string {
  const operationId = card.operationId ? ` (${card.operationId})` : '';
  const header = `${card.method.toUpperCase()} ${card.path ?? card.webhook}${operationId}`;
  return [header, ...renderCardBody(card), ...renderCardRetrieval(card)].join('\n');
}

function renderComponentCard(card: ComponentCard): string {
  const header = `${card.component}/${card.name}`;
  return [header, ...renderCardBody(card), ...renderCardRetrieval(card)].join('\n');
}

function renderCardBody(card: {
  file: string;
  pointer: string;
  start_line: number;
  end_line: number;
  summary?: string;
  refs: TypedRef[];
  usedBy: UsedByEntry[];
}): string[] {
  const lines = [
    `file: ${card.file}${card.pointer}`,
    `lines: ${card.start_line}..${card.end_line}`,
  ];

  if (card.summary) lines.push(`summary: ${card.summary}`);

  if (card.refs.length > 0) {
    lines.push('refs:');
    lines.push(...renderBranches(card.refs.map((ref) => ({ label: renderRef(ref) }))));
  }

  if (card.usedBy.length > 0) {
    lines.push('usedBy:');
    lines.push(
      ...renderBranches(card.usedBy.map((entry) => ({ label: renderUsedByEntry(entry) })))
    );
  } else {
    lines.push('usedBy: (none)');
  }

  return lines;
}

/** `--with-deps` retrieval fields, appended after the card block: raw source, then a deps tree. */
function renderCardRetrieval(card: {
  content?: string;
  deps?: ApiNodeEnvelope[];
  truncated?: boolean;
}): string[] {
  if (card.content === undefined) return [];

  const deps = card.deps ?? [];
  const depsSuffix = card.truncated ? ' (truncated)' : deps.length === 0 ? ' (none)' : '';
  const lines = ['', 'content:', ...card.content.split('\n').map((line) => `  ${line}`)];
  lines.push('', `deps:${depsSuffix}`);
  if (deps.length > 0) {
    lines.push(
      ...renderBranches(
        deps.map((dep) => ({
          label: `${dep.id}  ${dep.file}:${dep.start_line}..${dep.end_line}`,
        }))
      )
    );
  }

  return lines;
}

function renderUsedByReport(report: UsedByReport): string {
  const branches: Branch[] = [];

  if (report.affectedOperations.length > 0) {
    branches.push({
      label: `Affected operations (${report.affectedOperations.length})`,
      children: report.affectedOperations.map((entry) => ({ label: renderUsedByEntry(entry) })),
    });
  }

  if (report.affectedComponents.length > 0) {
    branches.push({
      label: `Affected components (${report.affectedComponents.length})`,
      children: report.affectedComponents.map((entry) => ({ label: renderUsedByEntry(entry) })),
    });
  }

  const rootLabel = renderUsedByEntry(report.target);
  if (branches.length === 0) return `${rootLabel}\nNothing references it.`;
  return [rootLabel, ...renderBranches(branches)].join('\n');
}

function renderRef(ref: TypedRef): string {
  if (!ref.resolved) return `${ref.ref} (unresolved)`;
  const label = ref.component !== 'unknown' ? `${ref.component}/${ref.name}` : ref.ref;
  return `${label}  ${ref.pointer}  ${ref.start_line}..${ref.end_line}`;
}

function renderUsedByEntry(entry: UsedByEntry): string {
  const label =
    entry.method !== undefined
      ? `${entry.method.toUpperCase()} ${entry.path ?? entry.webhook}`
      : entry.component !== undefined
        ? `${entry.component}/${entry.name}`
        : entry.id;
  if (
    entry.pointer === undefined ||
    entry.start_line === undefined ||
    entry.end_line === undefined
  ) {
    return label;
  }
  return `${label}  ${entry.pointer}  ${entry.start_line}..${entry.end_line}`;
}
