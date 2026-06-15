/**
 * Behavioral e2e for non-identifier path parameters. OpenAPI allows parameter
 * names that are not valid JS identifiers (`widget-id`), start with a digit
 * (`2fa`), or collide with reserved words (`new`). The generator must sanitize
 * each into a safe local argument name and use that same name in the URL
 * substitution — otherwise the emitted client either fails to compile or encodes
 * a literal string instead of the argument value.
 *
 * This generates a client from such a spec, type-checks it under strict mode
 * (proving it compiles), then runs it through a fake `fetch` (proving the URL is
 * built from the argument value).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');

const SPEC = `openapi: 3.0.3
info:
  title: Odd Names API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /widgets/{widget-id}:
    get:
      operationId: getWidget
      parameters:
        - name: widget-id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
  /items/{new}:
    get:
      operationId: getItem
      parameters:
        - name: new
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
`;

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    module: 'node16',
    moduleResolution: 'node16',
    target: 'es2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    noEmit: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    skipLibCheck: true,
    types: [],
  },
  include: ['client.ts'],
});

describe('non-identifier path parameters', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'oddnames-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
    writeFileSync(join(dir, 'openapi.yaml'), SPEC, 'utf-8');
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', join(dir, 'openapi.yaml'), '--output', join(dir, 'client.ts')],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    if (result.status !== 0) throw new Error(`generate-client failed:\n${result.stderr}`);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('emits safe argument names and matching URL substitutions', () => {
    const client = spawnSync('cat', [join(dir, 'client.ts')], { encoding: 'utf-8' }).stdout;
    // `widget-id` → `widget_id`; the URL uses the same identifier, not a literal.
    expect(client).toContain('widget_id: string');
    expect(client).toContain('${encodeURIComponent(String(widget_id))}');
    expect(client).not.toContain('"widget-id": string');
    // reserved word `new` → `_new`.
    expect(client).toContain('_new: string');
    expect(client).toContain('${encodeURIComponent(String(_new))}');
  });

  test('the generated client type-checks under strict mode', () => {
    writeFileSync(join(dir, 'tsconfig.json'), TSCONFIG, 'utf-8');
    const result = spawnSync(tscBin, ['--noEmit', '-p', join(dir, 'tsconfig.json')], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(result.status, `tsc failed:\n${result.stdout}\n${result.stderr}`).toBe(0);
  }, 60_000);

  test('builds the request URL from the argument value', () => {
    const consumer = `
import { configure, getWidget, getItem } from './client.ts';

const urls: string[] = [];
configure({
  fetch: (async (url: string) => {
    urls.push(url);
    return new Response('{"id":"x"}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});

await getWidget('abc');
await getItem('xyz');
console.log(JSON.stringify(urls));
`;
    writeFileSync(join(dir, 'consumer.ts'), consumer, 'utf-8');
    const result = spawnSync(tsxBin, [join(dir, 'consumer.ts')], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(result.status, `consumer failed:\n${result.stdout}\n${result.stderr}`).toBe(0);
    const urls = JSON.parse(result.stdout.trim()) as string[];
    expect(urls[0]).toBe('https://api.example.com/widgets/abc');
    expect(urls[1]).toBe('https://api.example.com/items/xyz');
  }, 60_000);
});
