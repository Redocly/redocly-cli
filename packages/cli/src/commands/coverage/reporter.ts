import type { CoverageReport } from './engine/analyse.js';

export type CoverageFormat = 'stylish' | 'json';

export interface RenderOptions {
  format: CoverageFormat;
  all: boolean;
}

function percentage(seen: number, total: number): number {
  return total === 0 ? 0 : Math.round((seen / total) * 100);
}

function stylish(report: CoverageReport, all: boolean): string {
  const { operations, parameters, statuses } = report;

  const lines = [
    `${operations.seen}/${operations.total} operations exercised (${percentage(
      operations.seen,
      operations.total
    )}%)`,
    `${parameters.seen}/${parameters.total} documented parameters sent (${percentage(
      parameters.seen,
      parameters.total
    )}%)`,
    `${statuses.seen}/${statuses.total} documented responses returned (${percentage(
      statuses.seen,
      statuses.total
    )}%)`,
    `${report.seenProperties}/${report.totalProperties} documented properties observed (${percentage(
      report.seenProperties,
      report.totalProperties
    )}%) over ${report.exchanges.withBody} of ${report.exchanges.total} exchange(s)`,
  ];

  if (report.seenPropertiesAccepted < report.seenProperties) {
    lines.push(
      `${report.seenPropertiesAccepted}/${
        report.totalProperties
      } observed on an exchange the API accepted (${percentage(
        report.seenPropertiesAccepted,
        report.totalProperties
      )}%)`
    );
  }

  lines.push('');

  for (const { name, reached, seen, count, unusedProperties, unusedVariants } of report.schemas) {
    if (!reached && !all) continue;

    const clean = unusedProperties.length === 0 && unusedVariants.length === 0;
    lines.push(`${clean ? '✓' : ' '} ${name}  ${seen}/${count}`);

    for (const property of unusedProperties) lines.push(`    ${property}`);
    for (const { path, keyword, branches } of unusedVariants) {
      lines.push(`    ${path || '(root)'}  ${keyword} branch ${branches.join(', ')} never matched`);
    }
  }

  for (const [title, entries] of [
    ['Operations nothing reached', report.operations.unused],
    ['Parameters nothing sent', parameters.unused],
    ['Parameter values nothing used', parameters.unusedValues],
    ['Responses nothing returned', statuses.unused],
    ['Schemas nothing reached', report.unusedSchemas],
  ] as const) {
    if (entries.length === 0) continue;

    lines.push('', `${title} — ${entries.length}`);
    if (all) for (const entry of entries) lines.push(`    ${entry}`);
    else lines.push('    pass --all to list them');
  }

  return `${lines.join('\n')}\n`;
}

export function renderCoverage(report: CoverageReport, { format, all }: RenderOptions): string {
  return format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : stylish(report, all);
}
