import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('check-config', () => {
  const folderPathWithOptions: { dirName: string; option: string | null }[] = [
    { dirName: 'invalid-config--lint-config-warn', option: 'warn' },
    { dirName: 'invalid-config--lint-config-error', option: 'error' },
    { dirName: 'invalid-config--no-option', option: null },
    { dirName: 'valid-config', option: null },
  ];

  test.each(folderPathWithOptions)('test with option: %s', async (folderPathWithOptions) => {
    const { dirName, option } = folderPathWithOptions;
    const testPath = join(__dirname, `${dirName}`);
    const args = [...([option && `--lint-config=${option}`].filter(Boolean) as string[])];

    const passedArgs = getParams(indexEntryPoint, ['check-config', ...args]);

    const result = getCommandOutput(passedArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('run with config option', async () => {
    const dirName = 'valid-config-with-config-option';
    const testPath = join(__dirname, `${dirName}`);

    const passedArgs = getParams(indexEntryPoint, ['check-config', '--config=nested/redocly.yaml']);

    const result = getCommandOutput(passedArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('config type extension in assertions', async () => {
    const dirName = 'config-type-extensions-in-assertions';
    const testPath = join(__dirname, `${dirName}`);

    const passedArgs = getParams(indexEntryPoint, ['check-config', '--config=redocly.yaml']);

    const result = getCommandOutput(passedArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('wrong config type extension in assertions', async () => {
    const dirName = 'wrong-config-type-extensions-in-assertions';
    const testPath = join(__dirname, `${dirName}`);

    const passedArgs = getParams(indexEntryPoint, ['check-config', '--config=redocly.yaml']);

    const result = getCommandOutput(passedArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('empty config (null)', async () => {
    const dirName = 'empty-config-null';
    const testPath = join(__dirname, `${dirName}`);

    const passedArgs = getParams(indexEntryPoint, ['check-config', '--config=redocly.yaml']);

    const result = getCommandOutput(passedArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});
