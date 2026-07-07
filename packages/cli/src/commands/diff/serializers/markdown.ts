import type { Change, DiffResult } from '../engine/types.js';

const IMPACT_LABEL: Record<Change['compat'], string> = {
  breaking: '🔴 breaking',
  'non-breaking': '🟢 non-breaking',
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
    const details = [change.message, change.ruleIds?.map((id) => `\`${id}\``).join(', ')]
      .filter(Boolean)
      .join(' ');
    lines.push(
      `| ${IMPACT_LABEL[change.compat]} | ${change.kind} | \`${escapeCell(location)}\` | ${escapeCell(
        details
      )} |`
    );
  }

  return lines.join('\n');
}
