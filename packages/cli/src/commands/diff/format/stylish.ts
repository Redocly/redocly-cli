import {
  displaySide,
  getLineColLocation,
  impactRank,
  isAbsoluteUrl,
  isBrowser,
  parsePointer,
  type Change,
  type DiffResult,
  type Impact,
  type JudgedChange,
} from '@redocly/openapi-core';
import { blue, bold, gray, green, red } from 'colorette';
import * as path from 'node:path';

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

function groupOf(change: Change): string {
  const segments = segmentsOf(displaySide(change).location.pointer);
  if (segments[0] === 'paths' && segments.length > 1) {
    const pathKey = segments[1];
    const method = segments[2];
    return method && HTTP_METHODS.has(method) ? `${method.toUpperCase()} ${pathKey}` : pathKey;
  }
  return segments[0] || 'document';
}

// The group heading already names what the label would repeat: the endpoint under
// `paths`, the section anywhere else.
function labelSegments(segments: string[]): string[] {
  if (segments[0] !== 'paths') return segments.slice(1);
  const underOperation = segments.length > 2 && HTTP_METHODS.has(segments[2]);
  return segments.slice(underOperation ? 3 : 2);
}

// A change on the group node itself is labelled by its property; the node itself by its
// real path, each segment unescaped so a `/` inside a name reads as one.
function labelOf(change: JudgedChange): string {
  const named = labelSegments(segmentsOf(change.key));
  if (named.length) {
    return change.kind === 'modified' ? `${named.join('/')} · ${change.property}` : named.join('/');
  }
  if (change.kind === 'modified') return change.property;
  return segmentsOf(displaySide(change).location.pointer).join(' · ');
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
    lines.push(bold(blue(key)));
    const sorted = [...changes].sort(
      (left, right) =>
        impactRank(right.impact) - impactRank(left.impact) || left.key.localeCompare(right.key)
    );
    for (const change of sorted) {
      lines.push(
        `  ${IMPACT_GLYPHS[change.impact]}  ${bold(change.kind.padEnd(8))}  ${labelOf(change)}`
      );
      for (const verdict of change.verdicts) {
        lines.push(gray(`      ${verdict.message} (${verdict.ruleId})`));
      }
      lines.push(gray(`      at ${locationOf(change, cwd)}`));
    }
    lines.push('');
  }

  const { major, minor, patch } = result.summary;
  lines.push(`${red(`${major} major`)}, ${green(`${minor} minor`)}, ${gray(`${patch} patch`)}.`);
  return lines.join('\n');
}
