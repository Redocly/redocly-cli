import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('diff', () => {
  const testPath = join(__dirname, 'breaking-changes');

  test('stylish output', async () => {
    const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'stylish-snapshot.txt'));
  });

  test('json output', async () => {
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'json-snapshot.txt'));
  });

  test('exits 1 on breaking changes with default fail-on', () => {
    const result = spawnSync('node', [indexEntryPoint, 'diff', 'base.yaml', 'revision.yaml'], {
      encoding: 'utf-8',
      cwd: testPath,
      env: { ...process.env, NO_COLOR: 'TRUE' },
    });
    expect(result.status).toBe(1);
  });

  test('exits 0 with --fail-on=none', () => {
    const result = spawnSync(
      'node',
      [indexEntryPoint, 'diff', 'base.yaml', 'revision.yaml', '--fail-on=none'],
      { encoding: 'utf-8', cwd: testPath, env: { ...process.env, NO_COLOR: 'TRUE' } }
    );
    expect(result.status).toBe(0);
  });

  test('exits 0 when comparing a file to itself', () => {
    const result = spawnSync('node', [indexEntryPoint, 'diff', 'base.yaml', 'base.yaml'], {
      encoding: 'utf-8',
      cwd: testPath,
      env: { ...process.env, NO_COLOR: 'TRUE' },
    });
    expect(result.status).toBe(0);
  });
});
