import {
  DEPS_CONTENT_CAP_BYTES,
  type ApiNodeEnvelope,
  type ApiOverview,
  type ComponentCard,
  type ComponentListCard,
  type FileCard,
  type OperationCard,
  type OperationListCard,
  type PathListItem,
  type TypedRef,
  type UsedByEntry,
  type UsedByReport,
} from '@redocly/openapi-core';

import type { TreeView } from '../index.js';
import type { TreeFormat } from '../types.js';
import { briefComponents, briefDefines, briefOperations } from './brief.js';

export function renderView(view: TreeView, format: TreeFormat): string {
  if (format === 'stylish') return renderViewStylish(view);
  const payload = viewPayload(view, format);
  return JSON.stringify(payload, null, format === 'brief' ? undefined : 2);
}

function viewPayload(view: TreeView, format: TreeFormat): unknown {
  const brief = format === 'brief';
  switch (view.kind) {
    case 'overview':
      return view.overview;
    case 'operations':
      return brief ? briefOperations(view.items) : view.items;
    case 'paths':
      return view.items;
    case 'components':
      return {
        section: view.section,
        items: brief ? briefComponents(view.items) : view.items,
      };
    case 'operation-card':
    case 'component-card':
      return view.card;
    case 'file-card':
      return brief ? { file: view.card.file, defines: briefDefines(view.card.defines) } : view.card;
    case 'used-by':
      return view.report;
  }
}

export function renderViewStylish(view: TreeView): string {
  switch (view.kind) {
    case 'overview':
      return renderOverview(view.overview, view.operations ?? [], view.webhookOperations ?? []);
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

/**
 * `METHOD /path — summary (operationId)` shared by the overview tree's operation leaves and the
 * card headline: omit whichever of path/summary/operationId is absent. `range` appends the
 * two-space-bracket line range used for a tree leaf; the card headline omits it (the card's
 * `source:` branch already carries the range).
 */
function operationLine(
  item: { method: string; path?: string; webhook?: string; summary?: string; operationId?: string },
  options: { includePath?: boolean; range?: { start_line: number; end_line: number } } = {}
): string {
  const path = options.includePath === false ? '' : ` ${item.path ?? item.webhook}`;
  const summary = item.summary ? ` — ${item.summary}` : '';
  const operationId = item.operationId ? ` (${item.operationId})` : '';
  const range = options.range ? `  [${options.range.start_line}..${options.range.end_line}]` : '';
  return `${item.method.toUpperCase()}${path}${summary}${operationId}${range}`;
}

function renderOverview(
  overview: ApiOverview,
  operations: OperationListCard[],
  webhookOperations: OperationListCard[]
): string {
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
    const operationsByTag = new Map<string, OperationListCard[]>();
    for (const operation of operations) {
      const tagNames = operation.tags.length > 0 ? operation.tags : ['untagged'];
      for (const tagName of tagNames) {
        const group = operationsByTag.get(tagName) ?? [];
        group.push(operation);
        operationsByTag.set(tagName, group);
      }
    }
    branches.push({
      label: `Operations (${overview.operations})`,
      children: overview.tags.map((tag) => ({
        label: `${tag.name} (${tag.operations})${tag.summary ? ` — ${tag.summary}` : ''}`,
        children: (operationsByTag.get(tag.name) ?? []).map((operation) => ({
          label: operationLine(operation, {
            range: { start_line: operation.start_line, end_line: operation.end_line },
          }),
        })),
      })),
    });
  }

  if (overview.webhooks.length > 0) {
    const operationsByWebhook = new Map<string, OperationListCard[]>();
    for (const operation of webhookOperations) {
      const key = operation.webhook ?? '';
      const group = operationsByWebhook.get(key) ?? [];
      group.push(operation);
      operationsByWebhook.set(key, group);
    }
    branches.push({
      label: `Webhooks (${overview.webhooks.length})`,
      children: overview.webhooks.map((webhook) => ({
        label: webhook.name,
        children: (operationsByWebhook.get(webhook.name) ?? []).map((operation) => ({
          label: operationLine(operation, {
            includePath: false,
            range: { start_line: operation.start_line, end_line: operation.end_line },
          }),
        })),
      })),
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
  const tree = [rootLabel, ...renderBranches(branches)].join('\n');
  // Collapsed mode: the wiring skips building operation cards past its expand limit,
  // so tag branches render without children and the reader needs the next step spelled out.
  if (operations.length === 0 && overview.operations > 0) {
    return `${tree}\n\n${overview.operations} operations across ${overview.tags.length} tags — expand one with \`--tag=<name>\`.`;
  }
  return tree;
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
  // no shared path or section header here, so each entry stays fully qualified on its own line,
  // using the same operation/component line conventions as the rest of this revision.
  if ('method' in entry) {
    return operationLine(entry, {
      range: { start_line: entry.start_line, end_line: entry.end_line },
    });
  }
  const summary = entry.summary ? ` — ${entry.summary}` : '';
  return `${entry.component}/${entry.name}${summary}  [${entry.start_line}..${entry.end_line}]`;
}

function renderFileCard(card: FileCard): string {
  const branches = card.defines.map((entry) => ({ label: fileDefineLabel(entry) }));
  return [card.file, ...renderBranches(branches)].join('\n');
}

/** deps' size cap, in KB, as displayed in a card's `deps (N, X KB of Y KB cap)` branch. */
const DEPS_CAP_KB = DEPS_CONTENT_CAP_BYTES / 1024;

function renderOperationCard(card: OperationCard): string {
  return [operationLine(card), ...renderBranches(cardBranches(card))].join('\n');
}

function renderComponentCard(card: ComponentCard): string {
  const summary = card.summary ? ` — ${card.summary}` : '';
  const header = `${card.component}/${card.name}${summary}`;
  return [header, ...renderBranches(cardBranches(card))].join('\n');
}

/**
 * A card renders as a pure glyph tree: no raw source or content anywhere in stylish, only
 * coordinates and typed edges — `source:` always, `refs`/`usedBy` one hop, and `deps` (the
 * transitive closure) when `--with-deps` populated it. Raw source stays JSON-only.
 */
function cardBranches(card: {
  file: string;
  pointer: string;
  start_line: number;
  end_line: number;
  refs: TypedRef[];
  usedBy: UsedByEntry[];
  deps?: ApiNodeEnvelope[];
  truncated?: boolean;
}): Branch[] {
  const branches: Branch[] = [
    { label: `source: ${card.file}${card.pointer}  [${card.start_line}..${card.end_line}]` },
  ];

  if (card.refs.length > 0) {
    branches.push({
      label: `refs (${card.refs.length})`,
      children: card.refs.map((ref) => ({ label: renderRef(ref) })),
    });
  }

  branches.push(
    card.usedBy.length > 0
      ? {
          label: `usedBy (${card.usedBy.length})`,
          children: card.usedBy.map((entry) => ({ label: renderUsedByRef(entry) })),
        }
      : { label: 'usedBy (none)' }
  );

  if (card.deps !== undefined) {
    const totalKB = (card.deps.reduce((sum, dep) => sum + dep.content.length, 0) / 1024).toFixed(1);
    const truncated = card.truncated ? ' (truncated)' : '';
    branches.push({
      label: `deps (${card.deps.length}, ${totalKB} KB of ${DEPS_CAP_KB} KB cap)${truncated}`,
      children: card.deps.map((dep) => ({
        label: `${dep.id} → ${dep.file}  [${dep.start_line}..${dep.end_line}]`,
      })),
    });
  }

  return branches;
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

/** A card's one-hop `refs` branch: `component/name → file#pointer  [lines]`, arrow-style. */
function renderRef(ref: TypedRef): string {
  if (!ref.resolved) return `${ref.ref} (unresolved)`;
  if (ref.component === 'unknown') {
    return `${ref.ref} → ${ref.file}  [${ref.start_line}..${ref.end_line}]`;
  }
  return `${ref.component}/${ref.name} → ${ref.file}${ref.pointer}  [${ref.start_line}..${ref.end_line}]`;
}

/** A card's one-hop `usedBy` branch: same arrow style as `refs`, keyed by the referrer's id. */
function renderUsedByRef(entry: UsedByEntry): string {
  if (entry.file === undefined) return entry.id;
  const range =
    entry.start_line !== undefined && entry.end_line !== undefined
      ? `  [${entry.start_line}..${entry.end_line}]`
      : '';
  return `${entry.id} → ${entry.file}${range}`;
}

/** Used by the `--used-by` report tree only — unrelated to a card's own `usedBy` branch above. */
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
