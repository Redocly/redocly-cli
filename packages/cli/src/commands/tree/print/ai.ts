import type {
  ApiOverview,
  ComponentListCard,
  FindReport,
  OperationListCard,
  PathListItem,
} from '@redocly/openapi-core';

import type { TreeView } from '../index.js';

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
    // Cards and used-by move to text in the next task; see renderView for the interim JSON path.
    default:
      throw new Error(`No ai renderer for view kind "${view.kind}".`);
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
