import { pluralize } from 'jest-matcher-utils';
import { red, yellow, bold, blue } from 'colorette';

import type { Totals } from '@redocly/openapi-core';
import type { Check, VerboseLog } from '../types';

import { displayChecks } from '../modules/output';
import { DefaultLogger } from './logger/logger';

const logger = DefaultLogger.getInstance();
export const RESET_ESCAPE_CODE = '\x1B[0m';

export function removeExtraIndentation(message: string | undefined): string {
  if (!message) {
    return '';
  }
  // Split the message into individual lines
  const lines = message.split('\n');

  // Trim leading whitespace from each line
  const trimmedLines = lines.map((line) => line.trimStart());

  // Join the trimmed lines back into a single string
  return trimmedLines.join('\n');
}

export function indent(str: string, level: number) {
  return str
    .split('\n')
    .map((line) => '\xa0'.repeat(level) + line)
    .join('\n');
}

export function printWorkflowSeparatorLine() {
  logger.printSeparator('\u2500');
  logger.printNewLine();
  logger.printNewLine();
}

export function printWorkflowSeparator(fileName: string, workflowName: string | undefined) {
  printWorkflowSeparatorLine();
  logger.log(`  ${bold('Running workflow')} ${blue(`${fileName} / ${workflowName}`)}`);
  logger.printNewLine();
}

export function printDependentWorkflowSeparator(parentWorkflowId: string) {
  logger.printNewLine();
  logger.log(
    `  ${bold('Running required')} workflows for ${blue(parentWorkflowId)} ${RESET_ESCAPE_CODE}\n`
  );
}

export function printStepWorkflowSeparator(parentStepId: string, parentWorkflowId: string) {
  logger.printNewLine();
  logger.log(`  ${bold('Running step')} ${blue(parentStepId)} workflow ${blue(parentWorkflowId)}`);
  logger.printNewLine();
}

export function printStepSeparatorLine() {
  logger.printNewLine();
}

export function printConfigLintTotals(totals: Totals): void {
  if (totals.errors > 0) {
    logger.error(
      red(
        `❌  Your config has ${totals.errors} ${pluralize(
          'error',
          totals.errors
        )}.${RESET_ESCAPE_CODE}`
      )
    );
  } else if (totals.warnings > 0) {
    logger.error(
      yellow(
        `⚠️  Your config has ${totals.warnings} ${pluralize(
          'warning',
          totals.warnings
        )}.${RESET_ESCAPE_CODE}`
      )
    );
  }
}

export function printStepDetails({
  testNameToDisplay,
  checks,
  verboseLogs,
  verboseResponseLogs,
}: {
  testNameToDisplay: string;
  checks: Check[];
  verboseLogs?: VerboseLog;
  verboseResponseLogs?: VerboseLog;
}) {
  printStepSeparatorLine();
  displayChecks(testNameToDisplay, checks, verboseLogs, verboseResponseLogs);
}
