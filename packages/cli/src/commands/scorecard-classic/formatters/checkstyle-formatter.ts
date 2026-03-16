import { getLineColLocation, logger, xmlEscape } from '@redocly/openapi-core';
import { bold, cyan, white } from 'colorette';

import type { ScorecardProblem } from '../types.js';

export function printScorecardResultsAsCheckstyle(
  path: string,
  problems: ScorecardProblem[],
  achievedLevel: string,
  targetLevelAchieved: boolean
): void {
  if (targetLevelAchieved) {
    logger.info(white(bold(`\n ☑️  Achieved Level: ${cyan(achievedLevel)}\n\n`)));
  }

  logger.output('<?xml version="1.0" encoding="UTF-8"?>\n');
  logger.output(`<checkstyle version="4.3">\n`);
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

    const level = problem.scorecardLevel || 'Unknown';
    const severity = problem.severity === 'warn' ? 'warning' : 'error';
    const message = xmlEscape(problem.message);
    const source = xmlEscape(`${level}:${problem.ruleId}`);
    logger.output(
      `<error line="${line}" column="${col}" severity="${severity}" message="${message}" source="${source}" />\n`
    );
  }

  logger.output(`</file>\n`);
  logger.output(`</checkstyle>\n\n`);
}
