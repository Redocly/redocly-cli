import type { DiffResult, Impact } from '@redocly/openapi-core';

const IMPACT_LABELS: Record<Impact, string> = {
  major: '🔴 major',
  minor: '🟢 minor',
  patch: '⚪ patch',
};

// A cell is rendered inside a code span, so a backtick from the description would
// close it early and let the rest of the row be read as markup. Newlines and pipes
// would break out of the row itself.
function escapeCell(value: string): string {
  return value
    .replaceAll('|', '\\|')
    .replaceAll('`', '\\`')
    .split('\n')
    .map((line) => line.trim())
    .join(' ');
}

export function markdownDiff(result: DiffResult): string {
  const { major, minor, patch } = result.summary;
  const required = result.bump ? ` · requires a **${result.bump}** bump` : '';
  const lines = [
    '## API diff',
    '',
    `**${major}** major · **${minor}** minor · **${patch}** patch${required}`,
    '',
    '| Impact | Change | Location | Details |',
    '| --- | --- | --- | --- |',
  ];

  for (const change of result.changes) {
    const location = change.kind === 'modified' ? `${change.key} · ${change.property}` : change.key;
    // Only the message comes from the compared document and needs escaping. A rule id is
    // lowercase letters and hyphens, and the backticks around it are ours to keep.
    const details = change.verdicts
      .map((verdict) => `${escapeCell(verdict.message)} \`${verdict.ruleId}\``)
      .join('<br>');
    lines.push(
      `| ${IMPACT_LABELS[change.impact]} | ${change.kind} | \`${escapeCell(location)}\` | ${details} |`
    );
  }

  return lines.join('\n');
}
