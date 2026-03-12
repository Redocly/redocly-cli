import { logger } from '@redocly/openapi-core';
import { bold, cyan, green, red, white, yellow, gray } from 'colorette';

import type { ScoreResult } from '../types.js';

export function printScoreStylish(result: ScoreResult): void {
  printScores(result);
  printSubscores(result);
  printRawMetricsSummary(result);
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
  out(`  Integration Simplicity:  ${formatScore(result.integrationSimplicity)}/100`);
  out(`  Agent Readiness:         ${formatScore(result.agentReadiness)}/100`);
  out('');
}

function printSubscores(result: ScoreResult): void {
  out(bold(white('  Integration Simplicity Subscores')));
  out('');
  const is = result.integrationSubscores;
  printSubscore('Parameter Simplicity', is.parameterSimplicity);
  printSubscore('Schema Simplicity', is.schemaSimplicity);
  printSubscore('Documentation Quality', is.documentationQuality);
  printSubscore('Constraint Clarity', is.constraintClarity);
  printSubscore('Example Coverage', is.exampleCoverage);
  printSubscore('Error Clarity', is.errorClarity);
  printSubscore('Workflow Clarity', is.workflowClarity);
  out('');

  out(bold(white('  Agent Readiness Subscores')));
  out('');
  const ar = result.agentSubscores;
  printSubscore('Documentation Quality', ar.documentationQuality);
  printSubscore('Constraint Clarity', ar.constraintClarity);
  printSubscore('Example Coverage', ar.exampleCoverage);
  printSubscore('Error Clarity', ar.errorClarity);
  printSubscore('Identifier Clarity', ar.identifierClarity);
  printSubscore('Workflow Clarity', ar.workflowClarity);
  printSubscore('Polymorphism Clarity', ar.polymorphismClarity);
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

  let totalParams = 0;
  let totalDepth = 0;
  let totalPoly = 0;
  let totalProps = 0;
  let opsWithReqExample = 0;
  let opsWithResExample = 0;
  let opsWithDescription = 0;

  for (const m of result.rawMetrics.operations.values()) {
    totalParams += m.parameterCount;
    totalDepth += Math.max(m.maxRequestSchemaDepth, m.maxResponseSchemaDepth);
    totalPoly += m.polymorphismCount;
    totalProps += m.propertyCount;
    if (m.requestExamplePresent) opsWithReqExample++;
    if (m.responseExamplePresent) opsWithResExample++;
    if (m.operationDescriptionPresent) opsWithDescription++;
  }

  const n = result.rawMetrics.operationCount;
  out(`  Avg parameters/operation: ${(totalParams / n).toFixed(1)}`);
  out(`  Avg max schema depth: ${(totalDepth / n).toFixed(1)}`);
  out(`  Avg polymorphism/operation: ${(totalPoly / n).toFixed(1)}`);
  out(`  Avg properties/operation: ${(totalProps / n).toFixed(1)}`);
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
    out(
      `    Integration Simplicity: ${formatScore(hotspot.integrationSimplicityScore)}  ` +
        `Agent Readiness: ${formatScore(hotspot.agentReadinessScore)}`
    );

    for (const reason of hotspot.reasons) {
      out(gray(`    - ${reason}`));
    }
    out('');
  }
}
