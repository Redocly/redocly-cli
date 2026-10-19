import { generateClient } from '@redocly/client-generator';
/**
 * Behavioral e2e for the extension contract (D3). Rather than a live server, we
 * inject a fake `fetch` via `configure()` / `createClient(…, config)` and capture what
 * the generated runtime actually produced — proving that `serverUrl`, `config.headers`,
 * `onRequest`, transport-swap, and per-instance config observably take effect.
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runConsumer } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

describe('extension contract — flat surface (configure)', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('configure() applies serverUrl, config.headers, onRequest, and the fetch transport-swap', async () => {
    const captured = (await runConsumer(join(dir, 'configure-flat.ts'))) as {
      url: string;
      headers: Record<string, string>;
    };

    // serverUrl override was honored (not the spec's localhost:3102).
    expect(captured.url).toBe('https://configured.example/pets');
    // The fake fetch was actually used, and both config.headers + onRequest applied.
    expect(captured.headers['X-Tenant']).toBe('acme');
    expect(captured.headers['X-Trace']).toBe('trace-123');
  }, 60_000);

  test('onError maps a failed request to a custom error', async () => {
    const result = (await runConsumer(join(dir, 'on-error-maps.ts'))) as {
      threw: boolean;
      name: string;
      message: string;
    };

    expect(result.threw).toBe(true);
    expect(result.name).toBe('NotFound');
    expect(result.message).toBe('mapped:404');
  }, 60_000);
});

describe('extension contract — per-instance config (createClient)', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('two instances carry independent serverUrl + headers (multi-tenant isolation)', async () => {
    const calls = (await runConsumer(join(dir, 'instances-isolated.ts'))) as Array<{
      tag: string;
      url: string;
      tenant: string;
    }>;

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ tag: 'a', url: 'https://a.example/pets', tenant: 'A' });
    expect(calls[1]).toEqual({ tag: 'b', url: 'https://b.example/pets', tenant: 'B' });
  }, 60_000);

  test('the generated module instance keeps the spec-derived serverUrl unless overridden', async () => {
    const seen = (await runConsumer(join(dir, 'module-server-url.ts'))) as {
      captured: string;
    };

    // configure() only swapped the transport → the baked serverUrl from base.yaml stays.
    expect(seen.captured).toBe('http://localhost:3102/pets');
  }, 60_000);
});
