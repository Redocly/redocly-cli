import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('build-docs', () => {
  const folderPath = __dirname;

  test('simple build-docs', async () => {
    const testPath = join(folderPath, 'simple-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    expect(existsSync(join(testPath, 'redoc-static.html'))).toEqual(true);
  });

  test('build docs with config option', async () => {
    const testPath = join(folderPath, 'build-docs-with-config-option');
    const args = getParams(indexEntryPoint, [
      'build-docs',
      'nested/openapi.yaml',
      '--config=nested/redocly.yaml',
      '-o=nested/redoc-static.html',
    ]);
    const result = getCommandOutput(args, { testPath });
    expect(cleanupOutput(result)).toMatchInlineSnapshot(`
      "
      Found nested/redocly.yaml and using 'openapi' options
      An unexpected error occurred. This is likely a bug that should be reported.
      TypeError: Cannot read properties of undefined (reading 'redoc')
          at handlerBuildCommand (file://./packages/cli/lib/commands/build-docs/index.js:23:58)
          at async file://./packages/cli/lib/wrapper.js:60:17
      "
    `);

    expect(existsSync(join(testPath, 'nested/redoc-static.html'))).toEqual(true);
    expect(statSync(join(testPath, 'nested/redoc-static.html')).size).toEqual(36375);
    const output = readFileSync(join(testPath, 'nested/redoc-static.html'), 'utf8');
    await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  describe('build docs with disableSearch', () => {
    test('build docs using an argv option', async () => {
      const testPath = join(folderPath, 'build-docs-with-disabled-search');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--theme.openapi.disableSearch',
      ]);

      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "
        An unexpected error occurred. This is likely a bug that should be reported.
        TypeError: Cannot read properties of undefined (reading 'redoc')
            at handlerBuildCommand (file://./packages/cli/lib/commands/build-docs/index.js:23:58)
            at async file://./packages/cli/lib/wrapper.js:60:17
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('build docs using a config', async () => {
      const testPath = join(folderPath, 'build-docs-with-disabled-search');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--config=config.yaml',
      ]);

      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "
        Found config.yaml and using 'openapi' options
        An unexpected error occurred. This is likely a bug that should be reported.
        TypeError: Cannot read properties of undefined (reading 'redoc')
            at handlerBuildCommand (file://./packages/cli/lib/commands/build-docs/index.js:23:58)
            at async file://./packages/cli/lib/wrapper.js:60:17
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('build docs using an alias', async () => {
      const testPath = join(folderPath, 'build-docs-with-disabled-search');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'alias',
        '--config=config-with-alias.yaml',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "
        Found config-with-alias.yaml and using 'openapi' options
        An unexpected error occurred. This is likely a bug that should be reported.
        TypeError: Cannot read properties of undefined (reading 'redoc')
            at handlerBuildCommand (file://./packages/cli/lib/commands/build-docs/index.js:23:58)
            at async file://./packages/cli/lib/wrapper.js:60:17
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('build docs using the file name (should use the alias config options)', async () => {
      const testPath = join(folderPath, 'build-docs-with-disabled-search');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--config=config-with-alias.yaml',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "
        Found config-with-alias.yaml and using 'openapi' options
        An unexpected error occurred. This is likely a bug that should be reported.
        TypeError: Cannot read properties of undefined (reading 'redoc')
            at handlerBuildCommand (file://./packages/cli/lib/commands/build-docs/index.js:23:58)
            at async file://./packages/cli/lib/wrapper.js:60:17
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('build docs using a config with apis and a root option', async () => {
      const testPath = join(folderPath, 'build-docs-with-disabled-search');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--config=config-with-apis-and-root-option.yaml',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "
        Found config-with-apis-and-root-option.yaml and using 'openapi' options
        An unexpected error occurred. This is likely a bug that should be reported.
        TypeError: Cannot read properties of undefined (reading 'redoc')
            at handlerBuildCommand (file://./packages/cli/lib/commands/build-docs/index.js:23:58)
            at async file://./packages/cli/lib/wrapper.js:60:17
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });
});
