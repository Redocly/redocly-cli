import { unescapePointerFragment } from '@redocly/openapi-core';
import { blue, bold, gray, green, red } from 'colorette';
import * as path from 'node:path';

import type { Change, ChangeSide, Compat, DiffResult } from '../engine/types.js';

const SEVERITY_ORDER: Compat[] = ['breaking', 'non-breaking'];

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

// The side shown to the user: what was removed lives in the base document,
// everything else is best inspected in the revision.
function displaySide(change: Change): ChangeSide | undefined {
  return change.kind === 'removed'
    ? (change.base ?? change.revision)
    : (change.revision ?? change.base);
}

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

function labelOf(change: Change): string {
  const segments = segmentsOf(change.pointer);
  const rest =
    segments[0] === 'paths'
      ? segments.length > 2 && HTTP_METHODS.has(segments[2])
        ? segments.slice(3)
        : segments.slice(2)
      : segments;
  const label = rest.join('/') || segments.join('/');
  return change.property ? `${label} · ${change.property}` : label;
}

function locationOf(change: Change, cwd: string): string | undefined {
  const side = displaySide(change);
  if (!side?.file) return undefined;
  const file = /^https?:\/\//.test(side.file) ? side.file : path.relative(cwd, side.file);
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
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.compat) - SEVERITY_ORDER.indexOf(b.compat) ||
        a.pointer.localeCompare(b.pointer)
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
