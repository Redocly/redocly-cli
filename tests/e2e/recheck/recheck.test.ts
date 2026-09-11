import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

// The engine prints wall-clock timings; they are not stable across runs.
function normalizeTiming(output: string): string {
  return output.replace(/(Completed in|Failed after) \d+(\.\d+)?m?s/g, '$1 <time>');
}

describe('recheck', () => {
  test.each(['markdown-clean', 'markdown-findings', 'no-config'])('%s', async (dirName) => {
    const testPath = join(__dirname, dirName);
    const args = getParams(indexEntryPoint, ['recheck', 'docs']);
    const result = getCommandOutput(args, { testPath });
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
});
