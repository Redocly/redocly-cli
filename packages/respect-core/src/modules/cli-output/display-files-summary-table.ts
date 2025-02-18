import { green, red, gray, yellow } from 'colorette';
import * as path from 'path';

import type { Workflow } from '../../types';

import { calculateTotals } from './calculate-tests-passed';
import { RESET_ESCAPE_CODE } from '../../utils/cli-outputs';
import { DefaultLogger } from '../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

export function displayFilesSummaryTable(
  filesResult: {
    file: string;
    hasProblems: boolean;
    workflows: Workflow[];
    argv?: { workflow?: string[]; skip?: string[] };
  }[],
) {
  const DEFAULT_FILENAME_PADDING = 40;
  const maxFilenameLength = Math.max(
    ...filesResult.map(({ file }) => path.basename(file).length + DEFAULT_FILENAME_PADDING),
  );

  const columns = [
    { name: 'Filename', width: maxFilenameLength },
    { name: 'Workflows', width: 10 },
    { name: 'Passed', width: 7 },
    { name: 'Failed', width: 7 },
    { name: 'Warnings', width: 8 },
    { name: 'Skipped', width: 7 },
  ];

  let output = '';

  // Top line
  output += `${gray(`┌${columns.map((col) => '─'.repeat(col.width + 2)).join('┬')}┐`)}\n`;

  // Header
  output += `${gray(`│${columns.map((col) => ` ${col.name.padEnd(col.width)} `).join('│')}│`)}\n`;

  // Separator
  output += `${gray(`├${columns.map((col) => '─'.repeat(col.width + 2)).join('┼')}┤`)}\n`;

  // Data rows
  filesResult.forEach(({ file, workflows, argv }) => {
    const fileName = path.basename(file);
    const workflowArgv = argv?.workflow || [];
    const skippedWorkflowArgv = argv?.skip || [];

    let executedWorkflows =
      workflowArgv && workflowArgv.length
        ? workflows.filter(({ workflowId }) => workflowArgv.includes(workflowId))
        : workflows;
    executedWorkflows =
      skippedWorkflowArgv && skippedWorkflowArgv.length
        ? executedWorkflows.filter(({ workflowId }) => !skippedWorkflowArgv.includes(workflowId))
        : executedWorkflows;

    const { workflows: testWorkflows } = calculateTotals(executedWorkflows);
    const total = gray(testWorkflows.total.toString().padEnd(11));
    const passed = green(testWorkflows.passed.toString().padEnd(8));
    const failed =
      testWorkflows.failed > 0
        ? red(testWorkflows.failed.toString().padEnd(8))
        : gray('-'.padEnd(8));

    const warnings =
      testWorkflows.warnings > 0
        ? yellow(testWorkflows.warnings.toString().padEnd(9))
        : gray('-'.padEnd(9));
    const skipped =
      testWorkflows.skipped > 0
        ? gray(testWorkflows.skipped.toString().padEnd(8))
        : gray('-'.padEnd(8));

    // First pad the content, then add colors
    const statusSymbol = testWorkflows.failed > 0 ? 'x' : '✓';
    const paddedContent = `${statusSymbol} ${fileName}`.padEnd(maxFilenameLength + 1);
    const fileNameWithStatus = testWorkflows.failed > 0 ? red(paddedContent) : green(paddedContent);

    output +=
      gray('│') +
      ` ${fileNameWithStatus}` +
      gray('│') +
      ` ${total}` +
      gray('│') +
      ` ${passed}` +
      gray('│') +
      ` ${failed}` +
      gray('│') +
      ` ${warnings}` +
      gray('│') +
      ` ${skipped}` +
      gray('│') +
      '\n';
  });

  // Bottom line
  output += `${gray(`└${columns.map((col) => '─'.repeat(col.width + 2)).join('┴')}┘`)}${RESET_ESCAPE_CODE}\n`;

  // Add a single reset at the very end
  logger.log(output);
}
