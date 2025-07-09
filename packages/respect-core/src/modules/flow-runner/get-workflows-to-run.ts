import { type LoggerInterface } from '@redocly/openapi-core';
import { red, yellow } from 'colorette';

import type { Workflow } from '../../types.js';

export function getWorkflowsToRun({
  workflows,
  workflowsToRun,
  workflowsToSkip,
  logger,
}: {
  workflows: Workflow[];
  workflowsToRun: string[] | undefined;
  workflowsToSkip: string[] | undefined;
  logger: LoggerInterface;
}): Workflow[] {
  let filteredWorkflows: Workflow[] = [];

  if (workflowsToRun && workflowsToRun.length) {
    filteredWorkflows = filterWorkflowsToRun(workflows, workflowsToRun, logger);
  } else if (workflowsToSkip && workflowsToSkip.length) {
    filteredWorkflows = filterWorkflowsToSkip(workflows, workflowsToSkip, logger);
  } else {
    filteredWorkflows = workflows;
  }

  return filteredWorkflows;
}

function filterWorkflowsToSkip(
  workflows: Workflow[],
  workflowsToSkip: string[],
  logger: LoggerInterface
) {
  const workflowsToRun = workflows.filter(
    (workflow) => !workflowsToSkip.includes(workflow.workflowId)
  );

  if (!workflowsToRun.length) {
    logger.output(`${red('All workflows are skipped')}`);
    logger.printNewLine();
    return [];
  }

  logger.output(`${yellow(`Following workflows are skipped: ${workflowsToSkip.join(', ')}`)}`);
  logger.printNewLine();

  return workflowsToRun;
}

function filterWorkflowsToRun(
  workflows: Workflow[],
  workflowsToRun: string[],
  logger: LoggerInterface
) {
  const filteredWorkflows = filterWorkflowsByIds(workflows, workflowsToRun);

  if (!filteredWorkflows.length) {
    throw new Error(`Following workflows don't exist: ${workflowsToRun.join(', ')}`);
  }

  if (filteredWorkflows.length === workflowsToRun.length) {
    return filteredWorkflows;
  } else {
    const notExistingWorkflows = workflowsToRun.filter((workflowId) => {
      return !workflows.find((workflow) => workflow.workflowId === workflowId);
    });

    logger.output(`Following workflows don't exist: ${notExistingWorkflows.join(', ')}`);
    return filteredWorkflows;
  }
}

function filterWorkflowsByIds(workflows: Workflow[], workflowIds: string[]) {
  return workflows.filter((workflow) => workflowIds.includes(workflow.workflowId));
}
