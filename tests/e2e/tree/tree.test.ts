import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('tree', () => {
  const folderPath = __dirname;
  const fixturePath = join(folderPath, 'tree-multi-file');

  test('tree should print a stylish tree', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--files']);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'tree-files-stylish', 'snapshot.txt')
    );
  });

  test('tree should print pure JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--files', '--format=json']);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'tree-files-json', 'snapshot.txt')
    );
  });

  test('tree should print only the affected subgraph', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--files',
      '--affected-by',
      'components/schemas/Address.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'tree-files-affected-by', 'snapshot.txt')
    );
  });

  test('tree should warn when the affected-by file is not in the graph', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--files',
      '--affected-by',
      'components/schemas/Unknown.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'tree-files-affected-by-unknown', 'snapshot.txt')
    );
  });
});
