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

  test('tree limits the displayed depth with --level', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--level', '1']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-level'));
  });

  test('tree shows only the API surface with --operations', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--operations']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-operations'));
  });

  test('tree expands a --uses wildcard against node ids', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--uses', 'schemas/Order*']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-structure-uses-wildcard')
    );
  });

  test('tree shows what a component pointer is used by', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--uses',
      '#/components/schemas/Order',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-used-by'));
  });

  test('tree warns for an unknown used-by input', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--uses', 'schemas/Unknown']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-structure-used-by-unknown')
    );
  });

  test('tree shows what a component file is used by in the default view', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--uses',
      'components/schemas/Order.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-structure-used-by-file')
    );
  });

  test('tree --uses filters the JSON index and keeps split components by file', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--uses',
      'components/schemas/Order.yaml',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('uses-json'));
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
      '--uses',
      'components/schemas/Order.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-files-used-by'));
  });

  test('tree --files resolves --uses relative to the API root, regardless of cwd', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'sample-split/openapi.yaml',
      '--files',
      '--uses',
      'components/schemas/Order.yaml',
    ]);
    // Run from the parent directory so cwd is not the API's directory; the path
    // is still resolved relative to the API root, so it matches the same files.
    const result = getCommandOutput(args, { testPath: folderPath });
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

  test('tree prints the agent index as JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'index-fixture') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('index-json'));
  });

  test('tree groups the index by paths', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--format=json',
      '--group-by=paths',
    ]);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'index-fixture') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('index-json-by-paths'));
  });

  test('tree --node on a branch returns its sub-index', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--node', 'Tickets']);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'index-fixture') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('node-branch'));
  });

  test('tree --node on a leaf returns its source and refs', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--node', 'GET /orders']);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'sample-split') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('node-leaf'));
  });

  test('tree --node accepts a file#pointer selector', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--node',
      'paths/orders.yaml#/get',
    ]);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'sample-split') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('node-leaf-pointer'));
  });

  test('tree --node --with-deps appends the dependency closure', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--node',
      'GET /orders',
      '--with-deps',
    ]);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'sample-split') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('node-with-deps'));
  });

  test('tree --node reports an unknown selector', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--node', 'GET /nowhere']);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'sample-split') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('node-unknown'));
  });

  test('tree --uses with --format json warns that webhooks are omitted', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--uses',
      'schemas/Ticket',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'index-fixture') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('uses-json-webhooks-warning'));
  });
});
