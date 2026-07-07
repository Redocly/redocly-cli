import { bold, gray, green, red } from 'colorette';

import type { Change, Compat, DiffResult } from '../engine/types.js';

const SEVERITY_ORDER: Compat[] = ['breaking', 'non-breaking'];

const ICONS: Record<Compat, string> = {
  breaking: red('✖ breaking    '),
  'non-breaking': green('✔ non-breaking'),
};

function label(change: Change): string {
  return change.property ? `${change.pointer} · ${change.property}` : change.pointer;
}

export function stylishDiff(result: DiffResult): string {
  const lines: string[] = [];
  const sorted = [...result.changes].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.compat) - SEVERITY_ORDER.indexOf(b.compat) ||
      a.pointer.localeCompare(b.pointer)
  );

  for (const change of sorted) {
    const rule = change.ruleIds?.length ? gray(` (${change.ruleIds.join(', ')})`) : '';
    const message = change.message ? gray(` — ${change.message}`) : '';
    lines.push(`${ICONS[change.compat]}  ${bold(change.kind)}  ${label(change)}${message}${rule}`);
  }

  const { breaking, nonBreaking } = result.summary;
  lines.push('', `${red(`${breaking} breaking`)}, ${green(`${nonBreaking} non-breaking`)}.`);
  return lines.join('\n');
}
