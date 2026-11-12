import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const testPath = join(__dirname, 'inspect-node-types-multi-file');

describe('inspect-node-types', () => {
  test('inspect-node-types should list every node of a multi-file description', async () => {
    const args = getParams(indexEntryPoint, ['inspect-node-types', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('inspect-node-types should resolve a pointer into a referenced file', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--pointer=parameters/limit.yaml#/schema',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'pointer-in-referenced-file-snapshot.txt')
    );
  });

  test('inspect-node-types should resolve a pointer at a $ref whose target was already visited', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--pointer=#/paths/~1bar/get/parameters/0',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'pointer-at-visited-ref-snapshot.txt')
    );
  });

  test('inspect-node-types should suggest the closest node when the pointer matches nothing', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--pointer=#/paths/foo',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'pointer-not-found-snapshot.txt')
    );
  });

  test('inspect-node-types should fail when the pointed file is not referenced', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--pointer=unreferenced.yaml#/foo',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'pointer-in-unreferenced-file-snapshot.txt')
    );
  });

  test('inspect-node-types should list only the nodes of the given type', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--type=Schema',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'type-snapshot.txt'));
  });

  test('inspect-node-types should fail when no node has the given type', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--type=Unknown',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'type-not-found-snapshot.txt')
    );
  });

  test('inspect-node-types should show the chain of types down to a $ref-ed node', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--pointer=parameters/limit.yaml#/schema',
      '--parents',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'parents-of-ref-snapshot.txt')
    );
  });

  test('inspect-node-types should show the chain of types down to a node behind a fragment $ref', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--pointer=parameters/query.yaml#/offset/schema',
      '--parents',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'parents-of-fragment-ref-snapshot.txt')
    );
  });

  test('inspect-node-types should list the distinct chains that lead to a type', async () => {
    const args = getParams(indexEntryPoint, [
      'inspect-node-types',
      'openapi.yaml',
      '--type=Parameter',
      '--parents',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'parents-of-type-snapshot.txt')
    );
  });

  test('inspect-node-types should require a pointer or a type for --parents', async () => {
    const args = getParams(indexEntryPoint, ['inspect-node-types', 'openapi.yaml', '--parents']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'parents-without-pointer-snapshot.txt')
    );
  });

  test('inspect-node-types should summarize the types used in the description', async () => {
    const args = getParams(indexEntryPoint, ['inspect-node-types', 'openapi.yaml', '--summary']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'summary-snapshot.txt'));
  });
});
