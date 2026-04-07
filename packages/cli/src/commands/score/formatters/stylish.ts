import { logger } from '@redocly/openapi-core';
import { bold, cyan, green, red, white, yellow } from 'colorette';

import type { DebugMediaTypeLog, ScoreResult } from '../types.js';
import { median } from '../utils.js';

export function printScoreStylish(result: ScoreResult, operationDetails = false): void {
  printScores(result);
  printSubscores(result);
  printRawMetricsSummary(result);
  if (operationDetails) printOperationDetails(result);
  printHotspots(result);
}

function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return green;
  if (score >= 50) return yellow;
  return red;
}

function formatScore(score: number): string {
  return scoreColor(score)(bold(score.toFixed(1)));
}

function out(str: string): void {
  logger.output(str + '\n');
}

function printScores(result: ScoreResult): void {
  out('');
  out(bold(white('  Scores')));
  out('');
  out(`  Agent Readiness:  ${formatScore(result.agentReadiness)}/100`);
  out('');
}

function printSubscores(result: ScoreResult): void {
  out(bold(white('  Subscores')));
  out('');
  const s = result.subscores;
  printSubscore('Parameter Simplicity', s.parameterSimplicity);
  printSubscore('Schema Simplicity', s.schemaSimplicity);
  printSubscore('Documentation Quality', s.documentationQuality);
  printSubscore('Constraint Clarity', s.constraintClarity);
  printSubscore('Example Coverage', s.exampleCoverage);
  printSubscore('Error Clarity', s.errorClarity);
  printSubscore('Dependency Clarity', s.dependencyClarity);
  printSubscore('Identifier Clarity', s.identifierClarity);
  printSubscore('Polymorphism Clarity', s.polymorphismClarity);
  printSubscore('Discoverability', result.discoverability);
  out('');
}

function printSubscore(label: string, value: number): void {
  const pct = Math.round(value * 100);
  const bar = buildBar(value);
  out(`  ${label.padEnd(24)} ${bar} ${scoreColor(pct)(pct + '%')}`);
}

function buildBar(fraction: number): string {
  const width = 20;
  const filled = Math.round(fraction * width);
  return cyan('[' + '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled) + ']');
}

function printRawMetricsSummary(result: ScoreResult): void {
  out(bold(white('  Raw Metrics Summary')));
  out('');
  out(`  Total operations: ${result.rawMetrics.operationCount}`);

  if (result.rawMetrics.operationCount === 0) {
    out('');
    return;
  }

  const params: number[] = [];
  const depths: number[] = [];
  const polys: number[] = [];
  const props: number[] = [];
  let opsWithReqExample = 0;
  let opsWithResExample = 0;
  let opsWithDescription = 0;

  for (const m of result.rawMetrics.operations.values()) {
    params.push(m.parameterCount);
    depths.push(Math.max(m.maxRequestSchemaDepth, m.maxResponseSchemaDepth));
    polys.push(m.polymorphismCount);
    props.push(m.propertyCount);
    if (m.requestExamplePresent) opsWithReqExample++;
    if (m.responseExamplePresent) opsWithResExample++;
    if (m.operationDescriptionPresent) opsWithDescription++;
  }

  const n = result.rawMetrics.operationCount;

  function statLine(label: string, values: number[]): void {
    const sum = values.reduce((s, v) => s + v, 0);
    const avg = (sum / n).toFixed(1);
    const med = median(values).toFixed(1);
    const min = Math.min(...values);
    const max = Math.max(...values);
    out(
      `  ${label.padEnd(26)} avg ${avg.padStart(6)}  median ${med.padStart(6)}  min ${String(min).padStart(5)}  max ${String(max).padStart(5)}`
    );
  }

  statLine('Parameters/operation:', params);
  statLine('Schema depth:', depths);
  statLine('Polymorphism/operation:', polys);
  statLine('Properties/operation:', props);
  out(
    `  Operations with request examples: ${opsWithReqExample}/${n} (${fmtPct(opsWithReqExample, n)})`
  );
  out(
    `  Operations with response examples: ${opsWithResExample}/${n} (${fmtPct(opsWithResExample, n)})`
  );
  out(
    `  Operations with description: ${opsWithDescription}/${n} (${fmtPct(opsWithDescription, n)})`
  );
  out('');
}

function fmtPct(num: number, denom: number): string {
  return denom > 0 ? `${Math.round((num / denom) * 100)}%` : 'N/A';
}

function printOperationDetails(result: ScoreResult): void {
  out(bold(white('  Per-Operation Metrics')));
  out('');

  const header =
    '  ' +
    'Operation'.padEnd(50) +
    'Props'.padStart(7) +
    'Poly'.padStart(7) +
    'Depth'.padStart(7) +
    'Params'.padStart(8) +
    'Constr'.padStart(8);
  out(cyan(header));
  out(cyan('  ' + '─'.repeat(header.length - 2)));

  const entries = [...result.rawMetrics.operations.entries()].sort(
    ([, a], [, b]) => b.propertyCount - a.propertyCount
  );

  for (const [, m] of entries) {
    const label = (m.operationId ?? `${m.method.toUpperCase()} ${m.path}`).slice(0, 48);
    const depth = Math.max(m.maxRequestSchemaDepth, m.maxResponseSchemaDepth);
    const line =
      '  ' +
      label.padEnd(50) +
      String(m.propertyCount).padStart(7) +
      String(m.polymorphismCount).padStart(7) +
      String(depth).padStart(7) +
      String(m.parameterCount).padStart(8) +
      String(m.constraintCount).padStart(8);
    out(line);
  }
  out('');
}

export function printDebugOperation(operationId: string, logs: DebugMediaTypeLog[]): void {
  out('');
  out(bold(white(`  Debug: ${operationId} schema breakdown`)));
  out('');

  if (logs.length === 0) {
    out(yellow(`  No schemas found for operation "${operationId}".`));
    out(yellow('  Make sure the value matches an operationId or "METHOD /path" exactly.'));
    out('');
    return;
  }

  for (const log of logs) {
    out(bold(cyan(`  ${log.context}`)));
    out(cyan('  ' + '─'.repeat(70)));

    const refGroups = new Map<string, { count: number; totalProps: number; propNames: string[] }>();

    for (const entry of log.entries) {
      const key = entry.ref ?? `(inline depth ${entry.depth})`;
      const group = refGroups.get(key);
      if (group) {
        group.count++;
        group.totalProps += entry.propertyNames.length;
        for (const n of entry.propertyNames) {
          if (!group.propNames.includes(n)) group.propNames.push(n);
        }
      } else {
        refGroups.set(key, {
          count: 1,
          totalProps: entry.propertyNames.length,
          propNames: [...entry.propertyNames],
        });
      }
    }

    for (const entry of log.entries) {
      const label = entry.ref ?? '(inline)';
      const depthPad = '  '.repeat(Math.min(entry.depth, 6));
      const propCount = entry.propertyNames.length;

      let line = `  ${depthPad}${label}`;
      if (propCount > 0) {
        line += ` (${propCount} properties)`;
      }

      const polyParts: string[] = [];
      if (entry.polymorphism.oneOf) polyParts.push(`oneOf:${entry.polymorphism.oneOf}`);
      if (entry.polymorphism.anyOf) polyParts.push(`anyOf:${entry.polymorphism.anyOf}`);
      if (entry.polymorphism.allOf) polyParts.push(`allOf:${entry.polymorphism.allOf}`);
      if (polyParts.length > 0) {
        line += ` [${polyParts.join(', ')}]`;
      }
      if (entry.constraintCount > 0) {
        line += ` {${entry.constraintCount} constraints}`;
      }

      out(line);

      if (propCount > 0 && propCount <= 20) {
        out(`  ${depthPad}  properties: ${entry.propertyNames.join(', ')}`);
      } else if (propCount > 20) {
        const preview = entry.propertyNames.slice(0, 15).join(', ');
        out(`  ${depthPad}  properties: ${preview}, ... +${propCount - 15} more`);
      }
    }

    out('');
    out(
      `  Totals: ${log.totalProperties} properties, ` +
        `${log.totalPolymorphism} polymorphism items, ` +
        `${log.totalConstraints} constraints, ` +
        `max depth ${log.maxDepth}`
    );

    const topRefs = [...refGroups.entries()]
      .filter(([, v]) => v.totalProps > 0)
      .sort(([, a], [, b]) => b.totalProps - a.totalProps)
      .slice(0, 10);

    if (topRefs.length > 0) {
      out('');
      out(bold('  Top schemas by property count:'));
      for (const [ref, data] of topRefs) {
        out(`    ${ref}: ${data.totalProps} properties`);
      }
    }

    out('');
  }
}

function printHotspots(result: ScoreResult): void {
  if (result.hotspots.length === 0) {
    out(bold(white('  No hotspot operations found.')));
    out('');
    return;
  }

  out(bold(white(`  Top ${result.hotspots.length} Hotspot Operations`)));
  out('');

  for (const hotspot of result.hotspots) {
    const label = hotspot.operationId
      ? `${hotspot.method.toUpperCase()} ${hotspot.path} (${hotspot.operationId})`
      : `${hotspot.method.toUpperCase()} ${hotspot.path}`;

    out(bold(`  ${label}`));
    out(`    Agent Readiness: ${formatScore(hotspot.agentReadinessScore)}`);

    for (const reason of hotspot.reasons) {
      out(yellow(`    - ${reason}`));
    }
    out('');
  }
}
