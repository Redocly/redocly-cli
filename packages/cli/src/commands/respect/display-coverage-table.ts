import { type LoggerInterface } from '@redocly/openapi-core';
import {
  calculateCoverage,
  type CoverageCount,
  type CoverageItem,
  type OperationCoverage,
  type RunFileResult,
  type SourceDescriptionCoverage,
} from '@redocly/respect-core';
import { bold, gray, green, red, yellow } from 'colorette';
import * as path from 'node:path';

interface Cell {
  text: string;
  paint: (text: string) => string;
}

// a missing cell is rendered empty
type Row = (Cell | undefined)[];

interface ItemGroup {
  title: string;
  // the name of an item that belongs to the group
  nameOf: (item: CoverageItem) => string | undefined;
}

export function displayCoverageTable(
  filesResult: RunFileResult[],
  logger: LoggerInterface,
  verbose?: boolean
) {
  // a file whose coverage could not be measured got a warning during the run, and is left out
  const measuredFiles = filesResult.filter(({ coverage }) => coverage);
  if (measuredFiles.length === 0) {
    return;
  }

  const sections = measuredFiles.map(({ file, coverage = [] }) => ({
    title: path.basename(file),
    descriptions: coverage.map((description) => ({ label: description.name, description })),
  }));

  if (measuredFiles.length > 1) {
    // several files can use the same API description, so it is measured again for all of them together
    sections.push({
      title: 'All files',
      descriptions: calculateCoverage(measuredFiles).map((description) => ({
        label: description.url,
        description,
      })),
    });
  }

  const totalDescriptions = sections[sections.length - 1].descriptions;
  if (totalDescriptions.length === 0) {
    logger.output(
      '  API coverage is not measured, because no OpenAPI source description is used.\n'
    );
    return;
  }

  const rows: Row[] = sections.flatMap(({ title, descriptions }) => [
    [{ text: title, paint: bold }],
    ...descriptions.map(({ label, description: { totals } }) => [
      { text: `  ${label}`, paint: plain },
      formatCount(totals.operations),
      formatCount(totals.parameters),
      formatCount(totals.properties),
      formatCount(totals.responses),
    ]),
  ]);
  let output = renderTable(
    ['API coverage', 'Operations', 'Parameters', 'Schema properties', 'Response codes'],
    rows
  );

  for (const { label, description } of totalDescriptions) {
    output += verbose
      ? formatOperationsDetails(label, description)
      : formatNotCoveredOperations(label, description);
  }

  logger.output(output);
}

function plain(text: string): string {
  return text;
}

function renderTable(headers: string[], rows: Row[]): string {
  const widths = headers.map((header, columnIndex) =>
    Math.max(header.length, ...rows.map((row) => row[columnIndex]?.text.length ?? 0))
  );
  const line = (left: string, middle: string, right: string) =>
    gray(`${left}${widths.map((width) => '─'.repeat(width + 2)).join(middle)}${right}`);

  let output = `${line('┌', '┬', '┐')}\n`;
  output += `${gray(`│${headers.map((header, columnIndex) => ` ${header.padEnd(widths[columnIndex])} `).join('│')}│`)}\n`;
  output += `${line('├', '┼', '┤')}\n`;
  for (const row of rows) {
    const cells = widths.map((width, columnIndex) => {
      const { text, paint } = row[columnIndex] ?? { text: '', paint: plain };
      // pad the text first, then add the colors
      return ` ${paint(text.padEnd(width))} `;
    });
    output += `${gray('│')}${cells.join(gray('│'))}${gray('│')}\n`;
  }
  output += `${line('└', '┴', '┘')}\n`;

  return output;
}

function formatCount({ covered, total }: CoverageCount): Cell {
  if (total === 0) {
    return { text: '-', paint: gray };
  }
  const percent = Math.floor((covered / total) * 100);

  return {
    text: `${percent}% (${covered}/${total})`,
    paint: percent >= 80 ? green : percent >= 50 ? yellow : red,
  };
}

function formatOperation({ method, path: operationPath, operationId }: OperationCoverage): string {
  return `${method} ${operationPath}${operationId ? ` (${operationId})` : ''}`;
}

function formatNotCoveredOperations(label: string, description: SourceDescriptionCoverage): string {
  const notCovered = description.operations.filter(({ missing }) =>
    missing.some((item) => item.kind === 'operation')
  );
  if (notCovered.length === 0) {
    return '';
  }

  const lines = notCovered.map((operation) => `    ${formatOperation(operation)}`);

  return `\n  Operations of ${bold(label)} that no step called:\n${lines.join('\n')}\n`;
}

function formatOperationsDetails(label: string, description: SourceDescriptionCoverage): string {
  const rows = description.operations.flatMap(formatOperationRows);

  return `\n${renderTable([`Operations of ${label}`, 'Items', 'Covered', 'Not covered'], rows)}`;
}

// The covered and the not covered items of an operation side by side, group by group.
function formatOperationRows(operation: OperationCoverage): Row[] {
  const { covered, missing, missingProperties = 0 } = operation;
  const isCalled = covered.some((item) => item.kind === 'operation');
  const operationCell: Cell = {
    text: `${isCalled ? '✓' : 'x'} ${formatOperation(operation)}`,
    paint: isCalled ? green : red,
  };

  const statuses = [...covered, ...missing]
    .flatMap((item) => (item.kind === 'response' ? [item.status] : []))
    .sort();
  const requestProperties: ItemGroup = {
    title: 'Request properties',
    nameOf: (item) =>
      item.kind === 'property' && item.target === 'request' ? item.path : undefined,
  };
  const responseProperties = statuses.map((status): ItemGroup => ({
    title: `Response ${status} properties`,
    nameOf: (item) => (item.kind === 'property' && item.status === status ? item.path : undefined),
  }));
  const groups: ItemGroup[] = [
    {
      title: 'Parameters',
      nameOf: (item) => (item.kind === 'parameter' ? `${item.name} (${item.in})` : undefined),
    },
    requestProperties,
    {
      title: 'Response codes',
      nameOf: (item) => (item.kind === 'response' ? item.status : undefined),
    },
    ...responseProperties,
  ];

  const rows: Row[] = [];
  for (const { title, nameOf } of groups) {
    const coveredNames = covered.flatMap((item) => nameOf(item) ?? []);
    const missingNames = missing.flatMap((item) => nameOf(item) ?? []);

    for (let index = 0; index < Math.max(coveredNames.length, missingNames.length); index++) {
      rows.push([
        rows.length === 0 ? operationCell : undefined,
        index === 0 ? { text: title, paint: plain } : undefined,
        { text: coveredNames[index] ?? '', paint: green },
        { text: missingNames[index] ?? '', paint: red },
      ]);
    }
  }

  // the properties of an operation that no step called are counted instead of being listed
  if (missingProperties > 0) {
    rows.push([
      rows.length === 0 ? operationCell : undefined,
      { text: 'Schema properties', paint: plain },
      undefined,
      { text: `${missingProperties} not covered`, paint: red },
    ]);
  }

  return rows.length > 0 ? rows : [[operationCell]];
}
