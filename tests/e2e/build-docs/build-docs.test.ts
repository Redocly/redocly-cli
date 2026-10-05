import { existsSync, readFileSync } from 'node:fs';
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
    await expect(output).toMatchFileSnapshot(join(testPath, 'redoc-static.snapshot.html'));
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
    await expect(output).toMatchFileSnapshot(join(testPath, 'redoc-static.snapshot.html'));
  });

  test('simple build-docs', async () => {
    const testPath = join(folderPath, 'simple-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    expect(existsSync(join(testPath, 'redoc-static.html'))).toEqual(true);
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

          ╔════════════════════════════════════════════════════════════════════╗
          ║                                                                    ║
          ║  Deprecation warning: build-docs is moving to Redoc 3              ║
          ║                                                                    ║
          ║  An upcoming Redocly CLI release will render docs with Redoc 3:    ║
          ║  faster on large APIs, built-in dark mode, CSS-based theming, and  ║
          ║  support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.              ║
          ║  Redoc 2 theme options and custom templates may need updates.      ║
          ║                                                                    ║
          ║  To keep the current Redoc 2 output, use Redocly CLI v1:           ║
          ║    npx @redocly/cli@v1-archive build-docs <api>                    ║
          ║                                                                    ║
          ║  Learn more: https://redocly.com/blog/redoc-3-whats-new            ║
          ║                                                                    ║
          ╚════════════════════════════════════════════════════════════════════╝

      Found nested/redocly.yaml and using 'openapi' options
      Prerendering docs

      🎉 bundled successfully in: nested/redoc-static.html (234 KiB) [⏱ <test>ms].
      "
    `);

    expect(existsSync(join(testPath, 'nested/redoc-static.html'))).toEqual(true);
    const output = readFileSync(join(testPath, 'nested/redoc-static.html'), 'utf8');
    await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  describe('build docs with openapi options', () => {
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

            ╔════════════════════════════════════════════════════════════════════╗
            ║                                                                    ║
            ║  Deprecation warning: build-docs is moving to Redoc 3              ║
            ║                                                                    ║
            ║  An upcoming Redocly CLI release will render docs with Redoc 3:    ║
            ║  faster on large APIs, built-in dark mode, CSS-based theming, and  ║
            ║  support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.              ║
            ║  Redoc 2 theme options and custom templates may need updates.      ║
            ║                                                                    ║
            ║  To keep the current Redoc 2 output, use Redocly CLI v1:           ║
            ║    npx @redocly/cli@v1-archive build-docs <api>                    ║
            ║                                                                    ║
            ║  Learn more: https://redocly.com/blog/redoc-3-whats-new            ║
            ║                                                                    ║
            ╚════════════════════════════════════════════════════════════════════╝

        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (239 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
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

            ╔════════════════════════════════════════════════════════════════════╗
            ║                                                                    ║
            ║  Deprecation warning: build-docs is moving to Redoc 3              ║
            ║                                                                    ║
            ║  An upcoming Redocly CLI release will render docs with Redoc 3:    ║
            ║  faster on large APIs, built-in dark mode, CSS-based theming, and  ║
            ║  support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.              ║
            ║  Redoc 2 theme options and custom templates may need updates.      ║
            ║                                                                    ║
            ║  To keep the current Redoc 2 output, use Redocly CLI v1:           ║
            ║    npx @redocly/cli@v1-archive build-docs <api>                    ║
            ║                                                                    ║
            ║  Learn more: https://redocly.com/blog/redoc-3-whats-new            ║
            ║                                                                    ║
            ╚════════════════════════════════════════════════════════════════════╝

        Found config.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (239 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
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

            ╔════════════════════════════════════════════════════════════════════╗
            ║                                                                    ║
            ║  Deprecation warning: build-docs is moving to Redoc 3              ║
            ║                                                                    ║
            ║  An upcoming Redocly CLI release will render docs with Redoc 3:    ║
            ║  faster on large APIs, built-in dark mode, CSS-based theming, and  ║
            ║  support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.              ║
            ║  Redoc 2 theme options and custom templates may need updates.      ║
            ║                                                                    ║
            ║  To keep the current Redoc 2 output, use Redocly CLI v1:           ║
            ║    npx @redocly/cli@v1-archive build-docs <api>                    ║
            ║                                                                    ║
            ║  Learn more: https://redocly.com/blog/redoc-3-whats-new            ║
            ║                                                                    ║
            ╚════════════════════════════════════════════════════════════════════╝

        Found config-with-alias.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (239 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
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

            ╔════════════════════════════════════════════════════════════════════╗
            ║                                                                    ║
            ║  Deprecation warning: build-docs is moving to Redoc 3              ║
            ║                                                                    ║
            ║  An upcoming Redocly CLI release will render docs with Redoc 3:    ║
            ║  faster on large APIs, built-in dark mode, CSS-based theming, and  ║
            ║  support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.              ║
            ║  Redoc 2 theme options and custom templates may need updates.      ║
            ║                                                                    ║
            ║  To keep the current Redoc 2 output, use Redocly CLI v1:           ║
            ║    npx @redocly/cli@v1-archive build-docs <api>                    ║
            ║                                                                    ║
            ║  Learn more: https://redocly.com/blog/redoc-3-whats-new            ║
            ║                                                                    ║
            ╚════════════════════════════════════════════════════════════════════╝

        Found config-with-alias.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (239 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
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

            ╔════════════════════════════════════════════════════════════════════╗
            ║                                                                    ║
            ║  Deprecation warning: build-docs is moving to Redoc 3              ║
            ║                                                                    ║
            ║  An upcoming Redocly CLI release will render docs with Redoc 3:    ║
            ║  faster on large APIs, built-in dark mode, CSS-based theming, and  ║
            ║  support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.              ║
            ║  Redoc 2 theme options and custom templates may need updates.      ║
            ║                                                                    ║
            ║  To keep the current Redoc 2 output, use Redocly CLI v1:           ║
            ║    npx @redocly/cli@v1-archive build-docs <api>                    ║
            ║                                                                    ║
            ║  Learn more: https://redocly.com/blog/redoc-3-whats-new            ║
            ║                                                                    ║
            ╚════════════════════════════════════════════════════════════════════╝

        Found config-with-apis-and-root-option.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (239 KiB) [⏱ <test>ms].
        "
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      await expect(output).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });
});
