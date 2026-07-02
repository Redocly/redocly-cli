/**
 * Behavioral e2e for the extension contract (D3). Rather than a live server, we
 * inject a fake `fetch` via `configure()` / `new Client(config)` and capture what
 * the generated runtime actually produced — proving that `serverUrl`, `config.headers`,
 * `onRequest`, transport-swap, and per-instance config observably take effect.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/base.yaml');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');

function generate(dir: string, extraArgs: string[] = []): void {
  // Mark the temp dir as ESM so tsx runs the consumer with top-level await support.
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  const out = join(dir, 'client.ts');
  const result = spawnSync(
    'node',
    [cliEntry, 'generate-client', fixture, '--output', out, ...extraArgs],
    { encoding: 'utf-8', cwd: repoRoot }
  );
  if (result.status !== 0) throw new Error(`generate-client failed:\n${result.stderr}`);
}

function runConsumer(dir: string, script: string): unknown {
  writeFileSync(join(dir, 'consumer.ts'), script, 'utf-8');
  const result = spawnSync(tsxBin, [join(dir, 'consumer.ts')], {
    encoding: 'utf-8',
    cwd: repoRoot,
  });
  if (result.status !== 0) {
    throw new Error(`consumer failed:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim());
}

describe('extension contract — functions facade (configure)', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ext-fn-'));
    generate(dir);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('configure() applies serverUrl, config.headers, onRequest, and the fetch transport-swap', () => {
    const captured = runConsumer(
      dir,
      `
import { configure, listPets } from './client.ts';

const seen: { url?: string; headers?: Record<string, string> } = {};
configure({
  serverUrl: 'https://configured.example',
  headers: { 'X-Tenant': 'acme' },
  onRequest: (ctx) => { ctx.headers['X-Trace'] = 'trace-123'; },
  fetch: (async (url: string, init: RequestInit) => {
    seen.url = String(url);
    seen.headers = init.headers as Record<string, string>;
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});

await listPets();
console.log(JSON.stringify(seen));
`
    ) as { url: string; headers: Record<string, string> };

    // serverUrl override was honored (not the spec's localhost:3102).
    expect(captured.url).toBe('https://configured.example/pets');
    // The fake fetch was actually used, and both config.headers + onRequest applied.
    expect(captured.headers['X-Tenant']).toBe('acme');
    expect(captured.headers['X-Trace']).toBe('trace-123');
  }, 60_000);

  test('onError maps a failed request to a custom error', () => {
    const result = runConsumer(
      dir,
      `
import { configure, getPetById, ApiError } from './client.ts';

class NotFound extends Error {}
configure({
  fetch: (async () =>
    new Response('{"detail":"nope"}', { status: 404, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch,
  onError: (error: ApiError) => new NotFound('mapped:' + error.status),
});

try {
  await getPetById(1);
  console.log(JSON.stringify({ threw: false }));
} catch (e) {
  console.log(JSON.stringify({ threw: true, name: (e as Error).constructor.name, message: (e as Error).message }));
}
`
    ) as { threw: boolean; name: string; message: string };

    expect(result.threw).toBe(true);
    expect(result.name).toBe('NotFound');
    expect(result.message).toBe('mapped:404');
  }, 60_000);
});

describe('extension contract — service-class facade (per-instance config)', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ext-sc-'));
    generate(dir, ['--facade', 'service-class', '--name', 'PetClient']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('two instances carry independent serverUrl + headers (multi-tenant isolation)', () => {
    const calls = runConsumer(
      dir,
      `
import { PetClient } from './client.ts';

const calls: Array<{ tag: string; url: string; tenant: string }> = [];
const make = (tag: string) =>
  (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ tag, url: String(url), tenant: headers['X-Tenant'] });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

const a = new PetClient({ serverUrl: 'https://a.example', headers: { 'X-Tenant': 'A' }, fetch: make('a') });
const b = new PetClient({ serverUrl: 'https://b.example', headers: { 'X-Tenant': 'B' }, fetch: make('b') });

await a.listPets();
await b.listPets();
console.log(JSON.stringify(calls));
`
    ) as Array<{ tag: string; url: string; tenant: string }>;

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ tag: 'a', url: 'https://a.example/pets', tenant: 'A' });
    expect(calls[1]).toEqual({ tag: 'b', url: 'https://b.example/pets', tenant: 'B' });
  }, 60_000);

  test('an instance with no config falls back to the spec-derived BASE', () => {
    const seen = runConsumer(
      dir,
      `
import { PetClient } from './client.ts';

let captured = '';
const client = new PetClient({
  fetch: (async (url: string) => {
    captured = String(url);
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
await client.listPets();
console.log(JSON.stringify({ captured }));
`
    ) as { captured: string };

    // No serverUrl in config → falls back to the inlined BASE from base.yaml.
    expect(seen.captured).toBe('http://localhost:3102/pets');
  }, 60_000);
});
