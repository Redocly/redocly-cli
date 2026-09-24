import {
  displaySide,
  impactRank,
  impacts,
  parsePointer,
  typeOf,
  type Change,
  type DiffNode,
  type DiffResult,
  type Impact,
  type JudgedChange,
} from '@redocly/openapi-core';
import { blue, bold, gray, green, red } from 'colorette';

import { lineColOf } from './location.js';

const IMPACT_COLORS: Record<Impact, (text: string) => string> = {
  major: red,
  minor: green,
  patch: gray,
};

const IMPACT_GLYPHS: Record<Impact, string> = {
  major: red('✖ major'),
  minor: green('✔ minor'),
  patch: gray('· patch'),
};

// `parsePointer` unescapes every segment and keeps the leading `#`, which names the document.
function segmentsOf(pointer: string): string[] {
  const [, ...segments] = parsePointer(pointer);
  return segments;
}

function nameOf(node: DiffNode): string {
  return String((node.revision ?? node.base)!.key);
}

// The items that get a heading of their own, by the type of the map that holds them.
const ITEM_HEADINGS: Partial<Record<string, (name: string) => string>> = {
  Paths: (path) => path,
  WebhooksMap: (webhook) => `${webhook} (webhook)`,
  NamedChannels: (channel) => `channel ${channel}`,
  NamedOperations: (operation) => `operation ${operation}`,
  ServerMap: (server) => `server ${server}`,
};

/**
 * The heading a change is listed under — its endpoint, webhook, channel, operation or server,
 * or else the section it sits in — and how many levels below the root that heading names. The
 * names come from the matched nodes, so a renamed path keeps one heading for all its changes.
 */
function headingOf(change: Change): { heading: string; depth: number } {
  const ancestors: DiffNode[] = [];
  for (let node: DiffNode | null = change.node; node; node = node.parent) ancestors.unshift(node);
  const [, section, item, operation] = ancestors;

  if (!section) return { heading: 'document', depth: 0 };
  const itemHeading = ITEM_HEADINGS[typeOf(section)];
  if (!item || !itemHeading) return { heading: nameOf(section), depth: 1 };

  const heading = itemHeading(nameOf(item));
  const isOperation = operation && typeOf(operation) === 'Operation' && typeOf(item) === 'PathItem';
  if (isOperation) return { heading: `${nameOf(operation).toUpperCase()} ${heading}`, depth: 3 };
  return { heading, depth: 2 };
}

// The label leaves out what the heading names, so a change on the heading's own node has only
// its property, if any. Each segment is unescaped, so a `/` inside a name reads as one.
function labelOf(change: JudgedChange): string {
  const below = segmentsOf(change.key).slice(headingOf(change).depth).join('/');
  if (change.kind !== 'modified') return below;
  return below ? `${below} · ${change.property}` : change.property;
}

export function stylishDiff(result: DiffResult): string {
  const groups = new Map<string, JudgedChange[]>();
  for (const change of result.changes) {
    const { heading } = headingOf(change);
    const group = groups.get(heading) ?? [];
    group.push(change);
    groups.set(heading, group);
  }

  const lines: string[] = [];
  // The changes come sorted by key, so the headings follow the document's structure.
  for (const [heading, changes] of groups) {
    lines.push(bold(blue(heading)));
    // Sorting is stable, so changes of one impact keep the order the report lists them in.
    const sorted = changes.toSorted(
      (left, right) => impactRank(right.impact) - impactRank(left.impact)
    );
    for (const change of sorted) {
      const label = labelOf(change);
      const kind = bold(label ? change.kind.padEnd(8) : change.kind);
      lines.push(`  ${IMPACT_GLYPHS[change.impact]}  ${kind}${label ? `  ${label}` : ''}`);
      for (const verdict of change.verdicts) {
        lines.push(gray(`      ${verdict.message} (${verdict.ruleId})`));
      }
      const { file, line, col } = lineColOf(displaySide(change).location);
      lines.push(gray(`      at ${file}:${line}:${col}`));
    }
    lines.push('');
  }

  // A zero is not a finding, so it is not coloured like one.
  const counts = impacts.toReversed().map((impact) => {
    const count = result.summary[impact];
    return (count ? IMPACT_COLORS[impact] : gray)(`${count} ${impact}`);
  });
  lines.push(`${counts.join(', ')}.`);
  return lines.join('\n');
}
