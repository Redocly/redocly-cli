import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('miscellaneous', () => {
  const folderPath = __dirname;

  test('bundle should resolve $refs in preprocessors', async () => {
    const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
    const args = getParams(indexEntryPoint, ['bundle', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('lint should resolve $refs in preprocessors', async () => {
    const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
    const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  test('stat should print the correct summary with $refs in preprocessors', async () => {
    const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
    const args = getParams(indexEntryPoint, ['stats', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_3.txt'));
  });

  test('lint with a rule from a plugin', async () => {
    const testPath = join(folderPath, 'resolve-plugins');
    const args = getParams(indexEntryPoint, [
      'lint',
      'openapi.yaml',
      '--config=plugin-config.yaml',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('decorate with a decorator from a plugin', async () => {
    const testPath = join(folderPath, 'resolve-plugins');
    const args = getParams(indexEntryPoint, [
      'bundle',
      'openapi.yaml',
      '--config=plugin-config.yaml',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  test('apply a decorator to a specific api (without specifying the api)', async () => {
    const testPath = join(folderPath, 'apply-per-api-decorators');
    const args = getParams(indexEntryPoint, ['bundle', '--config=nested/redocly.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('apply a decorator to a specific api (when the api is specified as an alias)', async () => {
    const testPath = join(folderPath, 'apply-per-api-decorators');
    const args = getParams(indexEntryPoint, ['bundle', '--config=nested/redocly.yaml', 'test@fs']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  test('lint a specific api (when the api is specified as an alias and it points to an external URL)', async () => {
    const testPath = join(folderPath, 'apply-per-api-decorators');
    const args = getParams(indexEntryPoint, [
      'lint',
      '--config=nested/redocly.yaml',
      'test@external-url',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_3.txt'));
  });

  test('lint a specific api when alias is: specified (1); not specified (used the file path) (2)', async () => {
    const testPath = join(folderPath, 'apply-per-api-decorators');
    const args1 = getParams(indexEntryPoint, ['lint', '--config=nested/redocly.yaml', 'test@fs']);
    const result1 = getCommandOutput(args1, { testPath });
    await expect(cleanupOutput(result1)).toMatchFileSnapshot(join(testPath, 'snapshot_4.txt'));

    const args2 = getParams(indexEntryPoint, [
      'lint',
      '--config=nested/redocly.yaml',
      'nested/openapi/main.yaml',
    ]);
    const result2 = getCommandOutput(args2, { testPath });
    await expect(cleanupOutput(result2)).toMatchFileSnapshot(join(testPath, 'snapshot_4.txt'));
  });
});
