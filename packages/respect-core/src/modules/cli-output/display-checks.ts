import { blue, yellow, green, gray, red } from 'colorette';
import { outdent } from 'outdent';

import type { Check, VerboseLog } from '../../types';
import type { RuleSeverity } from '@redocly/openapi-core/lib/config/types';

import { combineUrl } from '../../utils/url';
import { isJSON } from '../../utils/is-json';
import { indent, RESET_ESCAPE_CODE } from '../../utils/cli-outputs';
import { DefaultLogger } from '../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

export function displayChecks(
  testNameToDisplay: string,
  checks: Check[],
  verboseLogs?: VerboseLog,
  verboseResponseLogs?: VerboseLog
) {
  const allChecksPassed = checks.every(({ pass }) => pass);
  logger.log(`  ${allChecksPassed ? green('✓') : red('✗')} ${blue(testNameToDisplay)}`);

  if (verboseLogs) {
    logger.log(`${RESET_ESCAPE_CODE}\n` + (displayVerboseLogs(verboseLogs) || ''));
    logger.printNewLine();
  }
  if (verboseResponseLogs) {
    logger.log(
      `${RESET_ESCAPE_CODE}\n` + (displayVerboseLogs(verboseResponseLogs, 'response') || '')
    );
    logger.printNewLine();
  }
  logger.printNewLine();

  for (const check of checks) {
    const { name: checkName, pass, severity } = check;
    const passTestMessage = (checkName: string) =>
      `${green('✓')} ${gray(checkName.toLowerCase())}${
        check?.additionalMessage ? ` (${check.additionalMessage})` : ''
      }`;

    const failTestMessage = (checkName: string, severity?: RuleSeverity) =>
      `${severity === 'warn' ? yellow('⚠') : red('✗')} ${gray(checkName.toLowerCase())}${
        check?.additionalMessage ? ' (' + check.additionalMessage + ')' : ''
      }`;

    logger.log(
      `${
        pass
          ? indent(passTestMessage(checkName), 4)
          : indent(failTestMessage(checkName, severity), 4)
      }\n`
    );
  }
}

function displayVerboseLogs(logs: VerboseLog, type: 'request' | 'response' = 'request'): string {
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
