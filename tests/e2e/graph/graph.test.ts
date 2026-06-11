import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('graph', () => {
  const folderPath = __dirname;
  const fixturePath = join(folderPath, 'graph-multi-file');

  test('graph should print a stylish tree', async () => {
    const args = getParams(indexEntryPoint, ['graph', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-stylish', 'snapshot.txt')
    );
  });

  test('graph should print pure JSON', async () => {
    const args = getParams(indexEntryPoint, ['graph', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-json', 'snapshot.txt')
    );
  });

  test('graph should print only the affected subgraph', async () => {
    const args = getParams(indexEntryPoint, [
      'graph',
      'openapi.yaml',
      '--affected-by',
      'components/schemas/Address.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-affected-by', 'snapshot.txt')
    );
  });

  test('graph should warn when the affected-by file is not in the graph', async () => {
    const args = getParams(indexEntryPoint, [
      'graph',
      'openapi.yaml',
      '--affected-by',
      'components/schemas/Unknown.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-affected-by-unknown', 'snapshot.txt')
    );
  });
});
