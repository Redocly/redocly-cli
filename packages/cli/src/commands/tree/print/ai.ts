import type {
  ApiOverview,
  ComponentCard,
  ComponentListCard,
  FileCard,
  FindReport,
  OperationCard,
  OperationListCard,
  PathListItem,
  TypedRef,
  UsedByEntry,
  UsedByReport,
} from '@redocly/openapi-core';

import type { TreeView } from '../index.js';
import {
  buildAiDepsClosure,
  buildNodeSignature,
  DEEPER_HINT,
  type AiDepEntry,
} from './signature.js';

const NEXT_HINT =
  'next: --find=<terms> · --tag=<name> · --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<n>';

/** Same file-spanning rule the stylish renderer uses: name files only when more than one is in play. */
function spansMultipleFiles(items: { file: string }[]): boolean {
  return new Set(items.map((item) => item.file)).size > 1;
}

export function renderAiView(view: TreeView): string {
  switch (view.kind) {
    case 'overview':
      return renderAiOverview(view.overview, view.operations, view.webhookOperations);
    case 'operations':
      return renderAiOperations(view.scope, view.items);
    case 'paths':
      return renderAiPaths(view.items);
    case 'components':
      return renderAiComponents(view.section, view.items);
    case 'find':
      return renderAiFind(view.report);
    case 'operation-card':
      return renderAiOperationCard(view.card);
    case 'component-card':
      return renderAiComponentCard(view.card);
    case 'file-card':
      return renderAiFileCard(view.card);
    case 'used-by':
      return renderAiUsedBy(view.report);
  }
}

export function aiOperationLine(item: OperationListCard, showFile: boolean): string {
  const target = item.path ?? `webhook ${item.webhook}`;
  const operationId = item.operationId ? ` · ${item.operationId}` : '';
  const deprecated = item.deprecated ? ' · deprecated' : '';
  const file = showFile ? ` · f:${item.file}` : '';
  const summary = item.summary ? ` — ${item.summary}` : '';
  return `${item.method} ${target}${operationId} · L${item.start_line}${deprecated}${file}${summary}`;
}

export function aiComponentLine(item: ComponentListCard, showFile: boolean): string {
  const file = showFile ? ` · f:${item.file}` : '';
  const summary = item.summary ? ` — ${item.summary}` : '';
  return `${item.component}/${item.name} · L${item.start_line}${file}${summary}`;
}

function renderAiOverview(
  overview: ApiOverview,
  operations?: OperationListCard[],
  webhookOperations?: OperationListCard[]
): string {
  const lines: string[] = [];
  const description = overview.docDescription ? ` — ${overview.docDescription}` : '';
  lines.push(`${overview.docName} · ${overview.spec}${description}`);
  if (overview.servers !== undefined && overview.servers.urls.length > 0) {
    lines.push(`servers: ${overview.servers.urls.join(', ')}`);
  }
  const webhookOperationCount = overview.webhooks.reduce(
    (total, webhook) => total + webhook.operations,
    0
  );
  lines.push(
    `${overview.operations} operations · ${overview.tags.length} tags` +
      (webhookOperationCount > 0 ? ` · ${webhookOperationCount} webhook operations` : '')
  );
  if (overview.components.length > 0) {
    lines.push(
      'components: ' +
        overview.components
          .map((component) => `${component.section} ${component.count}`)
          .join(' · ')
    );
  }

  const expanded = operations !== undefined && operations.length > 0;
  if (!expanded) {
    if (overview.tags.length > 0) {
      lines.push(
        'tags: ' + overview.tags.map((tag) => `${tag.name} ${tag.operations}`).join(' · ')
      );
    }
    if (overview.webhooks.length > 0) {
      lines.push(`webhooks: ${overview.webhooks.length} (list: --webhooks)`);
    }
    lines.push(NEXT_HINT);
    return lines.join('\n');
  }

  // Small API: the whole surface fits — render operation lines grouped by tag, then webhooks.
  const showFile = spansMultipleFiles(operations);
  const operationsByTag = new Map<string, OperationListCard[]>();
  for (const operation of operations) {
    const tagNames = operation.tags.length > 0 ? operation.tags : ['untagged'];
    for (const tagName of tagNames) {
      const group = operationsByTag.get(tagName) ?? [];
      group.push(operation);
      operationsByTag.set(tagName, group);
    }
  }
  for (const tag of overview.tags) {
    const group = operationsByTag.get(tag.name) ?? [];
    lines.push(`tag ${tag.name} (${group.length}):`);
    for (const operation of group) lines.push(aiOperationLine(operation, showFile));
  }
  if (webhookOperations !== undefined && webhookOperations.length > 0) {
    const showWebhookFile = spansMultipleFiles(webhookOperations);
    lines.push(`webhooks (${webhookOperations.length}):`);
    for (const operation of webhookOperations) {
      lines.push(aiOperationLine(operation, showWebhookFile));
    }
  }
  lines.push(NEXT_HINT);
  return lines.join('\n');
}

function renderAiOperations(scope: string | undefined, items: OperationListCard[]): string {
  const showFile = spansMultipleFiles(items);
  const header = `${scope ?? 'operations'} · ${items.length} operations`;
  return [header, ...items.map((item) => aiOperationLine(item, showFile))].join('\n');
}

function renderAiPaths(items: PathListItem[]): string {
  const showFile = spansMultipleFiles(items);
  const lines = items.map((item) => {
    const file = showFile ? ` · f:${item.file}` : '';
    return `${item.path} · ${item.methods.join(',')} · L${item.start_line}${file}`;
  });
  return [`paths · ${items.length}`, ...lines].join('\n');
}

function renderAiComponents(section: string, items: ComponentListCard[]): string {
  const showFile = spansMultipleFiles(items);
  return [
    `${section} · ${items.length} components`,
    ...items.map((item) => aiComponentLine(item, showFile)),
  ].join('\n');
}

function renderAiFind(report: FindReport): string {
  const lines: string[] = [
    `find "${report.terms.join(' ')}" · ${report.totalOperations} operations · ${report.totalComponents} components`,
  ];
  const showOperationFile = spansMultipleFiles(report.operations);
  for (const operation of report.operations) {
    lines.push(aiOperationLine(operation, showOperationFile));
  }
  const showComponentFile = spansMultipleFiles(report.components);
  for (const component of report.components) {
    lines.push(aiComponentLine(component, showComponentFile));
  }
  const moreOperations = report.totalOperations - report.operations.length;
  const moreComponents = report.totalComponents - report.components.length;
  if (moreOperations > 0 || moreComponents > 0) {
    const parts = [
      moreOperations > 0 ? `${moreOperations} more operations` : '',
      moreComponents > 0 ? `${moreComponents} more components` : '',
    ].filter(Boolean);
    lines.push(`… ${parts.join(', ')} — narrow the terms.`);
  }
  if (report.totalOperations === 0 && report.totalComponents === 0) lines.push('Nothing matched.');
  return lines.join('\n');
}

function aiCardHeader(card: OperationCard): string {
  const operationId = card.operationId ? ` · ${card.operationId}` : '';
  const tags = card.tags.length > 0 ? ` · tags: ${card.tags.join(', ')}` : '';
  const deprecated = card.deprecated ? ' · deprecated' : '';
  const summary = card.summary ? ` — ${card.summary}` : '';
  const target = card.path ?? `webhook ${card.webhook}`;
  return `${card.method} ${target}${operationId} · ${card.file} L${card.start_line}-${card.end_line}${tags}${deprecated}${summary}`;
}

function aiDepLine(dep: AiDepEntry, cardFile: string): string {
  const file = dep.file === cardFile ? '' : ` · f:${dep.file}`;
  const signature = dep.signature ? `: ${dep.signature}` : '';
  return `${dep.id} L${dep.start_line}-${dep.end_line}${file}${signature}`;
}

/** refs compact line for a card without a deps closure: typed ids with a start line each. */
function aiRefsLine(refs: TypedRef[]): string {
  const labels = refs.map((ref) => {
    if (!ref.resolved) return `${ref.ref} (unresolved)`;
    const name = ref.component !== 'unknown' ? `${ref.component}/${ref.name}` : ref.ref;
    return ref.start_line !== undefined ? `${name} L${ref.start_line}` : name;
  });
  return `refs: ${labels.join(' · ')}`;
}

function aiCardBody(card: OperationCard | ComponentCard): string[] {
  const lines: string[] = [];
  if (card.content !== undefined) lines.push('--- yaml', card.content.trimEnd());
  if (card.deps !== undefined) {
    const closure = buildAiDepsClosure(card.deps, card.refs);
    const truncated = card.truncated ? ', truncated at 64 KB' : '';
    lines.push(`--- deps (${closure.deps.length}, signatures depth ≤2${truncated})`);
    for (const dep of closure.deps) lines.push(aiDepLine(dep, card.file));
    if (closure.deeper.length > 0) {
      lines.push(`deeper: ${closure.deeper.join(' · ')}`);
      lines.push(`hint: ${DEEPER_HINT}`);
    }
  } else if (card.refs.length > 0) {
    lines.push(aiRefsLine(card.refs));
  }
  if (card.usedBy.length > 0) lines.push(`usedBy: ${card.usedBy.length} (--used-by)`);
  return lines;
}

function renderAiOperationCard(card: OperationCard): string {
  return [aiCardHeader(card), ...aiCardBody(card)].join('\n');
}

function renderAiComponentCard(card: ComponentCard): string {
  const summary = card.summary ? ` — ${card.summary}` : '';
  const header = `${card.component}/${card.name} · ${card.file} L${card.start_line}-${card.end_line}${summary}`;
  const lines = [header];
  if (card.content !== undefined) {
    const signature = buildNodeSignature(card.component, card.content, card.refs);
    if (signature) lines.push(`signature: ${signature}`);
  }
  lines.push(...aiCardBody(card));
  return lines.join('\n');
}

function renderAiFileCard(card: FileCard): string {
  const lines = [`file ${card.file} · defines ${card.defines.length}`];
  for (const entry of card.defines) {
    lines.push('method' in entry ? aiOperationLine(entry, false) : aiComponentLine(entry, false));
  }
  return lines.join('\n');
}

function renderAiUsedBy(report: UsedByReport): string {
  const target = report.target;
  const targetLabel =
    target.method !== undefined
      ? `${target.method} ${target.path ?? target.webhook}`
      : target.component !== undefined
        ? `${target.component}/${target.name}`
        : target.id;
  const coordinates =
    target.file !== undefined && target.start_line !== undefined
      ? ` · ${target.file} L${target.start_line}-${target.end_line}`
      : '';
  const lines = [`used-by ${targetLabel}${coordinates}`];

  const entryLine = (entry: UsedByEntry & { via: string[] }): string => {
    const label =
      entry.method !== undefined
        ? `${entry.method} ${entry.path ?? entry.webhook}`
        : `${entry.component}/${entry.name}`;
    const line = entry.start_line !== undefined ? ` · L${entry.start_line}` : '';
    const file = entry.file !== undefined && entry.file !== target.file ? ` · f:${entry.file}` : '';
    const via = entry.via.length > 0 ? ` via ${entry.via.join(' → ')}` : '';
    return `${label}${line}${file}${via}`;
  };

  if (report.affectedOperations.length > 0) {
    lines.push(`operations (${report.affectedOperations.length}):`);
    for (const entry of report.affectedOperations) lines.push(entryLine(entry));
  }
  if (report.affectedComponents.length > 0) {
    lines.push(`components (${report.affectedComponents.length}):`);
    for (const entry of report.affectedComponents) lines.push(entryLine(entry));
  }
  if (report.affectedOperations.length === 0 && report.affectedComponents.length === 0) {
    lines.push('Nothing references it.');
  }
  return lines.join('\n');
}
