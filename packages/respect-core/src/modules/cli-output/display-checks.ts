import { blue, yellow, green, gray, red } from 'colorette';
import { outdent } from 'outdent';
import { combineUrl } from '../../utils/url.js';
import { isJSON } from '../../utils/is-json.js';
import { indent, RESET_ESCAPE_CODE } from '../../utils/cli-outputs.js';

import type { LoggerInterface, RuleSeverity } from '@redocly/openapi-core';
import type { Check, VerboseLog } from '../../types.js';

const MAX_CRITERIA_CONDITION_DISPLAY_LENGTH = 50;

export function displayChecks({
  testNameToDisplay,
  checks,
  verboseLogs,
  verboseResponseLogs,
  logger,
}: {
  testNameToDisplay: string;
  checks: Check[];
  verboseLogs?: VerboseLog;
  verboseResponseLogs?: VerboseLog;
  logger: LoggerInterface;
}) {
  const allChecksPassed = checks.every(({ passed }) => passed);
  logger.output(`  ${allChecksPassed ? green('✓') : red('✗')} ${blue(testNameToDisplay)}`);

  if (verboseLogs) {
    logger.output(
      `${RESET_ESCAPE_CODE}\n` + (displayVerboseLogs({ logs: verboseLogs, logger }) || '')
    );
    logger.printNewLine();
  }
  if (verboseResponseLogs) {
    logger.output(
      `${RESET_ESCAPE_CODE}\n` +
        (displayVerboseLogs({ logs: verboseResponseLogs, type: 'response', logger }) || '')
    );
    logger.printNewLine();
  }
  logger.printNewLine();

  for (const check of checks) {
    logger.output(`${indent(displayCheckInfo(check, check.severity), 4)}\n`);
  }
}

function displayCheckInfo(check: Check, severity: RuleSeverity): string {
  const { name: checkName, passed, condition } = check;

  const icon = passed ? green('✓') : severity === 'warn' ? yellow('⚠') : red('✗');
  const color = passed ? green : red;

  return `${icon} ${gray(checkName.toLowerCase())}${
    condition
      ? ` - ${color(
          condition.length > MAX_CRITERIA_CONDITION_DISPLAY_LENGTH
            ? condition.slice(0, MAX_CRITERIA_CONDITION_DISPLAY_LENGTH) + '...'
            : condition
        )}`
      : ''
  }`;
}

function displayVerboseLogs({
  logs,
  type = 'request',
  logger,
}: {
  logs: VerboseLog;
  type?: 'request' | 'response';
  logger: LoggerInterface;
}): string {
  const { path, host, headerParams, body, statusCode } = logs;
  const responseTime = process.env.NODE_ENV === 'test' ? '<test>' : logs.responseTime;

  const urlString = indent(`Request URL: ${blue(combineUrl(host, path))}`, 4);
  const requestHeadersString = indent(`Request Headers:`, 4);
  const responseHeadersString = indent(`Response Headers:`, 4);
  const requestBodyString = indent(`Request Body:`, 4);
  const responseBodyString = indent(`Response Body:`, 4);
  const headersString = generateHeaderString(headerParams || {});
  const formattedBody = body
    ? isJSON(body)
      ? JSON.stringify(JSON.parse(body), null, 2)
      : body
    : undefined;

  const indentedBody = formattedBody
    ? formattedBody
        .split('\n')
        .map((line: string) => blue(indent(`${line}`, 6)))
        .join('\n')
    : undefined;

  const bodyString = indentedBody;

  const requestOutput = [
    logger.printNewLine(),
    gray(urlString),
    headersString && gray(requestHeadersString),
    headersString && gray(headersString),
    body && gray(requestBodyString),
    body && bodyString,
  ]
    .filter(Boolean)
    .join(`${RESET_ESCAPE_CODE}\n`);

  const responseOutput = [
    gray(indent('Response status code: ' + blue(statusCode as number), 4)),
    gray(indent('Response time: ' + blue(responseTime as number), 4) + ' ms'),
    headersString && gray(responseHeadersString),
    headersString && gray(headersString),
    body && gray(responseBodyString),
    body && bodyString,
  ]
    .filter(Boolean)
    .join(`${RESET_ESCAPE_CODE}\n`);

  return type === 'request' ? outdent`${requestOutput}` : outdent`${responseOutput}`;
}

function generateHeaderString(headerParams: Record<string, string>): string {
  let compiledString = '';
  const entries = Object.entries(headerParams);

  entries.forEach(([key, value], index) => {
    compiledString = compiledString + indent(`${yellow(key)}: ${blue(value)}`, 6);

    if (index < entries.length - 1) {
      compiledString += `${RESET_ESCAPE_CODE}\n`;
    }
  });

  return compiledString;
}
