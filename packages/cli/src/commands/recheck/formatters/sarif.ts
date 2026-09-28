import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';

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

  const results = problems.map((problem) => ({
    ruleId: problem.ruleName,
    level: SEVERITY_TO_LEVEL[problem.severity] ?? 'warning',
    message: { text: problem.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: problem.file },
          region: { startLine: problem.line, startColumn: problem.column },
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
 * Output problems in SARIF format through the logger
 */
export function outputSarifFormat(problems: Problem[]): void {
  logger.output(`${JSON.stringify(buildSarif(problems), null, 2)}\n`);
}
