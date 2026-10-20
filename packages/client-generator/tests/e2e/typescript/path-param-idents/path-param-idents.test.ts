/**
 * Tests non-identifier path parameters. OpenAPI allows parameter
 * names that are not valid JS identifiers (`widget-id`), start with a digit
 * (`2fa`), or collide with reserved words (`new`). The generator must sanitize
 * each into a safe sugar argument name while routing the value back under the
 * WIRE name (the descriptor's `ParamSpec.name`) — otherwise the emitted client
 * either fails to compile or substitutes nothing into the URL template.
 *
 * This generates a client from such a spec, type-checks it under strict mode
 * (proving it compiles), then runs it through a fake `fetch` (proving the URL is
 * built from the argument value).
 */

import { generateClient } from '@redocly/client-generator';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runConsumer } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const spec = join(__dirname, 'openapi.yaml');

describe('non-identifier path parameters', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: spec, output: join(dir, 'client.ts') });
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('keys the path layer by the wire name, quoting what needs it', () => {
    const client = readFileSync(join(dir, 'client.ts'), 'utf-8');
    // The wire name IS the key, so no binding identifier is derived and nothing to remap.
    expect(client).toContain('export type GetWidgetPath = {\n    "widget-id": string;\n};');
    // The descriptor keeps the WIRE name for URL substitution.
    expect(client).toContain('params: [{ name: "widget-id", in: "path" }]');
    // A reserved word is a valid object key, so the wire name stays as is.
    expect(client).toContain('export type GetItemPath = {\n    "new": string;\n};');
    expect(client).not.toContain('_new');
  });

  test('the generated client type-checks under strict mode', () => {
    expectTscPasses(['--noEmit', '-p', join(dir, 'tsconfig.json')]);
  });

  test('builds the request URL from the argument value', async () => {
    const urls = (await runConsumer(join(dir, 'build-urls.ts'))) as string[];
    expect(urls[0]).toBe('https://api.example.com/widgets/abc');
    expect(urls[1]).toBe('https://api.example.com/items/xyz');
  });
});
