import {
  isPlainObject,
  type ApiOverview,
  type DependencyGraph,
  type SecurityView,
  type ComponentCard,
  type ComponentListCard,
  type FileCard,
  type FindReport,
  type OperationCard,
  type OperationListCard,
  type TypedRef,
  type UsedByEntry,
  type UsedByReport,
} from '@redocly/openapi-core';

import type { PointerCard, TreeView } from '../index.js';
import {
  buildAiDepsClosure,
  buildNodeSignature,
  parseNodeContent,
  type AiDepEntry,
} from './signature.js';

const NEXT_HINT =
  'next: --find=<terms> · --tag=<name> · --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<n>';

/** Same file-spanning rule the stylish renderer uses: name files only when more than one is in play. */
function spansMultipleFiles(items: { file: string }[]): boolean {
  return new Set(items.map((item) => item.file)).size > 1;
}

/** Pluralizes a unit noun for a count: `count(1, 'operation')` → `1 operation`, `count(3, 'operation')` → `3 operations`. */
function count(total: number, unit: string): string {
  return `${total} ${unit}${total === 1 ? '' : 's'}`;
}

export function renderAiView(view: TreeView): string {
  switch (view.kind) {
    case 'overview':
      return renderAiOverview(view.overview, view.operations, view.webhookOperations);
    case 'operations':
      return renderAiOperations(view.scope, view.items);
    case 'tags':
      return [
        `tags · ${count(view.items.length, 'tag')}`,
        ...view.items.map((tag) => {
          const summary = tag.summary ? ` — ${tag.summary}` : '';
          return `${tag.name} · ${count(tag.operations, 'operation')}${summary}`;
        }),
        'next: --tag=<name>',
      ].join('\n');
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
    case 'pointer-card':
      return renderAiPointerCard(view.card);
    case 'used-by':
      return renderAiUsedBy(view.report);
  }
}

function aiOperationLine(item: OperationListCard, showFile: boolean): string {
  const target = item.path ?? `webhook ${item.webhook}`;
  const operationId = item.operationId ? ` · ${item.operationId}` : '';
  const deprecated = item.deprecated ? ' · deprecated' : '';
  const file = showFile ? ` · f:${item.file}` : '';
  const summary = item.summary ? ` — ${item.summary}` : '';
  return `${item.method} ${target}${operationId} · L${item.start_line}${deprecated}${file}${summary}`;
}

function aiComponentLine(item: ComponentListCard, showFile: boolean): string {
  const file = showFile ? ` · f:${item.file}` : '';
  const summary = item.summary ? ` — ${item.summary}` : '';
  return `${item.component}/${item.name} · L${item.start_line}${file}${summary}`;
}

/**
 * What the caller has to send to be let in, resolved from the scheme's own definition: a
 * requirement names a scheme, and the name alone does not say which header carries the key.
 * Alternatives are separated by `|`, and schemes that must be satisfied together by `+`.
 */
function aiSecurityLine(label: string, security: SecurityView): string {
  const detailOf = new Map(
    security.schemes.map((scheme) => {
      if (scheme.type === 'apiKey' && scheme.in && scheme.keyName) {
        return [scheme.name, `apiKey in ${scheme.in} ${scheme.keyName}`];
      }
      if (scheme.type === 'http' && scheme.scheme) return [scheme.name, `http ${scheme.scheme}`];
      return [scheme.name, scheme.type ?? ''];
    })
  );
  const alternatives = security.requirements.map((requirement) => {
    const names = Object.keys(requirement);
    if (names.length === 0) return 'none';
    return names
      .map((name) => {
        const detail = detailOf.get(name);
        const scopes = requirement[name].length > 0 ? ` (${requirement[name].join(' ')})` : '';
        return `${name}${detail ? ` · ${detail}` : ''}${scopes}`;
      })
      .join(' + ');
  });
  return `${label}: ${alternatives.join(' | ')}`;
}

/** Above this many files the graph collapses to per-directory counts, as the overview does for tags. */
const FILE_GRAPH_EXPAND_LIMIT = 40;
const FILE_GRAPH_DIRECTORY_LIMIT = 20;

/**
 * The file graph for an agent: a description split into thousands of files has a graph whose full
 * node-and-link dump is larger than most of the description, so past a threshold it collapses to
 * directory counts — the same trade the overview makes when it stops listing every operation.
 * `--format=json` still returns the whole graph for tooling.
 */
export function renderAiFileGraph(graph: DependencyGraph): string {
  const unresolved = graph.nodes.filter((node) => !node.resolved).length;
  const external = graph.nodes.filter((node) => node.external).length;
  const lines = [
    `files · ${count(graph.nodes.length, 'file')} · ${count(graph.edges.length, 'link')}` +
      (external > 0 ? ` · ${count(external, 'external file')}` : '') +
      (unresolved > 0 ? ` · ${count(unresolved, 'unresolved ref')}` : ''),
  ];
  if (graph.roots.length > 0) lines.push(`root: ${graph.roots.join(' · ')}`);

  if (graph.nodes.length <= FILE_GRAPH_EXPAND_LIMIT) {
    const outgoing = new Map<string, number>();
    for (const edge of graph.edges) outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    for (const node of graph.nodes) {
      const links = outgoing.get(node.id) ?? 0;
      const marks =
        (node.external === true ? ' · external' : '') + (node.resolved ? '' : ' · unresolved');
      lines.push(`${node.id}${links > 0 ? ` · ${count(links, 'ref')}` : ''}${marks}`);
    }
  } else {
    const byDirectory = new Map<string, number>();
    for (const node of graph.nodes) {
      const slash = node.id.lastIndexOf('/');
      const directory = slash === -1 ? '.' : node.id.slice(0, slash);
      byDirectory.set(directory, (byDirectory.get(directory) ?? 0) + 1);
    }
    const ordered = [...byDirectory].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    );
    lines.push(
      'directories: ' +
        ordered
          .slice(0, FILE_GRAPH_DIRECTORY_LIMIT)
          .map(([directory, total]) => `${directory} ${total}`)
          .join(' · ')
    );
    if (ordered.length > FILE_GRAPH_DIRECTORY_LIMIT) {
      const rest = ordered.length - FILE_GRAPH_DIRECTORY_LIMIT;
      lines.push(`… ${rest} more director${rest === 1 ? 'y' : 'ies'}`);
    }
  }
  lines.push('next: --file=<path> [--used-by] · --files --format=json for the whole graph');
  return lines.join('\n');
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
  if (overview.security !== undefined) {
    lines.push(aiSecurityLine('security', overview.security));
  }
  const webhookOperationCount = overview.webhooks.reduce(
    (total, webhook) => total + webhook.operations,
    0
  );
  lines.push(
    `${count(overview.operations, 'operation')} · ${count(overview.tags.length, 'tag')}` +
      (webhookOperationCount > 0 ? ` · ${count(webhookOperationCount, 'webhook operation')}` : '')
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

const OPERATION_NEXT_HINT = 'next: --path=<p> --operation=<method> [--with-deps]';

function renderAiOperations(scope: string | undefined, items: OperationListCard[]): string {
  const showFile = spansMultipleFiles(items);
  const header = `${scope ?? 'operations'} · ${count(items.length, 'operation')}`;
  return [
    header,
    ...items.map((item) => aiOperationLine(item, showFile)),
    OPERATION_NEXT_HINT,
  ].join('\n');
}

function renderAiComponents(section: string, items: ComponentListCard[]): string {
  const showFile = spansMultipleFiles(items);
  return [
    `${section} · ${count(items.length, 'component')}`,
    ...items.map((item) => aiComponentLine(item, showFile)),
    `next: --component=${section} --name=<Name> [--with-deps]`,
  ].join('\n');
}

function renderAiFind(report: FindReport): string {
  const lines: string[] = [
    `find "${report.terms.join(' ')}" · ${count(report.totalOperations, 'operation')} · ${count(report.totalComponents, 'component')}`,
  ];
  const showFile = spansMultipleFiles([...report.operations, ...report.components]);
  for (const operation of report.operations) {
    lines.push(aiOperationLine(operation, showFile));
  }
  for (const component of report.components) {
    lines.push(aiComponentLine(component, showFile));
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
  if (report.totalOperations === 0 && report.totalComponents === 0) {
    lines.push('Nothing matched.', 'next: --find=<fewer or different terms> · --tag=<name>');
  } else {
    lines.push(`${OPERATION_NEXT_HINT} · --component=<section> --name=<Name>`);
  }
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
  // A dependency that is a whole file carries that path as its id; naming the file again after it
  // says the same thing twice.
  const file = dep.file === cardFile || dep.file === dep.id ? '' : ` · f:${dep.file}`;
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

/**
 * Absolute source range of a top-level `x-*` key's block, found by scanning the RAW content lines
 * (not the parsed object): from the key's own line up to, but excluding, the next non-blank line
 * at or above the body's own indent — its next sibling, or, thanks to the known range quirk (see
 * `parseNodeContent`), the following node's first line, which always lands at that same shallow
 * indent.
 */
function vendorKeyRange(
  key: string,
  rawLines: string[],
  baseIndent: number,
  startLine: number
): { start_line: number; end_line: number } | undefined {
  const keyPattern = new RegExp(`^ {${baseIndent}}${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`);
  const startIndex = rawLines.findIndex((line) => keyPattern.test(line));
  if (startIndex === -1) return undefined;

  let endIndex = rawLines.length;
  for (let index = startIndex + 1; index < rawLines.length; index++) {
    if (rawLines[index].trim() === '') continue;
    if (rawLines[index].match(/^ */)![0].length <= baseIndent) {
      endIndex = index;
      break;
    }
  }
  return { start_line: startLine + startIndex, end_line: startLine + endIndex - 1 };
}

/**
 * A card's body as minified JSON: the same parser dep signatures use, so every value survives
 * except what `compactBody` trims — long prose and error responses — and YAML comments. Top-level `x-*` vendor keys fold to an `"omitted (L<start>-<end>)"`
 * marker instead of their full value (those blocks dominate a card's size — see the design doc);
 * a vendor key the raw-line scan can't locate folds to plain `"omitted"`. Returns undefined when
 * the content doesn't parse, so the caller falls back to the raw `--- yaml` block.
 */
/** A node's own prose earns more room than the prose on a field inside it. */
const OWN_DESCRIPTION_LIMIT = 600;
const FIELD_DESCRIPTION_LIMIT = 120;

/** Keeps whole sentences up to `limit`: in an API description the operative detail — the host to
 * call, the header to send — usually sits past the opening sentence, so cutting at a character
 * count would drop exactly the part worth keeping. */
function clipSentences(value: string, limit: number): string {
  if (value.length <= limit) return value;
  let kept = '';
  for (const sentence of value.trim().split(/(?<=[.!?])\s+/)) {
    if (kept.length > 0 && kept.length + 1 + sentence.length > limit) break;
    kept = kept.length > 0 ? `${kept} ${sentence}` : sentence;
  }
  return `${kept.length > 0 ? kept : value.slice(0, limit).trimEnd()} …`;
}

/**
 * Trims what a card body carries for reading rather than for calling: prose is clipped, and error
 * responses fold to an `errors` list, since they are the shared `$ref`s every operation repeats.
 * Both are what an agent pays for and does not use — a third of a card's bytes on large
 * descriptions (see the benchmark guide).
 */
function compactBody(node: unknown, depth: number): unknown {
  if (Array.isArray(node)) return node.map((item) => compactBody(item, depth));
  if (!isPlainObject(node)) return node;

  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'description' && typeof value === 'string') {
      compacted[key] = clipSentences(
        value,
        depth === 0 ? OWN_DESCRIPTION_LIMIT : FIELD_DESCRIPTION_LIMIT
      );
    } else if (key === 'responses' && isPlainObject(value)) {
      compacted[key] = compactResponses(value, depth);
    } else {
      compacted[key] = compactBody(value, depth + 1);
    }
  }
  return compacted;
}

/** Successful responses in full; the error ones as the bare list of codes they answer with. */
function compactResponses(
  responses: Record<string, unknown>,
  depth: number
): Record<string, unknown> {
  const compacted: Record<string, unknown> = {};
  const errorCodes: string[] = [];
  for (const [code, response] of Object.entries(responses)) {
    if (code.startsWith('2') || code === 'default') {
      compacted[code] = compactBody(response, depth + 1);
    } else {
      errorCodes.push(code);
    }
  }
  if (errorCodes.length > 0) compacted.errors = errorCodes.join(', ');
  return compacted;
}

function renderCardBodyJson(content: string, startLine: number): string | undefined {
  const parsed = parseNodeContent(content);
  if (parsed === undefined) return undefined;

  const rawLines = content.split('\n');
  // parseNodeContent already proved at least one non-blank line exists in this same content.
  const baseIndent = rawLines.find((line) => line.trim().length > 0)!.match(/^ */)![0].length;

  const folded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.startsWith('x-')) {
      folded[key] = value;
      continue;
    }
    const range = vendorKeyRange(key, rawLines, baseIndent, startLine);
    folded[key] = range ? `omitted (L${range.start_line}-${range.end_line})` : 'omitted';
  }
  return JSON.stringify(compactBody(folded, 0));
}

function aiCardBody(card: OperationCard | ComponentCard): string[] {
  const lines: string[] = [];
  // An operation that states no requirement of its own inherits the root one, which its source
  // does not show: without this line the caller has to know to go looking for it.
  if ('security' in card && card.security !== undefined) {
    lines.push(aiSecurityLine('auth', card.security));
  }
  if (card.content !== undefined) {
    const json = renderCardBodyJson(card.content, card.start_line);
    if (json !== undefined) {
      lines.push('--- json', json);
    } else {
      lines.push('--- yaml', card.content.trimEnd());
    }
  }
  if (card.deps !== undefined) {
    const closure = buildAiDepsClosure(card.deps, card.refs);
    const truncated = card.truncated ? ', truncated at 64 KB' : '';
    lines.push(`--- deps (${closure.deps.length}, signatures depth ≤2${truncated})`);
    for (const dep of closure.deps) lines.push(aiDepLine(dep, card.file));
    if (closure.deeper.length > 0) lines.push(`deeper: ${closure.deeper.join(' · ')}`);
  } else if (card.refs.length > 0) {
    lines.push(aiRefsLine(card.refs));
  }
  if (card.usedBy.length > 0) lines.push(`usedBy: ${card.usedBy.length} (--used-by)`);
  // Every id above is already a selector and every `$ref` in the body is a `--pointer` argument;
  // without this line an agent that starts from a card reads the command reference to find its
  // next call, which costs more than the whole run (see the benchmark guide).
  const withDeps = card.deps !== undefined ? '' : '--with-deps · ';
  lines.push(
    `next: ${withDeps}--component=<section> --name=<Name> (any id above) · --pointer=<$ref>`
  );
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
  lines.push(`${OPERATION_NEXT_HINT} · --component=<section> --name=<Name>`);
  return lines.join('\n');
}

/**
 * A `--pointer` deep-node card: header, then the same `--- json`/`--- yaml` body cards use, a
 * compact `refs:` line, and — unlike other cards — an `ancestor:` line with a ready-to-paste
 * `--pointer=` hint, since a deep node has no `usedBy` of its own to fall back on.
 */
function renderAiPointerCard(card: PointerCard): string {
  const truncated = card.truncated ? ' (truncated at 64 KB)' : '';
  const lines = [
    `pointer ${card.pointer} · ${card.file} L${card.start_line}-${card.end_line}${truncated}`,
  ];
  const json = renderCardBodyJson(card.content, card.start_line);
  if (json !== undefined) {
    lines.push('--- json', json);
  } else {
    lines.push('--- yaml', card.content.trimEnd());
  }
  if (card.refs.length > 0) lines.push(aiRefsLine(card.refs));
  if (card.ancestor) {
    const { ancestor } = card;
    lines.push(
      `ancestor: ${ancestor.id} L${ancestor.start_line}-${ancestor.end_line} · usedBy: ${ancestor.usedByCount} (--used-by --pointer='${ancestor.pointer}')`
    );
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
