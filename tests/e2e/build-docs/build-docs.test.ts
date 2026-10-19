import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('build-docs', () => {
  const folderPath = __dirname;

  test('build docs for an AsyncAPI description', async () => {
    const testPath = join(folderPath, 'asyncapi-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'asyncapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain('<title>Simple AsyncAPI 3 Example</title>');
    expect(output).toContain('const __redoc_definition = {"asyncapi":"3.0.0"');
    expect(output).toContain(
      'const __redoc_options = {"skipBundle":true,"disableTelemetry":true};'
    );
  });

  test('build docs for an AsyncAPI description using the asyncapi config options', async () => {
    const testPath = join(folderPath, 'asyncapi-build-docs');
    const args = getParams(indexEntryPoint, [
      'build-docs',
      'asyncapi.yaml',
      '--config=config.yaml',
    ]);
    const result = getCommandOutput(args, { testPath });
    expect(cleanupOutput(result)).toContain("using 'asyncapi' options");

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain('"jsonSamplesDepth":4');
    expect(output).not.toContain('hideDownloadButtons');
  });

  test('build docs for a GraphQL schema', async () => {
    const testPath = join(folderPath, 'graphql-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'schema.graphql']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain('const __redoc_definition = "');
    expect(output).toContain('type Query');
    expect(output).toContain(
      'const __redoc_options = {"skipBundle":true,"disableTelemetry":true};'
    );
  });

  test('simple build-docs', async () => {
    const testPath = join(folderPath, 'simple-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain('"disableTelemetry":true');
  });

  test('build docs with the inlined Redoc bundle', async () => {
    const testPath = join(folderPath, 'simple-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml', '--inlineBundle']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'inline-bundle-snapshot.txt')
    );

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain(
      "hydrate(__redoc_definition, __redoc_options, document.getElementById('redoc'))"
    );
    expect(output).not.toContain('import { hydrate }');
    expect(output).not.toContain('<link rel="modulepreload"');
  });

  test('rejects an Arazzo description instead of rendering it', async () => {
    const testPath = join(process.cwd(), 'tests/e2e/lint/arazzo-1-1-valid-description');
    rmSync(join(testPath, 'redoc-static.html'), { force: true });
    const args = getParams(indexEntryPoint, ['build-docs', 'cafe-workflows.yaml']);
    const result = getCommandOutput(args, { testPath });
    expect(cleanupOutput(result)).toContain(
      'Only OpenAPI and AsyncAPI descriptions and GraphQL schemas are supported by this command.'
    );
    expect(existsSync(join(testPath, 'redoc-static.html'))).toBe(false);
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

          ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
          ║                                                                                                   ║
          ║  build-docs now renders docs with Redoc 3.                                                        ║
          ║  Theme options and custom templates may need updates: https://redocly.com/blog/redoc-3-whats-new  ║
          ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>                         ║
          ║                                                                                                   ║
          ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

      Found nested/redocly.yaml and using 'openapi' options
      Prerendering docs

      🎉 bundled successfully in: nested/redoc-static.html (244 KiB) [⏱ <test>ms].
      "
    `);

    expect(existsSync(join(testPath, 'nested/redoc-static.html'))).toEqual(true);
    const output = readFileSync(join(testPath, 'nested/redoc-static.html'), 'utf8');
    await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  describe('build docs with openapi options', () => {
    const expectedOptions =
      'const __redoc_options = {"hideDownloadButtons":true,"skipBundle":true,"disableTelemetry":true};';

    test('build docs using an argv option', async () => {
      const testPath = join(folderPath, 'build-docs-with-openapi-options');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--openapi.hideDownloadButtons',
      ]);

      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "

            ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
            ║                                                                                                   ║
            ║  build-docs now renders docs with Redoc 3.                                                        ║
            ║  Theme options and custom templates may need updates: https://redocly.com/blog/redoc-3-whats-new  ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>                         ║
            ║                                                                                                   ║
            ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain(expectedOptions);
    });

    test('build docs using a config', async () => {
      const testPath = join(folderPath, 'build-docs-with-openapi-options');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--config=config.yaml',
      ]);

      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "

            ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
            ║                                                                                                   ║
            ║  build-docs now renders docs with Redoc 3.                                                        ║
            ║  Theme options and custom templates may need updates: https://redocly.com/blog/redoc-3-whats-new  ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>                         ║
            ║                                                                                                   ║
            ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

        Found config.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain(expectedOptions);
    });

    test('build docs using an alias', async () => {
      const testPath = join(folderPath, 'build-docs-with-openapi-options');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'alias',
        '--config=config-with-alias.yaml',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "

            ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
            ║                                                                                                   ║
            ║  build-docs now renders docs with Redoc 3.                                                        ║
            ║  Theme options and custom templates may need updates: https://redocly.com/blog/redoc-3-whats-new  ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>                         ║
            ║                                                                                                   ║
            ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

        Found config-with-alias.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain(expectedOptions);
    });

    test('build docs using the file name (should use the alias config options)', async () => {
      const testPath = join(folderPath, 'build-docs-with-openapi-options');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--config=config-with-alias.yaml',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "

            ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
            ║                                                                                                   ║
            ║  build-docs now renders docs with Redoc 3.                                                        ║
            ║  Theme options and custom templates may need updates: https://redocly.com/blog/redoc-3-whats-new  ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>                         ║
            ║                                                                                                   ║
            ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

        Found config-with-alias.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain(expectedOptions);
    });

    test('build docs using a config with apis and a root option', async () => {
      const testPath = join(folderPath, 'build-docs-with-openapi-options');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--config=config-with-apis-and-root-option.yaml',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toMatchInlineSnapshot(`
        "

            ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
            ║                                                                                                   ║
            ║  build-docs now renders docs with Redoc 3.                                                        ║
            ║  Theme options and custom templates may need updates: https://redocly.com/blog/redoc-3-whats-new  ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>                         ║
            ║                                                                                                   ║
            ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

        Found config-with-apis-and-root-option.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain(expectedOptions);
    });
  });
});
