import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('split', () => {
  test('without option: outDir', async () => {
    const testPath = join(__dirname, `missing-outDir`);

    const args = getParams(indexEntryPoint, ['split', '../test-split/spec.json']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('swagger', async () => {
    const testPath = join(__dirname, `oas2`);

    const args = getParams(indexEntryPoint, ['split', 'openapi.yaml', '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('openapi with no errors', async () => {
    const testPath = join(__dirname, `oas3-no-errors`);
    const file = 'openapi.yaml';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('with separator: /', async () => {
    const testPath = join(__dirname, `slash-separator`);
    const file = 'openapi.yaml';

    const args = getParams(indexEntryPoint, ['split', file, '--separator=/', '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('openapi json file', async () => {
    const testPath = join(__dirname, `openapi-json-file`);
    const file = 'openapi.json';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('openapi json file refs validation', async () => {
    const testPath = join(__dirname, `refs-in-json`);
    const file = 'openapi.json';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    // run the split command and write the result to files
    spawnSync('node', args, {
      cwd: testPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NO_COLOR: 'TRUE',
      },
    });

    const lintArgs = getParams(indexEntryPoint, ['lint', 'output/openapi.json']);
    const result = getCommandOutput(lintArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('openapi json file with discriminator', async () => {
    const testPath = join(__dirname, `discriminator-in-json`);
    const file = 'openapi.json';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    // run the split command and write the result to files
    spawnSync('node', args, {
      cwd: testPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NO_COLOR: 'TRUE',
      },
    });

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('root endpoint correctly split', async () => {
    const testPath = join(__dirname, `root-endpoint`);

    const args = getParams(indexEntryPoint, ['split', 'openapi.yaml', '--outDir=output']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('root endpoint split and bundle again to the content', async () => {
    const testPath = join(__dirname, `root-endpoint`);

    let args = getParams(indexEntryPoint, ['split', 'openapi.yaml', '--outDir=output']);
    spawnSync('node', args, {
      cwd: testPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NO_COLOR: 'TRUE',
      },
    });

    args = getParams(indexEntryPoint, ['bundle', 'output/openapi.yaml', '-o=output/bundled.yaml']);
    getCommandOutput(args, { testPath });

    const expected = readFileSync(join(testPath, 'openapi.yaml'), 'utf8');
    const actual = readFileSync(join(testPath, 'output/bundled.yaml'), 'utf8');

    // Clean up output folder after splitting so the produced files do not interfere with other tests
    spawnSync('rm', ['-rf', 'output'], {
      cwd: testPath,
    });

    expect(actual).toEqual(expected);
  });

  test('asyncapi2-basic', async () => {
    const testPath = join(__dirname, `asyncapi2-basic`);
    const file = 'asyncapi.yaml';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('asyncapi3-basic', async () => {
    const testPath = join(__dirname, `asyncapi3-basic`);
    const file = 'asyncapi.yaml';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('asyncapi3-complex', async () => {
    const testPath = join(__dirname, `asyncapi3-complex`);
    const file = 'asyncapi.yaml';

    const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});
