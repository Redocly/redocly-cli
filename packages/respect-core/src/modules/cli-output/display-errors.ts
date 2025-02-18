import { red, gray, underline, blue, yellow } from 'colorette';

import type { Workflow } from '../../types';

import { CHECKS } from '../checks';
import { indent, removeExtraIndentation, RESET_ESCAPE_CODE } from '../../utils/cli-outputs';
import { DefaultLogger } from '../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

export function displayErrors(workflows: Workflow[]) {
  logger.log(`${RESET_ESCAPE_CODE}\n${indent(red('Failed tests info:'), 2)}\n`);

  for (const workflow of workflows) {
    const hasProblems = workflow.steps.some((step) => step.checks.some((check) => !check.pass));

    if (!hasProblems) continue;

    logger.log(
      `${RESET_ESCAPE_CODE}\n${indent(gray('Workflow name:'), 2)} ${underline(workflow.workflowId)}${RESET_ESCAPE_CODE}\n`,
    );

    for (const step of workflow.steps) {
      const failedStepChecks = step.checks.filter((check) => !check.pass);

      if (!failedStepChecks.length) continue;

      logger.printNewLine();
      logger.log(
        indent(`${blue('stepId - ')}`, 4) +
          (step?.stepId ? red(step.stepId) : red(step?.operationId || step?.operationPath || '')),
      );

      for (const failedCheckIndex in failedStepChecks) {
        const { name, message, severity } = failedStepChecks[failedCheckIndex];
        const showErrorMessage = name !== CHECKS.UNEXPECTED_ERROR;
        const messageToDisplay = showErrorMessage
          ? indent(`${removeExtraIndentation(message)}${RESET_ESCAPE_CODE}\n`, 6)
          : indent(`Reason: ${message}`, 4);

        logger.printNewLine();

        if (severity === 'error') {
          logger.log(indent(`${red('✗')} ${gray(name.toLowerCase())}`, 4));
        } else if (severity === 'off') {
          logger.log(indent(`${gray('○')} ${gray(name.toLowerCase())} ${gray('(skipped)')}`, 4));
        } else {
          logger.log(indent(`${yellow('⚠')} ${gray(name.toLowerCase())}`, 4));
        }
        logger.printNewLine();
        logger.log(`${messageToDisplay}`);
      }
    }
  }
}
