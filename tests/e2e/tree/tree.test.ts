import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('tree', () => {
  const folderPath = __dirname;
  const samplePath = join(folderPath, 'sample-split');
  const multiApiPath = join(folderPath, 'multi-api');
  const snapshot = (name: string) => join(folderPath, name, 'snapshot.txt');

  test('tree prints the document structure', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-stylish'));
  });

  test('tree prints the structure as JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-json'));
  });

  test('tree prints the structure as a mermaid diagram', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=mermaid']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-mermaid'));
  });

  test('tree prints the structure as a Graphviz dot graph', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=dot']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-dot'));
  });

  test('tree shows what a component pointer is used by', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--used-by',
      '#/components/schemas/Order',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-used-by'));
  });

  test('tree warns for an unknown used-by input', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--used-by',
      'schemas/Unknown',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-structure-used-by-unknown')
    );
  });

  test('tree points a file used-by to --files in the default view', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--used-by',
      'components/schemas/Order.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-structure-used-by-file')
    );
  });

  test('tree --files prints the file-level graph', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--files']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-files-stylish'));
  });

  test('tree --files prints the file-level graph as JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--files', '--format=json']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-files-json'));
  });

  test('tree --files shows what a file is used by', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--files',
      '--used-by',
      'components/schemas/Order.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-files-used-by'));
  });

  test('tree rejects multiple APIs in the default view', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'a.yaml', 'b.yaml']);
    const result = getCommandOutput(args, { testPath: multiApiPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-multi-api-error'));
  });

  test('tree --files merges multiple APIs into one graph', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'a.yaml', 'b.yaml', '--files']);
    const result = getCommandOutput(args, { testPath: multiApiPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-files-multi-api'));
  });
});
