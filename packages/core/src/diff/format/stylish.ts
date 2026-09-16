import * as path from 'node:path';

import { isBrowser } from '../../env.js';
import { getLineColLocation } from '../../format/codeframes.js';
import { colorize } from '../../logger.js';
import { isAbsoluteUrl, unescapePointerFragment } from '../../ref-utils.js';
import {
  displaySide,
  impactRank,
  type Change,
  type DiffResult,
  type Impact,
  type JudgedChange,
} from '../types.js';

const IMPACT_GLYPHS: Record<Impact, string> = {
  major: colorize.red('✖ major'),
  minor: colorize.green('✔ minor'),
  patch: colorize.gray('· patch'),
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

// The group heading already names the endpoint, so the label starts after
// `paths/<path>/<method>`. A change on the endpoint itself is labelled by its property;
// the endpoint node itself by its real path, each segment unescaped.
function labelOf(change: JudgedChange): string {
  const named = labelSegments(segmentsOf(change.key));
  if (named.length) {
    return change.kind === 'modified' ? `${named.join('/')} · ${change.property}` : named.join('/');
  }
  if (change.kind === 'modified') return change.property;
  return segmentsOf(displaySide(change).location.pointer).map(unescapePointerFragment).join(' · ');
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
      (left, right) =>
        impactRank(right.impact) - impactRank(left.impact) || left.key.localeCompare(right.key)
    );
    for (const change of sorted) {
      lines.push(
        `  ${IMPACT_GLYPHS[change.impact]}  ${colorize.bold(change.kind.padEnd(8))}  ${labelOf(change)}`
      );
      for (const verdict of change.verdicts) {
        lines.push(colorize.gray(`      ${verdict.message} (${verdict.ruleId})`));
      }
      lines.push(colorize.gray(`      at ${locationOf(change, cwd)}`));
    }
    lines.push('');
  }

  const { major, minor, patch } = result.summary;
  lines.push(
    `${colorize.red(`${major} major`)}, ${colorize.green(`${minor} minor`)}, ${colorize.gray(`${patch} patch`)}.`
  );
  return lines.join('\n');
}
