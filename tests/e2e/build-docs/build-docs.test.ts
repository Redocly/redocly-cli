/**
 * @vitest-environment jsdom
 */
import { once } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput, runCommandAsync } from '../helpers.js';

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
    expect(output).toContain(
      'const __redoc_options = {"jsonSamplesDepth":4,"skipBundle":true,"disableTelemetry":true};'
    );
  });

  test('build docs for an AsyncAPI description with the openapi options', async () => {
    const testPath = join(folderPath, 'asyncapi-build-docs');
    const args = getParams(indexEntryPoint, [
      'build-docs',
      'asyncapi.yaml',
      '--openapi.hideDownloadButtons',
    ]);
    const result = getCommandOutput(args, { testPath });
    expect(cleanupOutput(result)).toContain(
      'Ignoring --openapi because this API description uses --asyncapi options.'
    );
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

  describe('build docs for a remote GraphQL schema', () => {
    const testPath = join(folderPath, 'remote-graphql-build-docs');
    let server: Server;
    let schemaUrl: string;

    beforeAll(async () => {
      server = createServer((_request, response) => {
        response.end(readFileSync(join(testPath, 'schema.graphql')));
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      schemaUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/schema.graphql`;
    });

    afterAll(() => {
      server.close();
    });

    test('loads the schema over HTTP', async () => {
      const args = getParams(indexEntryPoint, ['build-docs', schemaUrl]);
      const result = await runCommandAsync('node', args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain('type Query');
    });
  });

  test('build docs for a Swagger 2.0 description', async () => {
    const testPath = join(folderPath, 'swagger-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'swagger.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain('const __redoc_definition = {"openapi":"3.2.0"');
  });

  test('simple build-docs', async () => {
    const testPath = join(folderPath, 'simple-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain(
      'const __redoc_options = {"skipBundle":true,"disableTelemetry":true};'
    );
  });

  test('build docs with the inlined Redoc bundle', async () => {
    const testPath = join(folderPath, 'simple-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml', '--inlineBundle']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'inline-bundle-snapshot.txt')
    );

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    const script = new DOMParser()
      .parseFromString(output, 'text/html')
      .querySelector('script[type="module"]');
    const lastScriptLine = script?.textContent?.trim().split('\n').at(-1)?.trim();
    expect(lastScriptLine).toBe(
      "hydrate(__redoc_definition, __redoc_options, document.getElementById('redoc'));"
    );
    expect(output).not.toContain('import { hydrate }');
    expect(output).not.toContain('<link rel="modulepreload"');
  });

  test('build docs with script tags in the description', async () => {
    const testPath = join(folderPath, 'build-docs-with-script-tags');
    const args = getParams(indexEntryPoint, ['build-docs', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

    const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
    expect(output).toContain('Uppercase and spaced end tags: \\u003c/SCRIPT> \\u003c/script >');
    expect(output).toContain('A comment that hides the real end tag: \\u003c!--\\u003cscript>');
  });

  test('rejects an Arazzo description instead of rendering it', async () => {
    const testPath = join(folderPath, 'arazzo-build-docs');
    const args = getParams(indexEntryPoint, ['build-docs', 'cafe-workflows.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
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

          ╔════════════════════════════════════════════════════════════════════════════╗
          ║                                                                            ║
          ║  build-docs now renders docs with Redoc 3.                                 ║
          ║  Theme options and custom templates may need updates.                      ║
          ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>  ║
          ║  Learn more: https://redocly.com/redoc-ce                                  ║
          ║                                                                            ║
          ╚════════════════════════════════════════════════════════════════════════════╝

      Found nested/redocly.yaml and using 'openapi' options
      Prerendering docs

      🎉 bundled successfully in: nested/redoc-static.html (244 KiB) [⏱ <test>ms].

      Exit code: 0"
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

            ╔════════════════════════════════════════════════════════════════════════════╗
            ║                                                                            ║
            ║  build-docs now renders docs with Redoc 3.                                 ║
            ║  Theme options and custom templates may need updates.                      ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>  ║
            ║  Learn more: https://redocly.com/redoc-ce                                  ║
            ║                                                                            ║
            ╚════════════════════════════════════════════════════════════════════════════╝

        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].

        Exit code: 0"
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

            ╔════════════════════════════════════════════════════════════════════════════╗
            ║                                                                            ║
            ║  build-docs now renders docs with Redoc 3.                                 ║
            ║  Theme options and custom templates may need updates.                      ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>  ║
            ║  Learn more: https://redocly.com/redoc-ce                                  ║
            ║                                                                            ║
            ╚════════════════════════════════════════════════════════════════════════════╝

        Found config.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].

        Exit code: 0"
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

            ╔════════════════════════════════════════════════════════════════════════════╗
            ║                                                                            ║
            ║  build-docs now renders docs with Redoc 3.                                 ║
            ║  Theme options and custom templates may need updates.                      ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>  ║
            ║  Learn more: https://redocly.com/redoc-ce                                  ║
            ║                                                                            ║
            ╚════════════════════════════════════════════════════════════════════════════╝

        Found config-with-alias.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].

        Exit code: 0"
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

            ╔════════════════════════════════════════════════════════════════════════════╗
            ║                                                                            ║
            ║  build-docs now renders docs with Redoc 3.                                 ║
            ║  Theme options and custom templates may need updates.                      ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>  ║
            ║  Learn more: https://redocly.com/redoc-ce                                  ║
            ║                                                                            ║
            ╚════════════════════════════════════════════════════════════════════════════╝

        Found config-with-alias.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].

        Exit code: 0"
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

            ╔════════════════════════════════════════════════════════════════════════════╗
            ║                                                                            ║
            ║  build-docs now renders docs with Redoc 3.                                 ║
            ║  Theme options and custom templates may need updates.                      ║
            ║  To keep the Redoc 2 output: npx @redocly/cli@v1-archive build-docs <api>  ║
            ║  Learn more: https://redocly.com/redoc-ce                                  ║
            ║                                                                            ║
            ╚════════════════════════════════════════════════════════════════════════════╝

        Found config-with-apis-and-root-option.yaml and using 'openapi' options
        Prerendering docs

        🎉 bundled successfully in: redoc-static.html (249 KiB) [⏱ <test>ms].

        Exit code: 0"
      `);
      const output = readFileSync(join(testPath, 'redoc-static.html'), 'utf8');
      expect(output).toContain(expectedOptions);
    });

    test('rejects the removed --theme.openapi option', async () => {
      const testPath = join(folderPath, 'build-docs-with-openapi-options');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'openapi.yaml',
        '--theme.openapi.hideDownloadButtons',
      ]);
      const result = getCommandOutput(args, { testPath });
      expect(cleanupOutput(result)).toContain(
        'The --theme.openapi option was removed. Pass Redoc options with --openapi instead: https://redocly.com/docs/cli/guides/migrate-to-v2#changes-in-the-build-docs-command'
      );
    });
  });
});
