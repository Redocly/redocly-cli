import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('map', () => {
  const folderPath = __dirname;

  test('map should produce correct output (stylish format)', async () => {
    const testPath = join(folderPath, 'map-stylish');
    const args = getParams(indexEntryPoint, ['map', 'cafe.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('map should produce correct JSON output with source locations', async () => {
    const testPath = join(folderPath, 'map-json');
    const args = getParams(indexEntryPoint, [
      'map',
      'openapi.yaml',
      '--format=json',
      '--source-locations',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('map should produce column-precise locations for a JSON description', async () => {
    const testPath = join(folderPath, 'map-json-file');
    const args = getParams(indexEntryPoint, [
      'map',
      'cafe.json',
      '--format=json',
      '--source-locations',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('map should retrieve the content at a pointer', async () => {
    const testPath = join(folderPath, 'map-pointer');
    const args = getParams(indexEntryPoint, ['map', 'openapi.yaml', '--pointer=#/paths/~1menu']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('map should report an error for an unknown pointer', async () => {
    const testPath = join(folderPath, 'map-pointer');
    const args = getParams(indexEntryPoint, ['map', 'openapi.yaml', '--pointer=#/paths/~1nope']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'snapshot-not-found.txt')
    );
  });

  test('map should support AsyncAPI 2.x (stylish format)', async () => {
    const testPath = join(folderPath, 'map-async2-stylish');
    const args = getParams(indexEntryPoint, ['map', 'async.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('map should support AsyncAPI 3.0 (stylish format)', async () => {
    const testPath = join(folderPath, 'map-async3-stylish');
    const args = getParams(indexEntryPoint, ['map', 'asyncapi3.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});
