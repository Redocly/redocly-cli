/**
 * Behavioral e2e for retry. Injects a fake `fetch` via `configure()` so we can
 * script transient failures and count attempts deterministically — no live server.
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

function generate(dir: string): void {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  const out = join(dir, 'client.ts');
  const result = spawnSync('node', [cliEntry, 'generate-client', fixture, '--output', out], {
    encoding: 'utf-8',
    cwd: repoRoot,
  });
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

describe('retry behavior', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'retry-'));
    generate(dir);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('retries a GET on 503 then succeeds; default is no retry', () => {
    const result = runConsumer(
      dir,
      `
import { configure, listPets } from './client.ts';

let calls = 0;
const makeFetch = (failures: number) =>
  (async () => {
    calls++;
    if (calls <= failures) {
      return new Response('busy', { status: 503, headers: { 'content-type': 'text/plain' } });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

// retries: 0 (default) → one call, throws.
calls = 0;
configure({ fetch: makeFetch(1) });
let defaultThrew = false;
try { await listPets(); } catch { defaultThrew = true; }
const defaultCalls = calls;

// retries: 3, fast backoff → recovers after 2 failures.
calls = 0;
configure({ fetch: makeFetch(2), retry: { retries: 3, retryDelay: 1 } });
await listPets();
const retryCalls = calls;

console.log(JSON.stringify({ defaultThrew, defaultCalls, retryCalls }));
`
    ) as { defaultThrew: boolean; defaultCalls: number; retryCalls: number };

    expect(result.defaultThrew).toBe(true);
    expect(result.defaultCalls).toBe(1);
    expect(result.retryCalls).toBe(3); // 2 failures + 1 success
  }, 60_000);

  test('does NOT retry a non-idempotent POST by default, but does when retryOn opts in', () => {
    const result = runConsumer(
      dir,
      `
import { configure, createPet } from './client.ts';

let calls = 0;
const failing = (async () => {
  calls++;
  return new Response('err', { status: 503, headers: { 'content-type': 'text/plain' } });
}) as unknown as typeof fetch;

// default predicate: POST is not idempotent → no retry.
calls = 0;
configure({ fetch: failing, retry: { retries: 3, retryDelay: 1 } });
try { await createPet({ name: 'x' } as any); } catch {}
const defaultCalls = calls;

// retryOn: () => true → POST retried.
calls = 0;
configure({ fetch: failing, retry: { retries: 3, retryDelay: 1, retryOn: () => true } });
try { await createPet({ name: 'x' } as any); } catch {}
const optInCalls = calls;

console.log(JSON.stringify({ defaultCalls, optInCalls }));
`
    ) as { defaultCalls: number; optInCalls: number };

    expect(result.defaultCalls).toBe(1); // POST not retried by default
    expect(result.optInCalls).toBe(4); // 1 + 3 retries
  }, 60_000);

  test('aborting during backoff stops retries and rejects', () => {
    const result = runConsumer(
      dir,
      `
import { configure, listPets } from './client.ts';

let calls = 0;
const failing = (async () => {
  calls++;
  return new Response('err', { status: 503, headers: { 'content-type': 'text/plain' } });
}) as unknown as typeof fetch;

configure({ fetch: failing, retry: { retries: 5, retryDelay: 50 } });
const controller = new AbortController();
setTimeout(() => controller.abort(), 10);

let aborted = false;
try {
  // listPets takes (params, init); the signal belongs on init.
  await listPets({}, { signal: controller.signal });
} catch (e) {
  aborted = (e as Error).name === 'AbortError';
}
console.log(JSON.stringify({ aborted, calls }));
`
    ) as { aborted: boolean; calls: number };

    expect(result.aborted).toBe(true);
    expect(result.calls).toBe(1); // aborted during the first backoff; no second attempt
  }, 60_000);
});
