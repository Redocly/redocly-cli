import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('stats', () => {
  const folderPath = __dirname;

  test('stats should produce correct output (stylish format)', async () => {
    const testPath = join(folderPath, 'stats-stylish');
    const args = getParams(indexEntryPoint, ['stats', 'museum.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('stats should produce correct JSON output', async () => {
    const testPath = join(folderPath, 'stats-json');
    const args = getParams(indexEntryPoint, ['stats', 'museum.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('stats should produce correct Markdown format', async () => {
    const testPath = join(folderPath, 'stats-markdown');
    const args = getParams(indexEntryPoint, ['stats', 'museum.yaml', '--format=markdown']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('stats should support AsyncAPI 2.x (stylish format)', async () => {
    const testPath = join(folderPath, 'stats-async2-stylish');
    const args = getParams(indexEntryPoint, ['stats', 'async.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('stats should support AsyncAPI 2.x (JSON format)', async () => {
    const testPath = join(folderPath, 'stats-async2-json');
    const args = getParams(indexEntryPoint, ['stats', 'async.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('stats should support AsyncAPI 3.x (stylish format)', async () => {
    const testPath = join(folderPath, 'stats-async3-stylish');
    const args = getParams(indexEntryPoint, ['stats', 'asyncapi3.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});
