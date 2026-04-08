import { getLineColLocation, logger, xmlEscape } from '@redocly/openapi-core';
import { bold, cyan, white } from 'colorette';

import type { ScorecardProblem } from '../types.js';

type ProblemLocation = {
  file: string;
  line: number;
  column: number;
  pointer?: string;
};

function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[\d+m/g, '');
}

function getProblemLocation(problem: ScorecardProblem, apiPath: string): ProblemLocation {
  const location = problem.location[0];

  if (!location) {
    return {
      file: apiPath,
      line: 0,
      column: 0,
    };
  }

  const lineColLocation = getLineColLocation(location);

  return {
    file: location.source.absoluteRef,
    line: lineColLocation.start.line,
    column: lineColLocation.start.col,
    pointer: location.pointer,
  };
}

function formatProblemDetails(problem: ScorecardProblem, location: ProblemLocation): string {
  const details = [
    `Level: ${problem.scorecardLevel || 'Unknown'}`,
    `Rule: ${problem.ruleId}`,
    `Severity: ${problem.severity}`,
    `File: ${location.file}`,
    `Line: ${location.line}`,
    `Column: ${location.column}`,
  ];

  if (location.pointer) {
    details.push(`Pointer: ${location.pointer}`);
  }

  details.push(`Message: ${stripAnsiCodes(problem.message)}`);

  return details.join('\n');
}

export function printScorecardResultsAsJunit(
  path: string,
  problems: ScorecardProblem[],
  achievedLevel: string,
  targetLevelAchieved: boolean
): void {
  if (targetLevelAchieved) {
    logger.info(white(bold(`\n ☑️  Achieved Level: ${cyan(achievedLevel)}\n\n`)));
  }

  const failures = problems.filter((problem) => problem.severity === 'error').length;
  const skipped = problems.filter((problem) => problem.severity === 'warn').length;

  logger.output('<?xml version="1.0" encoding="UTF-8"?>\n');
  logger.output(
    `<testsuites name="redocly scorecard-classic" tests="${problems.length}" failures="${failures}" errors="0" skipped="${skipped}">\n`
  );
  logger.output(
    `<testsuite name="scorecard-classic" tests="${problems.length}" failures="${failures}" errors="0" skipped="${skipped}">\n`
  );
  logger.output('<properties>\n');
  logger.output(`<property name="api" value="${xmlEscape(path)}" />\n`);
  logger.output(`<property name="achievedLevel" value="${xmlEscape(achievedLevel)}" />\n`);
  logger.output(
    `<property name="targetLevelAchieved" value="${targetLevelAchieved ? 'true' : 'false'}" />\n`
  );
  logger.output('</properties>\n');

  for (const problem of problems) {
    const location = getProblemLocation(problem, path);
    const level = problem.scorecardLevel || 'Unknown';
    const message = stripAnsiCodes(problem.message);
    const details = xmlEscape(formatProblemDetails(problem, location)).replaceAll('&#10;', '\n');

    logger.output(
      `<testcase classname="${xmlEscape(level)}" name="${xmlEscape(
        problem.ruleId
      )}" file="${xmlEscape(location.file)}" line="${location.line}">\n`
    );

    if (problem.severity === 'warn') {
      logger.output(`<skipped message="${xmlEscape(message)}">${details}</skipped>\n`);
    } else {
      logger.output(
        `<failure message="${xmlEscape(message)}" type="${xmlEscape(
          problem.ruleId
        )}">${details}</failure>\n`
      );
    }

    logger.output('</testcase>\n');
  }

  logger.output('</testsuite>\n');
  logger.output('</testsuites>\n\n');
}
