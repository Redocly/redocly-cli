import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

// The engine prints wall-clock timings; they are not stable across runs.
function normalizeTiming(output: string): string {
  return output.replace(/(Completed in|Failed after) \d+(\.\d+)?m?s/g, '$1 <time>');
}

const recheckCases: [dirName: string, args: string[]][] = [
  ['markdown-clean', ['recheck', 'docs']],
  ['markdown-findings', ['recheck', 'docs']],
  ['no-config', ['recheck', 'docs']],
  ['no-recheck-config', ['recheck', 'docs']],
  ['config-error', ['recheck', 'docs']],
  ['api-descriptions', ['recheck']],
];

describe('recheck', () => {
  test.each(recheckCases)('%s', async (dirName, args) => {
    const testPath = join(__dirname, dirName);
    const params = getParams(indexEntryPoint, args);
    const result = getCommandOutput(params, { testPath });
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('conflicting-flags rejects two action flags', async () => {
    const testPath = join(__dirname, 'conflicting-flags');
    const args = getParams(indexEntryPoint, [
      'recheck',
      'docs',
      '--readability',
      '--generate-baseline',
    ]);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain(
      'Use one of --readability, --generate-baseline, or --generate-markdoc-schema.'
    );
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('readability-json keeps stdout machine-readable', async () => {
    const testPath = join(__dirname, 'readability-json');
    const args = getParams(indexEntryPoint, ['recheck', 'docs', '--readability', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    const [stdout] = result.split('\n\n');
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(JSON.parse(stdout)).toHaveProperty('summary');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('output-path-warning writes no file for --format table', async () => {
    const testPath = join(__dirname, 'output-path-warning');
    const reportPath = join(testPath, 'report.txt');
    const args = getParams(indexEntryPoint, [
      'recheck',
      'docs',
      '--format=table',
      '--output-path=report.txt',
    ]);
    const result = getCommandOutput(args, { testPath });
    expect(existsSync(reportPath)).toBe(false);
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('generate-baseline writes the default baseline file', async () => {
    const testPath = join(__dirname, 'generate-baseline');
    const baselinePath = join(testPath, '.redocly.recheck-baseline.yaml');
    const args = getParams(indexEntryPoint, ['recheck', 'docs', '--generate-baseline']);
    try {
      const result = getCommandOutput(args, { testPath });
      expect(existsSync(baselinePath)).toBe(true);
      expect(readFileSync(baselinePath, 'utf8')).toContain('recheck/single-h1: 1');
      await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
        join(testPath, 'snapshot.txt')
      );
    } finally {
      rmSync(baselinePath, { force: true });
    }
  });

  test('markdoc-schema writes the schema from a theme module', async () => {
    const testPath = join(__dirname, 'markdoc-schema');
    const schemaPath = join(testPath, 'schema.yaml');
    const args = getParams(indexEntryPoint, [
      'recheck',
      '--generate-markdoc-schema',
      '--from=theme.js',
      '--out=schema.yaml',
    ]);
    try {
      const result = getCommandOutput(args, { testPath });
      expect(existsSync(schemaPath)).toBe(true);
      expect(readFileSync(schemaPath, 'utf8')).toContain('admonition:');
      await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
        join(testPath, 'snapshot.txt')
      );
    } finally {
      rmSync(schemaPath, { force: true });
    }
  });

  test('format-json keeps stdout machine-readable', async () => {
    const testPath = join(__dirname, 'format-json');
    const args = getParams(indexEntryPoint, ['recheck', 'docs', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    const [stdout] = result.split('\n\n');
    expect(() => JSON.parse(stdout)).not.toThrow();
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('format-sarif keeps stdout machine-readable', async () => {
    const testPath = join(__dirname, 'format-sarif');
    const args = getParams(indexEntryPoint, ['recheck', 'docs', '--format=sarif']);
    const result = getCommandOutput(args, { testPath });
    const [stdout] = result.split('\n\n');
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(JSON.parse(stdout)).toHaveProperty('version', '2.1.0');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('api-descriptions-json reports a JSON description with its pointer', async () => {
    const testPath = join(__dirname, 'api-descriptions-json');
    const args = getParams(indexEntryPoint, ['recheck', 'openapi.json', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    const [stdout] = result.split('\n\n');
    const report = JSON.parse(stdout);
    expect(report.issues[0]).toMatchObject({
      ruleName: 'recheck/line-length',
      line: 6,
      pointer: '#/info/description',
    });
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('api-unreadable reports an API description that does not parse', async () => {
    const testPath = join(__dirname, 'api-unreadable');
    const args = getParams(indexEntryPoint, ['recheck', 'broken.yaml']);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain('Could not read API description');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('yaml-page lints a YAML file that is not an API description as a page', async () => {
    const testPath = join(__dirname, 'yaml-page');
    const args = getParams(indexEntryPoint, ['recheck', 'notes.yaml']);
    const result = getCommandOutput(args, { testPath });
    expect(result).not.toContain('Could not read');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('apis-discovery lints the apis block when no paths are given', async () => {
    const testPath = join(__dirname, 'apis-discovery');
    const args = getParams(indexEntryPoint, ['recheck']);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain('Found 1 issue(s)');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('shared-description reports a description that two APIs share once', async () => {
    const testPath = join(__dirname, 'shared-description');
    const args = getParams(indexEntryPoint, ['recheck', 'a.yaml', 'b.yaml']);
    const result = getCommandOutput(args, { testPath });
    const sharedLines = result.split('\n').filter((line) => line.includes('schemas.yaml'));
    expect(sharedLines).toHaveLength(1);
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('api-no-descriptions reports no issues for an API without descriptions', async () => {
    const testPath = join(__dirname, 'api-no-descriptions');
    const args = getParams(indexEntryPoint, ['recheck', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    const [stdout] = result.split('\n\n');
    expect(JSON.parse(stdout).issues).toEqual([]);
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('ignore-short-name suppresses a finding keyed by the short rule name', async () => {
    const testPath = join(__dirname, 'ignore-short-name');
    const args = getParams(indexEntryPoint, ['recheck', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain('1 finding(s) suppressed by the ignore file.');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('readability-skips-api scores Markdown and skips the API description', async () => {
    const testPath = join(__dirname, 'readability-skips-api');
    const args = getParams(indexEntryPoint, ['recheck', 'openapi.yaml', 'docs', '--readability']);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain('Readability scores cover Markdown files only');
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });

  test('baseline-kept-on-unreadable-api leaves the baseline file unchanged', async () => {
    const testPath = join(__dirname, 'baseline-kept-on-unreadable-api');
    const baselinePath = join(testPath, '.redocly.recheck-baseline.yaml');
    const before = readFileSync(baselinePath, 'utf8');
    const args = getParams(indexEntryPoint, [
      'recheck',
      'docs',
      'broken.yaml',
      '--generate-baseline',
    ]);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain('Baseline not written');
    expect(readFileSync(baselinePath, 'utf8')).toBe(before);
    await expect(cleanupOutput(normalizeTiming(result))).toMatchFileSnapshot(
      join(testPath, 'snapshot.txt')
    );
  });
});
