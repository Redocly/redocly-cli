import { generateClient } from '@redocly/client-generator';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runConsumer, strictTypecheck } from '../helpers.js';
import type { MockServer } from '../mock-server.js';
import { startCafeServer } from '../servers/cafe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/cafe.yaml');

describe('generate-client --runtime module (end-to-end)', () => {
  let server: MockServer;
  let dir = '';

  beforeAll(async () => {
    server = await startCafeServer();
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: fixture,
      output: join(dir, 'client.ts'),
      runtime: 'module',
      serverUrl: server.url,
    });
  }, 120_000);

  afterAll(async () => {
    await server.close();
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

  it('a real request goes through the runtime files and returns typed data', async () => {
    const results = (await runConsumer(join(dir, 'list-menu-items.ts'))) as {
      ok: boolean;
      viaApiError: string;
    };
    expect(results.ok).toBe(true);
    // The error class reaches the consumer through the factory re-export chain.
    expect(results.viaApiError).toBe('function');
  }, 120_000);
});
