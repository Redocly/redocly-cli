import { type LoggerInterface } from '@redocly/openapi-core';
import { calculateTotals, type WorkflowExecutionResult } from '@redocly/respect-core';
import { green, red, gray, yellow } from 'colorette';
import * as path from 'node:path';

export function displayFilesSummaryTable(
  filesResult: {
    file: string;
    executedWorkflows: WorkflowExecutionResult[];
  }[],
  logger: LoggerInterface
) {
  const DEFAULT_FILENAME_PADDING = 40;
  const maxFilenameLength = Math.max(
    ...filesResult.map(({ file }) => path.basename(file).length + DEFAULT_FILENAME_PADDING)
  );

  const columns = [
    { name: 'Filename', width: maxFilenameLength },
    { name: 'Workflows', width: 10 },
    { name: 'Passed', width: 7 },
    { name: 'Failed', width: 7 },
    { name: 'Warnings', width: 8 },
  ];

  let output = '';

  // Top line
  output += `${gray(`┌${columns.map((col) => '─'.repeat(col.width + 2)).join('┬')}┐`)}\n`;

  // Header
  output += `${gray(`│${columns.map((col) => ` ${col.name.padEnd(col.width)} `).join('│')}│`)}\n`;

  // Separator
  output += `${gray(`├${columns.map((col) => '─'.repeat(col.width + 2)).join('┼')}┤`)}\n`;

  // Data rows
  filesResult.forEach(({ file, executedWorkflows }) => {
    const fileName = path.basename(file);
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
      '\n';
  });

  // Bottom line
  output += `${gray(`└${columns.map((col) => '─'.repeat(col.width + 2)).join('┴')}┘`)}\n`;

  logger.output(output);
}
