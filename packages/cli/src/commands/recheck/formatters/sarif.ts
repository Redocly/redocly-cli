import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';
import * as fs from 'node:fs/promises';

const SEVERITY_TO_LEVEL: Record<string, 'error' | 'warning' | 'note'> = {
  error: 'error',
  warn: 'warning',
  info: 'note',
};

interface SarifRule {
  id: string;
  shortDescription: { text: string };
  helpUri?: string;
}

/**
 * Build SARIF format object from problems
 */
export function buildSarif(problems: Problem[]): Record<string, unknown> {
  const rulesMap = new Map<string, SarifRule>();
  for (const problem of problems) {
    if (!rulesMap.has(problem.ruleName)) {
      rulesMap.set(problem.ruleName, {
        id: problem.ruleName,
        shortDescription: { text: problem.ruleName.replace('recheck/', '') },
      });
    }
  }

  const results = problems.map((h) => ({
    ruleId: h.ruleName,
    level: SEVERITY_TO_LEVEL[h.severity] ?? 'warning',
    message: { text: h.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: h.file },
          region: { startLine: h.line, startColumn: h.column },
        },
      },
    ],
  }));

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'recheck',
            informationUri: 'https://redocly.com',
            rules: Array.from(rulesMap.values()),
          },
        },
        results,
      },
    ],
  };
}

/**
 * Output problems in SARIF format to file or through the logger
 */
export async function outputSarifFormat(
  problems: Problem[],
  outputPath: string | undefined
): Promise<void> {
  const sarif = buildSarif(problems);
  const content = JSON.stringify(sarif, null, 2);

  if (outputPath && outputPath.length > 0) {
    await fs.writeFile(outputPath, content, 'utf8');
    logger.info(`\n   Wrote SARIF to ${outputPath}\n`);
  } else {
    logger.output(`${content}\n`);
  }
}
