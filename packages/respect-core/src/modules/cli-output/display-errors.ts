import { red, gray, underline, blue, yellow } from 'colorette';
import { CHECKS } from '../checks/index.js';
import { indent, removeExtraIndentation, RESET_ESCAPE_CODE } from '../../utils/cli-outputs.js';

import type { Step, WorkflowExecutionResult } from '../../types.js';
import type { LoggerInterface } from '@redocly/openapi-core';

function flattenNestedSteps(steps: (Step | WorkflowExecutionResult)[]): Step[] {
  return steps.flatMap((step) => {
    if ('executedSteps' in step) {
      return flattenNestedSteps((step as WorkflowExecutionResult).executedSteps);
    }
    return [step];
  });
}

export function displayErrors(workflows: WorkflowExecutionResult[], logger: LoggerInterface) {
  logger.output(`${RESET_ESCAPE_CODE}\n${indent(red('Failed tests info:'), 2)}\n`);

  for (const workflow of workflows) {
    const steps = flattenNestedSteps(workflow.executedSteps);
    const hasProblems = steps.some(
      (step) =>
        step.checks.some((check) => !check.passed) && (!step.retriesLeft || step.retriesLeft === 0)
    );

    if (!hasProblems) continue;

    logger.output(
      `${RESET_ESCAPE_CODE}\n${indent(gray('Workflow name:'), 2)} ${underline(
        workflow.workflowId
      )}${RESET_ESCAPE_CODE}\n`
    );

    for (const step of steps) {
      const failedStepChecks = step.checks.filter((check) => !check.passed);

      if (!failedStepChecks.length) continue;
      if (step.retriesLeft && step.retriesLeft !== 0) continue;

      logger.printNewLine();
      logger.output(
        indent(`${blue('stepId - ')}`, 4) +
          (step?.stepId ? red(step.stepId) : red(step?.operationId || step?.operationPath || ''))
      );

      for (const failedCheckIndex in failedStepChecks) {
        const { name, message, severity } = failedStepChecks[failedCheckIndex];
        const showRespectInnerErrorMessage = [
          CHECKS.UNEXPECTED_ERROR,
          CHECKS.GLOBAL_TIMEOUT_ERROR,
          CHECKS.MAX_STEPS_REACHED_ERROR,
        ].includes(name);
        const messageToDisplay = showRespectInnerErrorMessage
          ? indent(`Reason: ${message}`, 4)
          : indent(`${removeExtraIndentation(message)}${RESET_ESCAPE_CODE}\n`, 6);

        logger.printNewLine();

        if (severity === 'error') {
          logger.output(indent(`${red('✗')} ${gray(name.toLowerCase())}`, 4));
        } else if (severity === 'off') {
          logger.output(indent(`${gray('○')} ${gray(name.toLowerCase())} ${gray('(skipped)')}`, 4));
        } else {
          logger.output(indent(`${yellow('⚠')} ${gray(name.toLowerCase())}`, 4));
        }
        logger.printNewLine();
        logger.output(`${messageToDisplay}`);
      }
    }
  }
}
