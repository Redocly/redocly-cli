import type { Change, DiffResult } from '../engine/types.js';

const IMPACT_LABEL: Record<Change['compat'], string> = {
  breaking: '🔴 breaking',
  'non-breaking': '🟢 non-breaking',
};

// A cell is rendered inside a code span, so a backtick from the description would
// close it early and let the rest of the row be read as markup. Newlines and pipes
// would break out of the row itself.
function escapeCell(value: string): string {
  return value
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`')
    .replace(/[\r\n]+/g, ' ');
}

export function markdownDiff(result: DiffResult): string {
  const { breaking, nonBreaking } = result.summary;
  const lines = [
    '## API diff',
    '',
    `**${breaking}** breaking · **${nonBreaking}** non-breaking`,
    '',
    '| Impact | Change | Location | Details |',
    '| --- | --- | --- | --- |',
  ];

  for (const change of result.changes) {
    const location = change.property ? `${change.pointer} · ${change.property}` : change.pointer;
    // Only the message comes from the compared document and needs escaping. A rule id is
    // lowercase letters and hyphens, and the backticks around it are ours to keep.
    const details = (change.verdicts ?? [])
      .map((verdict) => `${escapeCell(verdict.message)} \`${verdict.ruleId}\``)
      .join('<br>');
    lines.push(
      `| ${IMPACT_LABEL[change.compat]} | ${change.kind} | \`${escapeCell(location)}\` | ${details} |`
    );
  }

  return lines.join('\n');
}
