import { logger, getLineColLocation } from '@redocly/openapi-core';

import type { ScorecardProblem } from '../types.js';

type ScorecardLevel = {
  name: string;
  total: {
    errors: number;
    warnings: number;
  };
  problems: Array<{
    ruleId: string;
    ruleUrl?: string;
    severity: string;
    message: string;
    location: {
      file: string;
      range: string;
      pointer?: string;
    }[];
  }>;
};

export type ScorecardJsonOutput = {
  version: string;
  levels: ScorecardLevel[];
};

function formatRange(
  start: { line: number; col: number },
  end?: { line: number; col: number }
): string {
  const startStr = `Line ${start.line}, Col ${start.col}`;
  if (!end) {
    return startStr;
  }
  const endStr = `Line ${end.line}, Col ${end.col}`;
  return `${startStr} → ${endStr}`;
}

function getRuleUrl(ruleId: string): string | undefined {
  if (!ruleId.includes('/')) {
    return `https://redocly.com/docs/cli/rules/oas/${ruleId}`;
  }
  return undefined;
}

function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[\d+m/g, '');
}

export function printScorecardResultsAsJson(
  problems: ScorecardProblem[],
  version: string = '1.0'
): void {
  const groupedByLevel: Record<string, ScorecardProblem[]> = {};

  for (const problem of problems) {
    const level = problem.scorecardLevel || 'Unknown';
    if (!groupedByLevel[level]) {
      groupedByLevel[level] = [];
    }
    groupedByLevel[level].push(problem);
  }

  const levels: ScorecardLevel[] = [];

  for (const [levelName, levelProblems] of Object.entries(groupedByLevel)) {
    let errors = 0;
    let warnings = 0;

    const formattedProblems = levelProblems.map((problem) => {
      if (problem.severity === 'error') errors++;
      if (problem.severity === 'warn') warnings++;

      return {
        ruleId: problem.ruleId,
        ruleUrl: getRuleUrl(problem.ruleId),
        severity: problem.severity,
        message: stripAnsiCodes(problem.message),

        location: problem.location.map((loc) => {
          const lineCol = getLineColLocation(loc);
          return {
            file: loc.source.absoluteRef,
            range: formatRange(lineCol.start, lineCol.end),
            pointer: loc.pointer,
          };
        }),
      };
    });

    levels.push({
      name: levelName,
      total: {
        errors,
        warnings,
      },
      problems: formattedProblems,
    });
  }

  const output: ScorecardJsonOutput = {
    version,
    levels,
  };

  logger.output(JSON.stringify(output, null, 2));
  logger.info('\n');
}
