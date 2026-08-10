import { isAbsoluteUrl, unescapePointerFragment } from '@redocly/openapi-core';
import { blue, bold, gray, green, red } from 'colorette';
import * as path from 'node:path';

import { compatRank, type Change, type Compat, type DiffResult } from '../engine/types.js';
import { displaySide } from './change-side.js';

const ICONS: Record<Compat, string> = {
  breaking: red('✖ breaking    '),
  'non-breaking': green('✔ non-breaking'),
};

const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
  'query',
]);

// Identity keys escape '/' (node-identity.ts), so plain splitting is safe.
function segmentsOf(pointer: string): string[] {
  return pointer.replace(/^#\//, '').split('/');
}

function groupOf(change: Change): string {
  const segments = segmentsOf(displaySide(change)?.pointer ?? change.pointer);
  if (segments[0] === 'paths' && segments.length > 1) {
    const pathKey = unescapePointerFragment(segments[1]);
    const method = segments[2];
    return method && HTTP_METHODS.has(method) ? `${method.toUpperCase()} ${pathKey}` : pathKey;
  }
  return segments[0] || 'document';
}

// The group heading already says which operation this is, so the label starts after
// `paths/<path>/<method>`.
function labelSegments(segments: string[]): string[] {
  if (segments[0] !== 'paths') return segments;
  const underOperation = segments.length > 2 && HTTP_METHODS.has(segments[2]);
  return segments.slice(underOperation ? 3 : 2);
}

function labelOf(change: Change): string {
  const segments = segmentsOf(change.pointer);
  const named = labelSegments(segments);
  // A change on the operation itself leaves nothing after the prefix, so the whole
  // pointer is shown instead — there each segment is unescaped, so `~1pets` reads as
  // the path `/pets` rather than as one more separator.
  const label = named.length ? named.join('/') : segments.map(unescapePointerFragment).join(' · ');

  if (!label) return change.property ?? change.pointer;
  return change.property ? `${label} · ${change.property}` : label;
}

function locationOf(change: Change, cwd: string): string | undefined {
  const side = displaySide(change);
  if (!side?.file) return undefined;
  const file = isAbsoluteUrl(side.file) ? side.file : path.relative(cwd, side.file);
  return `${file}:${side.line}:${side.col}`;
}

export function stylishDiff(result: DiffResult): string {
  const cwd = process.cwd();
  const groups = new Map<string, Change[]>();
  for (const change of result.changes) {
    const key = groupOf(change);
    const group = groups.get(key) ?? [];
    group.push(change);
    groups.set(key, group);
  }

  const lines: string[] = [];
  for (const [key, changes] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(bold(blue(key)));
    const sorted = [...changes].sort(
      (a, b) => compatRank(b.compat) - compatRank(a.compat) || a.pointer.localeCompare(b.pointer)
    );
    for (const change of sorted) {
      lines.push(`  ${ICONS[change.compat]}  ${bold(change.kind)}  ${labelOf(change)}`);
      for (const verdict of change.verdicts ?? []) {
        lines.push(gray(`      ${verdict.message} (${verdict.ruleId})`));
      }
      const location = locationOf(change, cwd);
      if (location) lines.push(gray(`      at ${location}`));
    }
    lines.push('');
  }

  const { breaking, nonBreaking } = result.summary;
  lines.push(`${red(`${breaking} breaking`)}, ${green(`${nonBreaking} non-breaking`)}.`);
  return lines.join('\n');
}
