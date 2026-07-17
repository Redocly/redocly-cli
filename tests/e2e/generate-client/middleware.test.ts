/**
 * Behavioral e2e for composable middleware/interceptors. Like `extension.test.ts`, we
 * inject a fake `fetch` and exercise the generated runtime in a real consumer, proving
 * that `use()` registers middleware, `onRequest` runs in order, `onResponse` runs in
 * reverse (onion), `onError` chains, and configured middleware precedes `use()`.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { generateInto, runConsumer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');

const OK = `new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })`;

describe('middleware — flat surface (use)', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mw-fn-'));
    generateInto(dir, fixture);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('use() registers middleware: onRequest runs in order, onResponse in reverse (onion)', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { configure, use, listPets } from './client.ts';

        const order: string[] = [];
        let headers: Record<string, string> = {};
        configure({
          fetch: (async (_url: string, init: RequestInit) => {
            headers = init.headers as Record<string, string>;
            return ${OK};
          }) as unknown as typeof fetch,
        });
        use(
          { onRequest: (ctx) => { order.push('req-A'); ctx.headers['X-A'] = '1'; }, onResponse: () => { order.push('res-A'); } },
          { onRequest: (ctx) => { order.push('req-B'); ctx.headers['X-B'] = '1'; }, onResponse: () => { order.push('res-B'); } },
        );
        await listPets();
        console.log(JSON.stringify({ order, hasA: 'X-A' in headers, hasB: 'X-B' in headers }));
      `
    ) as { order: string[]; hasA: boolean; hasB: boolean };

    expect(captured.order).toEqual(['req-A', 'req-B', 'res-B', 'res-A']);
    expect(captured.hasA).toBe(true);
    expect(captured.hasB).toBe(true);
  }, 60_000);

  test('onError threads through each middleware in turn', () => {
    const result = runConsumer(
      dir,
      outdent`
        import { configure, use, getPetById, type ApiError } from './client.ts';

        configure({
          fetch: (async () => new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch,
        });
        use(
          { onError: (e: ApiError) => new Error('first:' + e.status) },
          { onError: (e) => new Error('second:' + e.message) },
        );
        try {
          await getPetById(1);
          console.log(JSON.stringify({ threw: false }));
        } catch (e) {
          console.log(JSON.stringify({ threw: true, message: (e as Error).message }));
        }
      `
    ) as { threw: boolean; message: string };

    expect(result.threw).toBe(true);
    expect(result.message).toBe('second:first:500');
  }, 60_000);

  test('use() does not mutate a caller-provided middleware array (no cross-client leak)', () => {
    const result = runConsumer(
      dir,
      outdent`
        import { configure, use, listPets, type Middleware } from './client.ts';

        const mine: Middleware[] = [];
        configure({ middleware: mine, fetch: (async () => ${OK}) as unknown as typeof fetch });
        use({ onRequest: () => {} });
        await listPets();
        console.log(JSON.stringify({ mineLength: mine.length }));
      `
    ) as { mineLength: number };

    // use() must append to a fresh array, not push into the array the caller passed.
    expect(result.mineLength).toBe(0);
  }, 60_000);

  test('the single config.onRequest hook still runs (as an implicit first middleware)', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { configure, use, listPets } from './client.ts';

        const order: string[] = [];
        configure({
          onRequest: () => { order.push('config'); },
          fetch: (async () => ${OK}) as unknown as typeof fetch,
        });
        use({ onRequest: () => { order.push('mw'); } });
        await listPets();
        console.log(JSON.stringify({ order }));
      `
    ) as { order: string[] };

    expect(captured.order).toEqual(['config', 'mw']);
  }, 60_000);

  test('onRequest sees ctx.operation { id, path, tags }', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { configure, use, createPet } from './client.ts';

        let op: unknown;
        configure({ fetch: (async () => ${OK}) as unknown as typeof fetch });
        use({ onRequest: (ctx) => { op = ctx.operation; } });
        await createPet({ name: 'Rex' });
        console.log(JSON.stringify({ op }));
      `
    ) as { op: { id: string; path: string; tags: string[] } };

    expect(captured.op.id).toBe('createPet');
    expect(captured.op.path).toBe('/pets');
    expect(Array.isArray(captured.op.tags)).toBe(true);
  }, 60_000);

  test('onRequest can mutate ctx.body and the change is sent', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { configure, use, createPet } from './client.ts';

        let sent = '';
        configure({
          fetch: (async (_url: string, init: RequestInit) => { sent = init.body as string; return ${OK}; }) as unknown as typeof fetch,
        });
        use({ onRequest: (ctx) => { (ctx.body as { name: string }).name = 'Mutated'; } });
        await createPet({ name: 'Rex' });
        console.log(JSON.stringify({ sent }));
      `
    ) as { sent: string };

    expect(JSON.parse(captured.sent)).toEqual({ name: 'Mutated' });
  }, 60_000);
});

describe('middleware — multi-file output (split)', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mw-split-'));
    generateInto(dir, fixture, ['--output-mode', 'split']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('configure() and use() are re-exported by the entry barrel and affect operations', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { configure, use, listPets } from './client.ts';
        let url = '', header = '';
        configure({ serverUrl: 'https://multi.example.com', fetch: (async (u: string, init: RequestInit) => { url = u; header = (init.headers as Record<string,string>)['X-MW']; return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }); }) as unknown as typeof fetch });
        use({ onRequest: (ctx) => { ctx.headers['X-MW'] = 'yes'; } });
        await listPets();
        console.log(JSON.stringify({ url, header }));
      `
    ) as { url: string; header: string };
    expect(new URL(captured.url).origin).toBe('https://multi.example.com');
    expect(captured.header).toBe('yes');
  }, 60_000);
});

describe('middleware — result error mode', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mw-result-'));
    generateInto(dir, fixture, ['--error-mode', 'result']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('onRequest/onResponse run; onError does not fire (the error is returned, not thrown)', () => {
    const result = runConsumer(
      dir,
      outdent`
        import { configure, use, getPetById } from './client.ts';

        const ran: string[] = [];
        configure({
          fetch: (async () => new Response('{"bad":true}', { status: 500, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch,
        });
        use({
          onRequest: () => { ran.push('req'); },
          onResponse: () => { ran.push('res'); },
          onError: () => { ran.push('err'); return new Error('should-not-run'); },
        });
        const r = await getPetById(1) as { error: unknown; data: unknown };
        console.log(JSON.stringify({ ran, hasError: r.error !== undefined, hasData: r.data !== undefined }));
      `
    ) as { ran: string[]; hasError: boolean; hasData: boolean };

    // onRequest + onResponse ran; onError did NOT (result mode returns the error).
    expect(result.ran).toEqual(['req', 'res']);
    expect(result.hasError).toBe(true);
    expect(result.hasData).toBe(false);
  }, 60_000);
});

describe('middleware — configured chain precedes use()', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mw-cfg-'));
    generateInto(dir, fixture);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('configure({ middleware }) runs before later use() middleware', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { client } from './client.ts';

        const order: string[] = [];
        client.configure({
          fetch: (async () => ${OK}) as unknown as typeof fetch,
          middleware: [{ onRequest: () => { order.push('configured'); } }],
        });
        client.use({ onRequest: () => { order.push('use'); } });
        await client.listPets();
        console.log(JSON.stringify({ order }));
      `
    ) as { order: string[] };

    expect(captured.order).toEqual(['configured', 'use']);
  }, 60_000);
});
