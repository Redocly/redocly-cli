import * as path from 'node:path';

import { isBrowser } from '../../env.js';
import { getLineColLocation } from '../../format/codeframes.js';
import { colorize } from '../../logger.js';
import { isAbsoluteUrl, unescapePointerFragment } from '../../ref-utils.js';
import {
  compatRank,
  displaySide,
  type Change,
  type Compat,
  type DiffResult,
  type JudgedChange,
} from '../types.js';

const ICONS: Record<Compat, string> = {
  breaking: colorize.red('✖ breaking    '),
  'non-breaking': colorize.green('✔ non-breaking'),
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
  const segments = segmentsOf(displaySide(change).location.pointer);
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
  const segments = segmentsOf(change.key);
  const named = labelSegments(segments);
  // A change on the operation itself leaves nothing after the prefix, so the whole
  // pointer is shown instead — there each segment is unescaped, so `~1pets` reads as
  // the path `/pets` rather than as one more separator.
  const label = named.length ? named.join('/') : segments.map(unescapePointerFragment).join(' · ');

  if (!label) return change.kind === 'modified' ? change.property : change.key;
  return change.kind === 'modified' ? `${label} · ${change.property}` : label;
}

function locationOf(change: Change, cwd: string): string {
  const { location } = displaySide(change);
  const { start } = getLineColLocation(location);
  const file = isAbsoluteUrl(location.source.absoluteRef)
    ? location.source.absoluteRef
    : path.relative(cwd, location.source.absoluteRef);
  return `${file}:${start.line}:${start.col}`;
}

export function stylishDiff(result: DiffResult): string {
  const cwd = isBrowser ? '' : process.cwd();
  const groups = new Map<string, JudgedChange[]>();
  for (const change of result.changes) {
    const key = groupOf(change);
    const group = groups.get(key) ?? [];
    group.push(change);
    groups.set(key, group);
  }

  const lines: string[] = [];
  for (const [key, changes] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(colorize.bold(colorize.blue(key)));
    const sorted = [...changes].sort(
      (a, b) => compatRank(b.compat) - compatRank(a.compat) || a.key.localeCompare(b.key)
    );
    for (const change of sorted) {
      lines.push(`  ${ICONS[change.compat]}  ${colorize.bold(change.kind)}  ${labelOf(change)}`);
      for (const verdict of change.verdicts) {
        lines.push(colorize.gray(`      ${verdict.message} (${verdict.ruleId})`));
      }
      lines.push(colorize.gray(`      at ${locationOf(change, cwd)}`));
    }
    lines.push('');
  }

  const { breaking, nonBreaking } = result.summary;
  lines.push(
    `${colorize.red(`${breaking} breaking`)}, ${colorize.green(`${nonBreaking} non-breaking`)}.`
  );
  return lines.join('\n');
}
