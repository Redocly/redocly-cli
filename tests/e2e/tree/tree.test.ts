import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('tree', () => {
  const folderPath = __dirname;
  const samplePath = join(folderPath, 'sample-split');
  const indexFixturePath = join(folderPath, 'index-fixture');
  const multiApiPath = join(folderPath, 'multi-api');
  const snapshot = (name: string) => join(folderPath, name, 'snapshot.txt');

  test('tree prints the overview for a single-file API', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-overview-stylish'));
  });

  test('tree prints the overview as JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-overview-json'));
  });

  test('tree --format=ai prints the overview as minified JSON, unprojected', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=ai']);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-overview-ai'));
  });

  test('tree prints the overview for a split multi-file API', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-stylish'));
  });

  test('tree prints the split multi-file overview as JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-json'));
  });

  test('tree --tag lists the operations of one tag', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--tag=Tickets']);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-tag-listing'));
  });

  test('tree --tag --format=ai lists the operations of one tag as compact, minified JSON entries', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--tag=Tickets',
      '--format=ai',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-tag-ai'));
  });

  test('tree --operations lists every operation as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--operations',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-operations-listing'));
  });

  test('tree --paths lists every path with its methods', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--paths']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-paths-listing'));
  });

  test('tree --component lists the components of one section', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--component=schemas']);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-component-listing'));
  });

  test('tree --webhooks lists every webhook operation as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'webhooks.yaml',
      '--webhooks',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'tree-webhooks-listing') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-webhooks-listing'));
  });

  test('tree --path --operation prints an operation card as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--path=/tickets',
      '--operation=post',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-operation-card'));
  });

  test('tree --path --operation --with-deps appends the dependency closure', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--path=/tickets',
      '--operation=post',
      '--with-deps',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-operation-card-with-deps')
    );
  });

  test('tree --path --operation --with-deps --format=ai emits schema signatures for the dependency closure', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--path=/plans',
      '--operation=post',
      '--with-deps',
      '--format=ai',
    ]);
    const result = getCommandOutput(args, {
      testPath: join(folderPath, 'tree-operation-card-with-deps-ai'),
    });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-operation-card-with-deps-ai')
    );
  });

  test('tree --path --operation prints an operation card as a pure stylish tree', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--path=/tickets',
      '--operation=post',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-operation-card-stylish')
    );
  });

  test('tree --path --operation --with-deps renders the closure as a stylish deps branch', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--path=/tickets',
      '--operation=post',
      '--with-deps',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-operation-card-with-deps-stylish')
    );
  });

  test('tree --operation selects an operation by operationId', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--operation=createOrder',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-operation-by-id'));
  });

  test('tree --component --name prints a component card as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--component=schema',
      '--name=Ticket',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-component-card'));
  });

  test('tree --component --name --used-by prints the used-by report as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--component=schemas',
      '--name=Ticket',
      '--used-by',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-used-by-json'));
  });

  test('tree --used-by shows the human-impact tree for a component', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--component=schemas',
      '--name=Order',
      '--used-by',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-structure-used-by'));
  });

  test('tree --webhook --operation prints a webhook card as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'webhooks.yaml',
      '--webhook=newTicket',
      '--operation=post',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'tree-webhook-card') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-webhook-card'));
  });

  test('tree --file prints everything one file defines as a card, as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--file=components/schemas/Order.yaml',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-file-card'));
  });

  test('tree --file --used-by prints the file-seeded used-by report as JSON', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--file=components/schemas/Order.yaml',
      '--used-by',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-file-used-by'));
  });

  test('tree reports an unknown tag with a suggestion and exits with an error', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--tag=Ticket']);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-selector-error'));

    // getCommandOutput only exposes combined stdout/stderr text; spawn once more to confirm
    // the process actually exits non-zero, since the snapshot alone can't show the exit code.
    const exitCode = spawnSync('node', args, { cwd: indexFixturePath, encoding: 'utf-8' }).status;
    expect(exitCode).toBe(1);
  });

  test('tree rejects --webhooks combined with a selector and exits with an error', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--tag=Tickets',
      '--webhooks',
    ]);
    const result = getCommandOutput(args, { testPath: indexFixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-webhooks-conflict-error')
    );

    // Same reasoning as the unknown-tag case above: confirm the non-zero exit separately.
    const exitCode = spawnSync('node', args, { cwd: indexFixturePath, encoding: 'utf-8' }).status;
    expect(exitCode).toBe(1);
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

  test('tree --files --file filters the graph to the files connected to one file', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--files',
      '--file=paths/orders_{orderId}.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: samplePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshot('tree-files-file-filter'));
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

  // Three-step agent loop against one split fixture: get the overview, drill into a tag,
  // then pull one operation card with its dependency closure. Each step is its own case
  // dir because the harness snapshots one command per test; step 1's dir holds the shared
  // fixture and steps 2-3 point their testPath at it.
  test('tree agent loop step 1: overview as JSON', async () => {
    const args = getParams(indexEntryPoint, ['tree', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, {
      testPath: join(folderPath, 'tree-split-agent-loop-1-overview'),
    });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-split-agent-loop-1-overview')
    );
  });

  test('tree agent loop step 2: --tag lists the tag found in the overview', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--tag=Orders',
      '--format=json',
    ]);
    const result = getCommandOutput(args, {
      testPath: join(folderPath, 'tree-split-agent-loop-1-overview'),
    });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-split-agent-loop-2-tag')
    );
  });

  test('tree agent loop step 3: --path --operation --with-deps pulls one operation card', async () => {
    const args = getParams(indexEntryPoint, [
      'tree',
      'openapi.yaml',
      '--path=/orders',
      '--operation=post',
      '--with-deps',
      '--format=json',
    ]);
    const result = getCommandOutput(args, {
      testPath: join(folderPath, 'tree-split-agent-loop-1-overview'),
    });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      snapshot('tree-split-agent-loop-3-card')
    );
  });
});
