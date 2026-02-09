import { logger, getLineColLocation, pluralize } from '@redocly/openapi-core';
import { gray, yellow, red, cyan, bold, white } from 'colorette';
import type { ScorecardProblem } from '../types.js';

function formatStylishProblem(
  problem: ScorecardProblem,
  locationPad: number,
  ruleIdPad: number
): string {
  const severityColor =
    problem.severity === 'error' ? red : problem.severity === 'warn' ? yellow : gray;

  const loc = problem.location?.[0];
  let line = 0;
  let column = 0;

  if (loc) {
    const lineColLoc = getLineColLocation(loc);
    line = lineColLoc.start.line;
    column = lineColLoc.start.col;
  }

  const location = `${line}:${column}`.padEnd(locationPad);
  const severity = severityColor(problem.severity.padEnd(7));
  const ruleId = problem.ruleId.padEnd(ruleIdPad);
  const level = cyan(`[${problem.scorecardLevel || 'Unknown'}]`);

  return `  ${location}  ${severity}  ${level}  ${ruleId}  ${problem.message}`;
}

export function printScorecardResults(
  problems: ScorecardProblem[],
  achievedLevel: string,
  targetLevelAchieved: boolean
): void {
  const problemsByLevel = problems.reduce(
    (acc, problem) => {
      const level = problem.scorecardLevel || 'Unknown';
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(problem);
      return acc;
    },
    {} as Record<string, ScorecardProblem[]>
  );

  const totalErrors = problems.filter((p) => p.severity === 'error').length;
  const totalWarnings = problems.filter((p) => p.severity === 'warn').length;
  const levelCount = Object.keys(problemsByLevel).length;

  logger.info(
    white(
      `Found ${bold(red(totalErrors.toString()))} ${pluralize('error', totalErrors)} and ${bold(
        yellow(totalWarnings.toString())
      )} ${pluralize('warning', totalWarnings)} across ${bold(
        cyan(levelCount.toString())
      )} ${pluralize('level', levelCount)}\n`
    )
  );

  if (targetLevelAchieved) {
    logger.output(white(bold(`\n ☑️  Achieved Level: ${cyan(achievedLevel)}\n`)));
  }

  for (const [level, levelProblems] of Object.entries(problemsByLevel)) {
    const severityCounts = levelProblems.reduce(
      (acc, p) => {
        acc[p.severity] = (acc[p.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    logger.output(
      bold(cyan(`\n 📋 ${level}`)) +
        gray(
          ` (${severityCounts.error || 0} ${pluralize('error', severityCounts.error || 0)}, ${
            severityCounts.warn || 0
          } ${pluralize('warning', severityCounts.warn || 0)}) \n`
        )
    );

    const locationPad = Math.max(
      ...levelProblems.map((p) => {
        const loc = p.location?.[0];
        if (loc) {
          const lineColLoc = getLineColLocation(loc);
          return `${lineColLoc.start.line}:${lineColLoc.start.col}`.length;
        }
        return 3;
      }),
      8
    );

    const ruleIdPad = Math.max(...levelProblems.map((p) => p.ruleId.length));

    for (const problem of levelProblems) {
      logger.output(`${formatStylishProblem(problem, locationPad, ruleIdPad)}\n`);
    }

    logger.info('');
  }
}
