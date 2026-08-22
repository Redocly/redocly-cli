import { type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateInto, killServer, runConsumer, startServer, strictTypecheck } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');
const serverScript = join(__dirname, 'cafe-consumer/server.ts');

const SERVER_PORT = 3113;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client --runtime module (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;
  let dir = '';

  beforeAll(async () => {
    serverProcess = await startServer(
      serverScript,
      join(__dirname, 'cafe-consumer'),
      { CAFE_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'module-runtime-server'
    );
    dir = mkdtempSync(join(tmpdir(), 'module-runtime-'));
    generateInto(dir, fixture, ['--runtime', 'module', '--server-url', SERVER_BASE]);
  }, 120_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the per-needs runtime files and a client that imports them relatively', () => {
    // cafe needs auth — its multipart body is untyped (binary upload), no SSE,
    // no pagination, no setup — so only the core modules + auth are written.
    for (const name of [
      'types',
      'errors',
      'url',
      'parse',
      'retry',
      'auth',
      'send',
      'create-client',
      'factory',
    ]) {
      expect(existsSync(join(dir, 'runtime', `${name}.ts`)), name).toBe(true);
    }
    for (const name of ['multipart', 'sse', 'paginate', 'setup']) {
      expect(existsSync(join(dir, 'runtime', `${name}.ts`)), name).toBe(false);
    }
    const entry = readFileSync(join(dir, 'client.ts'), 'utf-8');
    expect(entry).toContain("import { createClient } from './runtime/factory.js';");
    expect(entry).toContain("export * from './runtime/factory.js';");
    expect(entry).not.toContain('// ─── Embedded runtime');
  });

  it('the client + runtime folder type-check strictly together', () => {
    strictTypecheck(dir);
  }, 120_000);

  it('a real request goes through the runtime files and returns typed data', () => {
    const results = runConsumer(
      dir,
      `import { ApiError, listMenuItems } from './client.js';
const items = await listMenuItems({});
console.log(JSON.stringify({ ok: Array.isArray(items.items), viaApiError: typeof ApiError }));
`
    ) as { ok: boolean; viaApiError: string };
    expect(results.ok).toBe(true);
    // The error class reaches the consumer through the factory re-export chain.
    expect(results.viaApiError).toBe('function');
  }, 120_000);
});
