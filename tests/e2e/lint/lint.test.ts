import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('lint', () => {
  test('lint valid Arazzo description', async () => {
    const dirName = 'arazzo-valid-test-description';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'museum.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('lint not valid Arazzo description', async () => {
    const dirName = 'arazzo-not-valid-test-description';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'museum.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('arazzo-type-extensions-with-plugin', async () => {
    const dirName = 'arazzo-type-extensions-with-plugin';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'museum.yaml', '--config=redocly.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('skip-rules', async () => {
    const dirName = 'skip-rules';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, [
      'lint',
      '--skip-rule=operation-4xx-response',
      '--skip-rule',
      'rule/operationId-casing',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  test('lint file with constructor property in schema', async () => {
    const testPath = join(__dirname, '../fixtures/constructor-property');
    const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('lint file by alias using file path (at the config level)', async () => {
    const dirName = 'assertions-severity-override';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('lint file by alias using file path (not from the config level)', async () => {
    const dirName = 'assertions-severity-override';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, [
      'lint',
      join(testPath, 'openapi.yaml'),
      '--config',
      join(testPath, 'redocly.yaml'),
    ]);

    const result = getCommandOutput(args, {});
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  test('lint file by alias using file path (without using extends in config) (at the config level)', async () => {
    const dirName = 'assertions-severity-override-without-extends';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('lint file by alias using file path (without using extends in config) (not from the config level)', async () => {
    const dirName = 'assertions-severity-override-without-extends';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, [
      'lint',
      join(testPath, 'openapi.yaml'),
      '--config',
      join(testPath, 'redocly.yaml'),
    ]);

    const result = getCommandOutput(args, {});
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  test('lint nested root $id with local $defs refs', async () => {
    const dirName = 'nested-id-ref-resolution';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('lint relative $id IRI ref resolution', async () => {
    const dirName = 'relative-id-ref-resolution';
    const testPath = join(__dirname, `${dirName}`);

    const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});
