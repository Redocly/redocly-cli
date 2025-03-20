import { outdent } from 'outdent';
import { yellow, inverse, bold, green, red, blue, gray } from 'colorette';
import * as path from 'node:path';
import { getExecutionTime } from '../../utils/time.js';
import { calculateTotals } from './calculate-tests-passed.js';
import { indent } from '../../utils/cli-outputs.js';
import { resolveRunningWorkflows } from '../flow-runner/index.js';
import { DefaultLogger } from '../../utils/logger/logger.js';

import type { ResultsOfTests, WorkflowExecutionResult } from '../../types.js';

const logger = DefaultLogger.getInstance();

export function displaySummary(
  startedAt: number,
  workflows: WorkflowExecutionResult[],
  argv?: { workflow?: string[]; skip?: string[]; file?: string }
) {
  const fileName = path.basename(argv?.file || '');
  const workflowArgv = resolveRunningWorkflows(argv?.workflow) || [];
  const skippedWorkflowArgv = resolveRunningWorkflows(argv?.skip) || [];

  let executedWorkflows =
    workflowArgv && workflowArgv.length
      ? workflows.filter(({ workflowId }) => workflowArgv.includes(workflowId))
      : workflows;

  executedWorkflows =
    skippedWorkflowArgv && skippedWorkflowArgv.length
      ? executedWorkflows.filter(({ workflowId }) => !skippedWorkflowArgv.includes(workflowId))
      : executedWorkflows;

  const totals = calculateTotals(executedWorkflows);

  const executionTime = getExecutionTime(startedAt);
  logger.printNewLine();
  logger.log(
    outdent`
        ${yellow(indent(`Summary for ${blue(fileName)}`, 2))}
        ${indent('', 2)}
        ${indent(formatWorkflowsTotals('Workflows:', totals.workflows), 2)}
        ${indent(formatTotals('Steps:', totals.steps), 2)}
        ${indent(formatTotals('Checks:', totals.checks), 2)}
        ${indent(inverse(`Time: ${executionTime}`), 2)}
  `
  );
  logger.printNewLine();
  logger.printNewLine();
}

function formatWorkflowsTotals(header: string, totals: ResultsOfTests): string {
  return (
    bold(header) +
    (totals.passed ? ` ${green(totals.passed + ' passed')},` : '') +
    (totals.failed ? ` ${red(totals.failed + ' failed')},` : '') +
    ` ${totals.total} total`
  );
}

function formatTotals(header: string, totals: ResultsOfTests): string {
  return (
    bold(header) +
    (totals.passed ? ` ${green(totals.passed + ' passed')},` : '') +
    (totals.failed ? ` ${red(totals.failed + ' failed')},` : '') +
    (totals.warnings ? ` ${yellow(totals.warnings + ' warnings')},` : '') +
    (totals.skipped ? ` ${gray(totals.skipped + ' ignored')},` : '') +
    ` ${totals.total} total`
  );
}
