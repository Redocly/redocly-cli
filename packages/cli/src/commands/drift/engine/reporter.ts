import path from 'node:path';

import type { DriftRunResult, FindingPreview, FindingRecord, RunSummary } from '../types/index.js';
import { createProblemKey } from '../utils/finding-groups.js';

export type ReportFormat = 'pretty' | 'json' | 'csv' | 'sarif';

export interface RenderReportOptions {
  format: ReportFormat;
  color?: boolean;
  maxFindings?: number;
}

const ANSI = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  green: '[32m',
  red: '[31m',
  yellow: '[33m',
  blue: '[34m',
  cyan: '[36m',
  gray: '[90m',
} as const;

function mapSeverityToSarifLevel(severity: string): 'error' | 'warning' | 'note' {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'note';
}

function escapeCsvCell(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  const stringValue = String(value);
  if (!stringValue.includes(',') && !stringValue.includes('"') && !stringValue.includes('\n')) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function toRelativeSpecPath(specSource: string): string {
  if (!path.isAbsolute(specSource)) {
    return specSource;
  }

  const relativePath = path.relative(process.cwd(), specSource);
  return relativePath || '.';
}

function getOperationTemplatePath(details: Record<string, unknown> | undefined): string | null {
  if (!details) {
    return null;
  }

  const maybePath = details.operationPathTemplate;
  return typeof maybePath === 'string' && maybePath.length > 0 ? maybePath : null;
}

function sortRuleCounts(findingsByRule: Record<string, number>): Array<[string, number]> {
  return Object.entries(findingsByRule).sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) {
      return countDiff;
    }
    return a[0].localeCompare(b[0]);
  });
}

interface GroupedProblem {
  finding: FindingRecord;
  occurrences: number;
}

function groupFindingsIntoProblems(findings: FindingRecord[]): GroupedProblem[] {
  const problems: GroupedProblem[] = [];
  const keyToIndex = new Map<string, number>();

  for (const finding of findings) {
    const key = createProblemKey({
      ruleId: finding.ruleId,
      severity: finding.severity,
      message: finding.message,
      operationId: finding.operationId,
      path: finding.path,
      target: finding.target,
      schemaPath: finding.schemaPath,
    });

    const existingIndex = keyToIndex.get(key);
    if (existingIndex !== undefined) {
      problems[existingIndex].occurrences += 1;
      continue;
    }

    keyToIndex.set(key, problems.length);
    problems.push({ finding, occurrences: 1 });
  }

  return problems;
}

// --- json -------------------------------------------------------------------

function formatJson(result: DriftRunResult): string {
  const problems = groupFindingsIntoProblems(result.findings).map((problem) => ({
    occurrences: problem.occurrences,
    exchangeIndex: problem.finding.exchangeIndex,
    ruleId: problem.finding.ruleId,
    severity: problem.finding.severity,
    category: problem.finding.category,
    message: problem.finding.message,
    operationId: problem.finding.operationId,
    specSource: problem.finding.specSource,
    target: problem.finding.target,
    schemaPath: problem.finding.schemaPath,
    dataPath: problem.finding.dataPath,
    details: problem.finding.details,
    method: problem.finding.method,
    url: problem.finding.url,
    path: problem.finding.path,
    status: problem.finding.status,
  }));

  const payload = {
    run: {
      id: result.runId,
      specSource: result.meta.specSource,
      trafficPath: result.meta.trafficPath,
      format: result.meta.format,
      matchMode: result.meta.matchMode,
      generatedSpec: result.meta.generatedSpec,
      server: result.meta.server,
      totalExchanges: result.summary.totalExchanges,
      documentedExchanges: result.summary.documentedExchanges,
      undocumentedExchanges: result.summary.undocumentedExchanges,
      skippedExchanges: result.summary.skippedExchanges,
      findingsBySeverity: result.summary.findingsBySeverity,
      findingsByRule: result.summary.findingsByRule,
      totalProblems: result.summary.totalProblemGroups,
      durationMs: result.summary.durationMs,
    },
    problems,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

// --- csv ---------------------------------------------------------------------

function formatCsv(result: DriftRunResult): string {
  const header = [
    'run_id',
    'finding_id',
    'exchange_index',
    'severity',
    'category',
    'rule_id',
    'message',
    'method',
    'path',
    'url',
    'status',
    'operation_id',
    'spec_source',
    'target',
    'schema_path',
    'data_path',
  ];

  const rows = result.findings.map((finding) => [
    result.runId,
    finding.id,
    finding.exchangeIndex,
    finding.severity,
    finding.category,
    finding.ruleId,
    finding.message,
    finding.method,
    finding.path,
    finding.url,
    finding.status,
    finding.operationId,
    finding.specSource,
    finding.target,
    finding.schemaPath,
    finding.dataPath,
  ]);

  const csvRows = [header, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return `${csvRows.join('\n')}\n`;
}

// --- sarif -------------------------------------------------------------------

function formatSarif(result: DriftRunResult): string {
  const ruleSet = new Map<
    string,
    { id: string; name: string; shortDescription: { text: string } }
  >();

  for (const finding of result.findings) {
    if (!ruleSet.has(finding.ruleId)) {
      ruleSet.set(finding.ruleId, {
        id: finding.ruleId,
        name: finding.ruleId,
        shortDescription: { text: `${finding.category} detection` },
      });
    }
  }

  const results = result.findings.map((finding) => {
    const locationUri = finding.specSource ?? finding.url ?? undefined;

    return {
      ruleId: finding.ruleId,
      level: mapSeverityToSarifLevel(finding.severity),
      message: { text: finding.message },
      locations: locationUri
        ? [{ physicalLocation: { artifactLocation: { uri: locationUri } } }]
        : undefined,
      properties: {
        runId: result.runId,
        exchangeIndex: finding.exchangeIndex,
        method: finding.method,
        path: finding.path,
        status: finding.status,
        operationId: finding.operationId,
        target: finding.target,
        schemaPath: finding.schemaPath,
        dataPath: finding.dataPath,
      },
    };
  });

  const sarifPayload = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'drift', rules: Array.from(ruleSet.values()) } }, results }],
  };

  return `${JSON.stringify(sarifPayload, null, 2)}\n`;
}

// --- pretty ------------------------------------------------------------------

function totalFindings(summary: RunSummary): number {
  return (
    summary.findingsBySeverity.error +
    summary.findingsBySeverity.warning +
    summary.findingsBySeverity.info
  );
}

function statusColorCode(status: number): string {
  if (status >= 500) return ANSI.red;
  if (status >= 400) return ANSI.yellow;
  if (status >= 300) return ANSI.blue;
  if (status >= 200) return ANSI.green;
  return ANSI.gray;
}

function formatPretty(result: DriftRunResult, color: boolean, maxFindings: number): string {
  const colorize = (text: string, code: string) => (color ? `${code}${text}${ANSI.reset}` : text);
  const severityIcon = (severity: FindingPreview['severity']) =>
    severity === 'error'
      ? colorize('✖', ANSI.red)
      : severity === 'warning'
        ? colorize('▲', ANSI.yellow)
        : colorize('●', ANSI.blue);
  const severityLabel = (severity: FindingPreview['severity']) =>
    severity === 'error'
      ? colorize('ERROR', ANSI.red)
      : severity === 'warning'
        ? colorize('WARN', ANSI.yellow)
        : colorize('INFO', ANSI.blue);

  const { summary, meta } = result;
  const findingsCount = totalFindings(summary);
  const findingsToRender = summary.previewFindings.slice(0, maxFindings);

  const lines: string[] = [];
  lines.push(colorize('┏━ Drift Report', `${ANSI.cyan}${ANSI.bold}`));
  lines.push(`┃ Run: ${result.runId}`);
  lines.push(`┃ Spec: ${meta.specSource}${meta.generatedSpec ? ' (generated from traffic)' : ''}`);
  lines.push(`┃ Traffic: ${meta.trafficPath}`);
  lines.push(
    meta.server
      ? `┃ Server: ${meta.server} (overrides description servers)`
      : `┃ Match mode: ${meta.matchMode}`
  );
  lines.push(`┃ Traffic format: ${meta.format}${meta.format === 'auto' ? ' (auto-detect)' : ''}`);
  lines.push(
    `┃ Exchanges: total=${summary.totalExchanges} documented=${summary.documentedExchanges} undocumented=${summary.undocumentedExchanges}${
      summary.skippedExchanges > 0 ? ` skipped=${summary.skippedExchanges}` : ''
    }`
  );
  lines.push(
    `┃ Findings: total=${findingsCount} ${colorize(`error=${summary.findingsBySeverity.error}`, ANSI.red)} ${colorize(
      `warning=${summary.findingsBySeverity.warning}`,
      ANSI.yellow
    )} ${colorize(`info=${summary.findingsBySeverity.info}`, ANSI.blue)}`
  );
  lines.push(`┃ Problems: total=${summary.totalProblemGroups}`);
  lines.push(`┗ Duration: ${summary.durationMs}ms`);

  if (findingsToRender.length === 0) {
    lines.push('');
    lines.push(colorize('✔ No findings.', ANSI.cyan));
    return `${lines.join('\n')}\n`;
  }

  lines.push('');
  lines.push(
    colorize(
      `Types (${Object.keys(summary.problemGroupsByRule).length})`,
      `${ANSI.cyan}${ANSI.bold}`
    )
  );
  for (const [ruleId, problemsCount] of sortRuleCounts(summary.problemGroupsByRule)) {
    const findingsForRule = summary.findingsByRule[ruleId] ?? problemsCount;
    lines.push(
      `  ${colorize('•', ANSI.gray)} ${ruleId}: ${problemsCount} problems / ${findingsForRule} findings`
    );
  }

  const groupedFindings = new Map<string, FindingPreview[]>();
  for (const finding of findingsToRender) {
    if (!groupedFindings.has(finding.ruleId)) {
      groupedFindings.set(finding.ruleId, []);
    }
    groupedFindings.get(finding.ruleId)!.push(finding);
  }

  const orderedRuleIds = Array.from(groupedFindings.keys()).sort((a, b) => {
    const countDiff = (summary.problemGroupsByRule[b] ?? 0) - (summary.problemGroupsByRule[a] ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }
    return a.localeCompare(b);
  });

  lines.push('');
  lines.push(
    colorize(
      `Problems by type (showing first ${findingsToRender.length} of ${summary.totalProblemGroups})`,
      `${ANSI.cyan}${ANSI.bold}`
    )
  );

  let renderedIndex = 0;
  for (const ruleId of orderedRuleIds) {
    const group = groupedFindings.get(ruleId);
    if (!group || group.length === 0) {
      continue;
    }

    const ruleProblemTotal = summary.problemGroupsByRule[ruleId] ?? group.length;
    const ruleFindingTotal = summary.findingsByRule[ruleId] ?? ruleProblemTotal;
    lines.push('');
    lines.push(
      `${colorize('◉', ANSI.cyan)} ${colorize(ruleId, `${ANSI.cyan}${ANSI.bold}`)} ${colorize(
        `(${group.length} problems shown / ${ruleProblemTotal} total, ${ruleFindingTotal} findings)`,
        ANSI.gray
      )}`
    );

    for (const finding of group) {
      renderedIndex += 1;
      const occurrences = finding.occurrences;
      const statusText =
        finding.status !== undefined
          ? colorize(String(finding.status), statusColorCode(finding.status))
          : colorize('-', ANSI.gray);
      const displayPath = getOperationTemplatePath(finding.details) ?? finding.path;
      const operationLabel = finding.operationId
        ? ` ${colorize(finding.operationId, ANSI.dim)}`
        : '';
      lines.push(
        `${severityIcon(finding.severity)} ${severityLabel(finding.severity)} #${renderedIndex}${
          occurrences > 1 ? ` ${colorize(`×${occurrences}`, ANSI.gray)}` : ''
        } ${colorize('→', ANSI.gray)} ${finding.message}`
      );
      lines.push(
        `  ↳ sample exchange=${finding.exchangeIndex} ${colorize(finding.method, ANSI.cyan)} ${displayPath} (${statusText})${operationLabel}`
      );
      lines.push('');
      lines.push(`    ${colorize(finding.url, ANSI.gray)}`);

      if (finding.specSource || finding.schemaPath || finding.dataPath) {
        lines.push('');
        if (finding.specSource) {
          lines.push(
            `    ${colorize('spec:', ANSI.dim)} ${colorize(toRelativeSpecPath(finding.specSource), ANSI.cyan)}`
          );
        }
        if (finding.schemaPath) {
          lines.push(
            `    ${colorize('schemaPath=', ANSI.dim)} ${colorize(finding.schemaPath, ANSI.dim)}`
          );
        }
        if (finding.dataPath) {
          lines.push(
            `    ${colorize('dataPath=', ANSI.dim)} ${colorize(finding.dataPath, ANSI.cyan)}`
          );
        }
      }

      if (finding.details) {
        lines.push('');
        if (finding.ruleId === 'security-baseline' && typeof finding.details.summary === 'string') {
          lines.push(`    ${colorize('security:', ANSI.dim)} ${finding.details.summary}`);
        } else if (
          finding.ruleId === 'owasp-api-top10' &&
          typeof finding.details.summary === 'string'
        ) {
          const issueId =
            typeof finding.details.issueId === 'string' ? finding.details.issueId : null;
          const issueTitle =
            typeof finding.details.issueTitle === 'string' ? finding.details.issueTitle : null;
          lines.push(`    ${colorize('owasp:', ANSI.dim)} ${finding.details.summary}`);
          if (issueId || issueTitle) {
            lines.push(
              `    ${colorize('issue:', ANSI.dim)} ${[issueId, issueTitle].filter(Boolean).join(' - ')}`
            );
          }
        } else if (
          finding.ruleId === 'schema-consistency' &&
          typeof finding.details.summary === 'string'
        ) {
          const detailPath = typeof finding.details.path === 'string' ? finding.details.path : null;
          const expected =
            typeof finding.details.expected === 'string' ? finding.details.expected : null;
          const actual = typeof finding.details.actual === 'string' ? finding.details.actual : null;
          const suggestion =
            typeof finding.details.suggestion === 'string' ? finding.details.suggestion : null;

          lines.push(`    ${colorize('schema:', ANSI.dim)} ${finding.details.summary}`);
          if (detailPath) {
            lines.push(`    ${colorize('path:', ANSI.dim)} ${colorize(detailPath, ANSI.cyan)}`);
          }
          if (expected) {
            lines.push(`    ${colorize('expected:', ANSI.dim)} ${expected}`);
          }
          if (actual) {
            lines.push(`    ${colorize('actual:', ANSI.dim)} ${actual}`);
          }
          if (suggestion) {
            lines.push(`    ${colorize('hint:', ANSI.dim)}`);
            for (const suggestionLine of suggestion.split('\n')) {
              lines.push(`      ${suggestionLine}`);
            }
          }
        } else {
          lines.push(`    ${colorize('details:', ANSI.dim)} ${JSON.stringify(finding.details)}`);
        }
      }

      lines.push('');
    }
  }

  const omittedProblemsCount = summary.totalProblemGroups - findingsToRender.length;
  if (omittedProblemsCount > 0) {
    if (lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push(
      colorize(
        `… ${omittedProblemsCount} problems omitted from terminal output. Use --format json/csv/sarif for the complete export.`,
        ANSI.gray
      )
    );
  } else if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return `${lines.join('\n')}\n`;
}

/** Render a drift run result in the requested format. */
export function renderReport(result: DriftRunResult, options: RenderReportOptions): string {
  const maxFindings = options.maxFindings ?? 10;
  switch (options.format) {
    case 'json':
      return formatJson(result);
    case 'csv':
      return formatCsv(result);
    case 'sarif':
      return formatSarif(result);
    case 'pretty':
      return formatPretty(result, options.color ?? false, maxFindings);
    default:
      throw new Error(`Unsupported report format: ${options.format}`);
  }
}
