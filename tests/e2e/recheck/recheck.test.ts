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
});
