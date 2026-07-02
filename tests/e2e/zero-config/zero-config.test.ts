import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('zero-config', () => {
  const folderPath = __dirname;

  test('default-recommended-fallback', async () => {
    const testPath = join(folderPath, 'default-recommended-fallback');
    const args = getParams(indexEntryPoint, ['lint', './openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('no-default-recommended-fallback', async () => {
    const testPath = join(folderPath, 'no-default-recommended-fallback');
    const args = getParams(indexEntryPoint, ['lint', './openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('no-default-recommended-fallback-with-empty-config', async () => {
    const testPath = join(folderPath, 'no-default-recommended-fallback-with-empty-config');
    const args = getParams(indexEntryPoint, ['lint', './openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});
