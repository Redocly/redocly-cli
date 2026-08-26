import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const treeFixturePath = join(__dirname, '../tree/index-fixture');

describe('generate-map', () => {
  const artifactPath = join(treeFixturePath, 'openapi.map.txt');
  afterEach(() => rmSync(artifactPath, { force: true }));

  test('writes a deterministic map next to the description', async () => {
    const args = getParams(indexEntryPoint, ['generate-map', 'openapi.yaml']);
    const stdout = getCommandOutput(args, { testPath: treeFixturePath });
    const first = readFileSync(artifactPath, 'utf8');
    getCommandOutput(args, { testPath: treeFixturePath });
    expect(readFileSync(artifactPath, 'utf8')).toBe(first);
    await expect(cleanupOutput(stdout) + '\n---\n' + first).toMatchFileSnapshot(
      join(__dirname, 'map-museum', 'snapshot.txt')
    );
  });

  test('rejects a non-OpenAPI description', () => {
    const args = getParams(indexEntryPoint, ['generate-map', 'asyncapi.yaml']);
    const result = getCommandOutput(args, { testPath: join(__dirname, 'async-fixture') });
    expect(result).toContain('generate-map supports OpenAPI descriptions');
  });
});
