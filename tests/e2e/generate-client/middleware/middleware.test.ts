/**
 * Behavioral e2e for composable middleware/interceptors. Like `extension.test.ts`, we
 * inject a fake `fetch` and exercise the generated runtime in a real consumer, proving
 * that `use()` registers middleware, `onRequest` runs in order, `onResponse` runs in
 * reverse (onion), `onError` chains, `onSettled` sees the final outcome once per call,
 * and configured middleware precedes `use()`.
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, generate, runConsumer, strictTypecheck } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

describe('middleware — flat surface (use)', () => {
  let dir = '';
  beforeAll(() => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    generate(fixture, join(dir, 'client.ts'));
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('use() registers middleware: onRequest runs in order, onResponse in reverse (onion)', () => {
    const captured = runConsumer(join(dir, 'onion-order.ts')) as {
      order: string[];
      hasA: boolean;
      hasB: boolean;
    };

    expect(captured.order).toEqual(['req-A', 'req-B', 'res-B', 'res-A']);
    expect(captured.hasA).toBe(true);
    expect(captured.hasB).toBe(true);
  }, 60_000);

  test('onError threads through each middleware in turn', () => {
    const result = runConsumer(join(dir, 'on-error-chain.ts')) as {
      threw: boolean;
      message: string;
    };

    expect(result.threw).toBe(true);
    expect(result.message).toBe('second:first:500');
  }, 60_000);

  test('onSettled runs once per call with the final outcome, network errors included', () => {
    const result = runConsumer(join(dir, 'on-settled.ts')) as {
      lines: string[];
    };

    expect(result.lines).toEqual(['listPets 200 2', 'listPets failed 1']);
    strictTypecheck(dir, ['client.ts', 'on-settled.ts']);
  }, 60_000);

  test('use() does not mutate a caller-provided middleware array (no cross-client leak)', () => {
    const result = runConsumer(join(dir, 'caller-array-not-mutated.ts')) as { mineLength: number };

    // use() must append to a fresh array, not push into the array the caller passed.
    expect(result.mineLength).toBe(0);
  }, 60_000);

  test('the single config.onRequest hook still runs (as an implicit first middleware)', () => {
    const captured = runConsumer(join(dir, 'config-on-request.ts')) as {
      order: string[];
    };

    expect(captured.order).toEqual(['config', 'mw']);
  }, 60_000);

  test('onRequest sees ctx.operation { id, path, tags }', () => {
    const captured = runConsumer(join(dir, 'operation-context.ts')) as {
      op: { id: string; path: string; tags: string[] };
    };

    expect(captured.op.id).toBe('createPet');
    expect(captured.op.path).toBe('/pets');
    expect(Array.isArray(captured.op.tags)).toBe(true);
  }, 60_000);

  test('onRequest can mutate ctx.body and the change is sent', () => {
    const captured = runConsumer(join(dir, 'mutate-body.ts')) as {
      sent: string;
    };

    expect(JSON.parse(captured.sent)).toEqual({ name: 'Mutated' });
  }, 60_000);

  test('configure({ middleware }) runs before later use() middleware', () => {
    const captured = runConsumer(join(dir, 'configured-before-use.ts')) as { order: string[] };

    expect(captured.order).toEqual(['configured', 'use']);
  }, 60_000);
});

describe('middleware — multi-file output (split)', () => {
  let dir = '';
  beforeAll(() => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    generate(fixture, join(dir, 'client.ts'), ['--output-mode', 'split']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('configure() and use() are re-exported by the entry barrel and affect operations', () => {
    const captured = runConsumer(join(dir, 'split-barrel.ts')) as {
      url: string;
      header: string;
    };
    expect(new URL(captured.url).origin).toBe('https://multi.example.com');
    expect(captured.header).toBe('yes');
  }, 60_000);
});

describe('middleware — result error mode', () => {
  let dir = '';
  beforeAll(() => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    generate(fixture, join(dir, 'client.ts'), ['--error-mode', 'result']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('onRequest/onResponse run; onError does not fire (the error is returned, not thrown)', () => {
    const result = runConsumer(join(dir, 'result-mode.ts')) as {
      ran: string[];
      hasError: boolean;
      hasData: boolean;
    };

    // onRequest + onResponse ran; onError did NOT (result mode returns the error).
    expect(result.ran).toEqual(['req', 'res']);
    expect(result.hasError).toBe(true);
    expect(result.hasData).toBe(false);
  }, 60_000);
});
