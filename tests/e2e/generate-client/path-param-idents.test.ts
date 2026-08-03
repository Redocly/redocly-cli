/**
 * Behavioral e2e for non-identifier path parameters. OpenAPI allows parameter
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
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

import { generateInto, repoRoot, runConsumer, tscBin } from './helpers.js';

const SPEC = outdent`
  openapi: 3.0.3
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
    module: 'nodenext',
    moduleResolution: 'nodenext',
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
    writeFileSync(join(dir, 'openapi.yaml'), SPEC, 'utf-8');
    generateInto(dir, join(dir, 'openapi.yaml'));
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('emits safe argument names routed back under the wire name', () => {
    const client = readFileSync(join(dir, 'client.ts'), 'utf-8');
    // `widget-id` → safe `widget_id` argument, routed under the quoted wire key.
    expect(client).toContain(
      'export const getWidget = (widget_id: string, init: RequestOptions = {}) => client.getWidget({ "widget-id": widget_id }, init);'
    );
    // The descriptor keeps the WIRE name for URL substitution.
    expect(client).toContain('params: [{ name: "widget-id", in: "path" }]');
    // reserved word `new` → `_new` argument, routed under the `new` key.
    expect(client).toContain(
      'export const getItem = (_new: string, init: RequestOptions = {}) => client.getItem({ new: _new }, init);'
    );
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
    const consumer = outdent`
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
    const urls = runConsumer(dir, consumer) as string[];
    expect(urls[0]).toBe('https://api.example.com/widgets/abc');
    expect(urls[1]).toBe('https://api.example.com/items/xyz');
  }, 60_000);
});
