import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

test('should show the coverage of every OpenAPI source description with --coverage', () => {
  const args = getParams(indexEntryPoint, ['respect', 'menu.arazzo.yaml', '--coverage']);

  const result = getCommandOutput(args, { testPath: __dirname });
  expect(result).toMatchSnapshot();
}, 60_000);

test('should measure a description that several files use for all of them together', () => {
  const args = getParams(indexEntryPoint, [
    'respect',
    'menu.arazzo.yaml',
    'menu-errors.arazzo.yaml',
    '--coverage',
  ]);

  const result = getCommandOutput(args, { testPath: __dirname });
  expect(result).toMatchSnapshot();
}, 60_000);

test('should list the covered and the not covered items of every operation with --verbose', () => {
  const args = getParams(indexEntryPoint, [
    'respect',
    'menu-errors.arazzo.yaml',
    '--coverage',
    '--verbose',
  ]);

  const result = getCommandOutput(args, { testPath: __dirname });
  expect(result).toMatchSnapshot();
}, 60_000);

test('should keep the result of the run when the coverage cannot be measured', () => {
  const args = getParams(indexEntryPoint, [
    'respect',
    'menu-unnamed-parameter.arazzo.yaml',
    '--coverage',
  ]);

  const result = getCommandOutput(args, { testPath: __dirname });
  expect(result).toMatchSnapshot();
}, 60_000);

test('should write the coverage of a file to the --json-output file', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'respect-coverage-'));
  const jsonOutputPath = join(outputDir, 'logs.json');

  try {
    const args = getParams(indexEntryPoint, [
      'respect',
      'menu-errors.arazzo.yaml',
      '--coverage',
      '--json-output',
      jsonOutputPath,
    ]);
    getCommandOutput(args, { testPath: __dirname });

    const { coverage } = JSON.parse(readFileSync(jsonOutputPath, 'utf-8')).files[
      'menu-errors.arazzo.yaml'
    ];
    // the location of a description is absolute, so the snapshot keeps it relative to the test
    const [{ url, ...description }] = coverage;
    expect({ url: relative(__dirname, url), ...description }).toMatchSnapshot();
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
}, 60_000);
