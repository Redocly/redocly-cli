// Behavioral proof of per-instance auth: two `createClient` instances built over the
// SAME generated descriptors carry different `config.auth` and send different
// credentials — without touching the generated module's own client instance or its
// setter sugar. A no-auth instance sends nothing. We capture the wire `Authorization`
// header via an injected `config.fetch`, so no mock server is needed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');

const SPEC = outdent`
  openapi: 3.1.0
  info: { title: Thing API, version: '1.0.0' }
  servers: [{ url: https://api.example.com }]
  components:
    securitySchemes:
      basicAuth: { type: http, scheme: basic }
  paths:
    /thing:
      get:
        operationId: getThing
        security: [{ basicAuth: [] }]
        responses:
          '200': { description: ok, content: { application/json: { schema: { type: object } } } }
`;

const DRIVER = outdent`
  import { createClient } from '@redocly/client-generator';
  import { OPERATIONS, type Ops } from './client.js';

  const calls: (string | null)[] = [];
  const fakeFetch = (async (_url: string, init?: RequestInit) => {
    const h = (init?.headers ?? {}) as Record<string, string>;
    calls.push(h['Authorization'] ?? null);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

  async function main() {
    const authed = createClient<Ops>(OPERATIONS, {
      fetch: fakeFetch,
      auth: { basic: { username: 'alice', password: 'pw' } },
    });
    const anon = createClient<Ops>(OPERATIONS, { fetch: fakeFetch });
    await authed.getThing();
    await anon.getThing();
    console.log(JSON.stringify(calls));
  }
  void main();
`;

describe('per-instance auth (createClient config.auth)', () => {
  it('two instances send different credentials; a no-auth instance sends none', () => {
    // The temp dir lives INSIDE the repo so the driver's import of
    // `@redocly/client-generator` resolves through the workspace node_modules symlink.
    const dir = mkdtempSync(join(__dirname, '.tmp-perinstance-'));
    try {
      writeFileSync(join(dir, 'openapi.yaml'), SPEC, 'utf-8');
      // Mark the temp dir as ESM so tsx imports the generated `./client.js` and the
      // driver's top-level structure resolve as modules.
      writeFileSync(join(dir, 'package.json'), '{ "type": "module" }', 'utf-8');
      const gen = spawnSync(
        'node',
        [
          cli,
          'generate-client',
          join(dir, 'openapi.yaml'),
          '--output',
          join(dir, 'client.ts'),
          '--runtime',
          'package',
        ],
        { encoding: 'utf-8', cwd: repoRoot }
      );
      expect(gen.status, gen.stderr).toBe(0);

      writeFileSync(join(dir, 'driver.ts'), DRIVER, 'utf-8');
      const run = spawnSync(tsx, [join(dir, 'driver.ts')], { encoding: 'utf-8', cwd: dir });
      expect(run.status, run.stderr).toBe(0);

      const calls = JSON.parse(run.stdout.trim()) as (string | null)[];
      const expected = 'Basic ' + Buffer.from('alice:pw').toString('base64');
      expect(calls[0]).toBe(expected); // the authed instance sent its own basic credential
      expect(calls[1]).toBeNull(); // the no-auth instance sent nothing (no shared state)
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
