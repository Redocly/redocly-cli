import { pluralize } from 'jest-matcher-utils'; // TODO: decide what to use: jest-matcher-utils or pluralize
import { red, yellow, bold, blue } from 'colorette';
import { type LoggerInterface, type Totals } from '@redocly/openapi-core';
import { type Check, type VerboseLog, type Step } from '../types.js';
import { displayChecks } from '../modules/cli-output/index.js';

export const RESET_ESCAPE_CODE = process.env.NO_COLOR ? '' : '\x1B[0m';

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

export function printWorkflowSeparatorLine(logger: LoggerInterface) {
  logger.printSeparator('\u2500');
  logger.printNewLine();
  logger.printNewLine();
}

export function printWorkflowSeparator({
  fileName,
  workflowName,
  skipLineSeparator,
  logger,
}: {
  fileName: string;
  workflowName: string | undefined;
  skipLineSeparator?: boolean;
  logger: LoggerInterface;
}) {
  if (!skipLineSeparator) {
    printWorkflowSeparatorLine(logger);
  }
  logger.output(`  ${bold('Running workflow')} ${blue(`${fileName} / ${workflowName}`)}`);
  logger.printNewLine();
}

export function printRequiredWorkflowSeparator(parentWorkflowId: string, logger: LoggerInterface) {
  logger.printNewLine();
  logger.output(
    `  ${bold('Running required')} workflow for ${blue(parentWorkflowId)}${RESET_ESCAPE_CODE}\n`
  );
}

export function printChildWorkflowSeparator(parentStepId: string, logger: LoggerInterface) {
  logger.printNewLine();
  logger.output(
    `  ${bold('Running child')} workflow for the step ${blue(parentStepId)}${RESET_ESCAPE_CODE}`
  );
  logger.printNewLine();
}

export function printActionsSeparator({
  stepId,
  actionName,
  kind,
  logger,
}: {
  stepId: string;
  actionName: string;
  kind: 'failure' | 'success';
  logger: LoggerInterface;
}) {
  logger.printNewLine();
  logger.output(
    `  ${bold(`Running ${kind} action`)} ${blue(actionName)} for the step ${blue(
      stepId
    )}${RESET_ESCAPE_CODE}`
  );
  logger.printNewLine();
}

export function printStepSeparatorLine(logger: LoggerInterface) {
  logger.printNewLine();
}

export function printConfigLintTotals(totals: Totals, logger: LoggerInterface): void {
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
  logger,
}: {
  testNameToDisplay: string;
  checks: Check[];
  verboseLogs?: VerboseLog;
  verboseResponseLogs?: VerboseLog;
  logger: LoggerInterface;
}) {
  printStepSeparatorLine(logger);
  displayChecks({ testNameToDisplay, checks, verboseLogs, verboseResponseLogs, logger });
}

export function printUnknownStep(step: Step, logger: LoggerInterface) {
  printStepSeparatorLine(logger);
  displayChecks({ testNameToDisplay: step.stepId, checks: step.checks, logger });
}
