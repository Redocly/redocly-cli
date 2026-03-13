import { getLineColLocation, logger } from '@redocly/openapi-core';

import type { ScorecardProblem } from '../types.js';

function xmlEscape(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[<>&"'\x00-\x1F\x7F\u0080-\uFFFF]/gu, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return `&#${char.charCodeAt(0)};`;
    }
  });
}

export function printScorecardResultsAsCheckstyle(
  path: string,
  problems: ScorecardProblem[],
  achievedLevel: string,
  targetLevelAchieved: boolean
): void {
  logger.output('<?xml version="1.0" encoding="UTF-8"?>\n');
  logger.output(
    `<checkstyle version="4.3" ${targetLevelAchieved ? `achievedLevel="${xmlEscape(achievedLevel)}"` : ''}>\n`
  );
  logger.output(`<file name="${xmlEscape(path)}">\n`);

  for (const problem of problems) {
    const loc = problem.location[0];
    let line = 0;
    let col = 0;

    if (loc) {
      const lineColLoc = getLineColLocation(loc);
      line = lineColLoc.start.line;
      col = lineColLoc.start.col;
    }

    const severity = problem.severity === 'warn' ? 'warning' : 'error';
    const message = xmlEscape(problem.message);
    const source = xmlEscape(problem.ruleId);
    const level = xmlEscape(problem.scorecardLevel || 'Unknown');
    logger.output(
      `<error line="${line}" column="${col}" severity="${severity}" message="${message}" source="${source}" level="${level}" />\n`
    );
  }

  logger.output(`</file>\n`);
  logger.output(`</checkstyle>\n`);
}
