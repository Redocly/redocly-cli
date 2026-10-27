import { displaySide, type DiffResult, type Impact } from '@redocly/openapi-core';

import { formatPath } from '../../../utils/miscellaneous.js';
import { lineColOf } from './location.js';

const IMPACT_LABELS: Record<Impact, string> = {
  major: '🔴 major',
  minor: '🟢 minor',
  patch: '⚪ patch',
};

// Pipes and newlines would break out of the row, and a backtick would open a code span.
function escapeCell(value: string): string {
  return value
    .replaceAll('|', '\\|')
    .replaceAll('`', '\\`')
    .split('\n')
    .map((line) => line.trim())
    .join(' ');
}

// A backslash does not escape inside a code span, so a value with a backtick is fenced with two.
function codeCell(value: string): string {
  const content = value.replaceAll('|', '\\|').replaceAll('\n', ' ');
  return content.includes('`') ? `\`\` ${content} \`\`` : `\`${content}\``;
}

export function markdownDiff(result: DiffResult): string {
  const { major, minor, patch } = result.summary;
  const required = result.bump ? ` · requires a **${result.bump}** bump` : '';
  const lines = [
    `## API diff: ${formatPath(result.files.base)} → ${formatPath(result.files.revision)}`,
    '',
    `**${major}** major · **${minor}** minor · **${patch}** patch${required}`,
    '',
    '| Impact | Change | Pointer | Location | Details |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const change of result.changes) {
    const address =
      change.kind === 'modified' ? `${change.path} · ${change.property}` : change.path;
    const { file, line, col } = lineColOf(displaySide(change).location);
    // Only the message comes from the compared document and needs escaping. A rule id is
    // lowercase letters and hyphens, and the backticks around it are ours to keep.
    const details = change.verdicts
      .map((verdict) => `${escapeCell(verdict.message)} \`${verdict.ruleId}\``)
      .join('<br>');
    lines.push(
      `| ${IMPACT_LABELS[change.impact]} | ${change.kind} | ${codeCell(address)} | ${escapeCell(`${file}:${line}:${col}`)} | ${details} |`
    );
  }

  return lines.join('\n');
}
