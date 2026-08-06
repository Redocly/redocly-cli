import type {
  ApiOverview,
  ComponentCard,
  ComponentListItem,
  OperationCard,
  OperationListItem,
  PathListItem,
  TypedRef,
  UsedByEntry,
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
    case 'used-by':
      // Never reached from the real CLI: handleStructureMode renders stylish used-by through the
      // reverse-closure graph tree (renderStylish) before renderView is called. JSON stays the
      // only format for this kind here.
      return JSON.stringify(view.report, null, 2);
  }
}

function renderOverview(overview: ApiOverview): string {
  const lines = [`${overview.docDescription ?? overview.docName}  (${overview.spec})`];

  if (overview.servers && overview.servers.urls.length > 0) {
    lines.push(`Servers: ${overview.servers.urls.join(', ')}`);
  }

  if (overview.tags.length > 0) {
    const tagWord = overview.tags.length === 1 ? 'tag' : 'tags';
    lines.push(`Operations: ${overview.operations} across ${overview.tags.length} ${tagWord}`);
    for (const tag of overview.tags) {
      const summary = tag.summary ? ` — ${tag.summary}` : '';
      lines.push(`  ${tag.name} (${tag.operations})${summary}`);
    }
  }

  lines.push(`Webhooks: ${overview.webhooks}`);

  if (overview.components.length > 0) {
    const sections = overview.components
      .map((component) => `${component.section} ${component.count}`)
      .join(' · ');
    lines.push(`Components: ${sections}`);
  }

  return lines.join('\n');
}

function renderOperationsListing(items: OperationListItem[]): string {
  const groups = new Map<string, OperationListItem[]>();
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
    const operationLines = groupItems.map((item) => {
      const summary = item.summary ? ` "${item.summary}"` : '';
      const range = showFile
        ? `${item.file}:${item.start_line}..${item.end_line}`
        : `${item.start_line}..${item.end_line}`;
      return `  ${item.method.toUpperCase()}${summary} ${range} [${item.tags.join(', ')}]`;
    });
    return [groupKey, ...operationLines].join('\n');
  });

  return blocks.join('\n');
}

function renderPathsListing(items: PathListItem[]): string {
  return items
    .map(
      (item) => `${item.path}  [${item.methods.join(', ')}]  ${item.start_line}..${item.end_line}`
    )
    .join('\n');
}

function renderComponentsListing(section: string, items: ComponentListItem[]): string {
  const lines = [`${section}:`];
  // Same rule as the operations listing: only call out the file once more than one is in play.
  const showFile = new Set(items.map((item) => item.file)).size > 1;
  for (const item of items) {
    const summary = item.summary ? ` "${item.summary}"` : '';
    const range = showFile
      ? `${item.file}:${item.start_line}..${item.end_line}`
      : `${item.start_line}..${item.end_line}`;
    lines.push(`  ${item.name}${summary} ${range}`);
  }
  return lines.join('\n');
}

function renderOperationCard(card: OperationCard): string {
  const operationId = card.operationId ? ` (${card.operationId})` : '';
  const header = `${card.method.toUpperCase()} ${card.path ?? card.webhook}${operationId}`;
  return [header, ...renderCardBody(card)].join('\n');
}

function renderComponentCard(card: ComponentCard): string {
  const header = `${card.component}/${card.name}`;
  return [header, ...renderCardBody(card)].join('\n');
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
    for (const ref of card.refs) lines.push(`  - ${renderRef(ref)}`);
  }

  if (card.usedBy.length > 0) {
    lines.push('usedBy:');
    for (const entry of card.usedBy) lines.push(`  - ${renderUsedByEntry(entry)}`);
  } else {
    lines.push('usedBy: (none)');
  }

  return lines;
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
