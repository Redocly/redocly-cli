import { bold, cyan, green, red, yellow } from 'colorette';

import type { CoverageCount, CoverageSummary, MatchMode } from '../types/index.js';

const BAR_WIDTH = 20;

interface CoverageReportMeta {
  spec: string;
  traffic: string;
  matchMode: MatchMode;
  server?: string;
}

function percent(count: CoverageCount): number | undefined {
  return count.total === 0 ? undefined : Math.floor((count.covered / count.total) * 100);
}

function percentLabel(pct: number | undefined): string {
  return pct === undefined ? 'n/a' : `${pct}%`;
}

function renderBar(pct: number | undefined, color: boolean): string {
  const filled = pct === undefined ? 0 : Math.round((pct / 100) * BAR_WIDTH);
  const bar = `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`;
  if (!color || pct === undefined) {
    return bar;
  }
  return pct >= 80 ? green(bar) : pct >= 50 ? yellow(bar) : red(bar);
}

/** Render the per-category coverage table shown after the drift report. */
export function renderCoverageOverview(summary: CoverageSummary, color: boolean): string {
  const rows: Array<[string, CoverageCount]> = [
    ['operations', summary.totals.operations],
    ['parameters', summary.totals.parameters],
    ['schema properties', summary.totals.properties],
    ['response codes', summary.totals.responses],
  ];
  const ratioWidth = Math.max(...rows.map(([, count]) => `${count.covered}/${count.total}`.length));

  const heading = `API coverage: ${percentLabel(percent(summary.totals.overall))}`;
  const lines = [color ? bold(cyan(heading)) : heading];
  for (const [label, count] of rows) {
    const pct = percent(count);
    lines.push(
      `  ${label.padEnd(18)} ${renderBar(pct, color)} ${percentLabel(pct).padStart(5)} ${`${count.covered}/${count.total}`.padStart(ratioWidth + 3)}`
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Render the detailed coverage report written by `--coverage-output`. */
export function renderCoverageJson(summary: CoverageSummary, meta: CoverageReportMeta): string {
  const payload = {
    version: 1,
    meta: { ...meta, exchanges: summary.exchanges },
    totals: summary.totals,
    operations: summary.operations,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
