import { red, yellow } from 'colorette';

import type { Workflow } from '../../types';

import { DefaultLogger } from '../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

export function getWorkflowsToRun(
  workflows: Workflow[],
  workflowsToRun: string[] | undefined,
  workflowsToSkip: string[] | undefined,
): Workflow[] {
  let filteredWorkflows: Workflow[] = [];

  if (workflowsToRun && workflowsToRun.length) {
    filteredWorkflows = filterWorkflowsToRun(workflows, workflowsToRun);
  } else if (workflowsToSkip && workflowsToSkip.length) {
    filteredWorkflows = filterWorkflowsToSkip(workflows, workflowsToSkip);
  } else {
    filteredWorkflows = workflows;
  }

  return filteredWorkflows;
}

function filterWorkflowsToSkip(workflows: Workflow[], workflowsToSkip: string[]) {
  const workflowsToRun = workflows.filter(
    (workflow) => !workflowsToSkip.includes(workflow.workflowId),
  );

  if (!workflowsToRun.length) {
    logger.log(`${red('All workflows are skipped')}`);
    logger.printNewLine();
    return [];
  }

  logger.log(`${yellow(`Following workflows are skipped: ${workflowsToSkip.join(', ')}`)}`);
  logger.printNewLine();

  return workflowsToRun;
}

function filterWorkflowsToRun(workflows: Workflow[], workflowsToRun: string[]) {
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

    logger.log(`Following workflows don't exist: ${notExistingWorkflows.join(', ')}`);
    return filteredWorkflows;
  }
}

function filterWorkflowsByIds(workflows: Workflow[], workflowIds: string[]) {
  return workflows.filter((workflow) => workflowIds.includes(workflow.workflowId));
}
