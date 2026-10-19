/**
 * Behavioral e2e for composable middleware/interceptors. Like `extension.test.ts`, we
 * inject a fake `fetch` and exercise the generated runtime in a real consumer, proving
 * that `use()` registers middleware, `onRequest` runs in order, `onResponse` runs in
 * reverse (onion), `onError` chains, `onSettled` sees the final outcome once per call,
 * and configured middleware precedes `use()`.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateInto, runConsumerFile, strictTypecheck } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

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
    const captured = runConsumerFile(dir, join(__dirname, 'consumer', 'onion-order.ts')) as {
      order: string[];
      hasA: boolean;
      hasB: boolean;
    };

    expect(captured.order).toEqual(['req-A', 'req-B', 'res-B', 'res-A']);
    expect(captured.hasA).toBe(true);
    expect(captured.hasB).toBe(true);
  }, 60_000);

  test('onError threads through each middleware in turn', () => {
    const result = runConsumerFile(dir, join(__dirname, 'consumer', 'on-error-chain.ts')) as {
      threw: boolean;
      message: string;
    };

    expect(result.threw).toBe(true);
    expect(result.message).toBe('second:first:500');
  }, 60_000);

  test('onSettled runs once per call with the final outcome, network errors included', () => {
    const result = runConsumerFile(dir, join(__dirname, 'consumer', 'on-settled.ts')) as {
      lines: string[];
    };

    expect(result.lines).toEqual(['listPets 200 2', 'listPets failed 1']);
    strictTypecheck(dir, ['client.ts', 'on-settled.ts']);
  }, 60_000);

  test('use() does not mutate a caller-provided middleware array (no cross-client leak)', () => {
    const result = runConsumerFile(
      dir,
      join(__dirname, 'consumer', 'caller-array-not-mutated.ts')
    ) as { mineLength: number };

    // use() must append to a fresh array, not push into the array the caller passed.
    expect(result.mineLength).toBe(0);
  }, 60_000);

  test('the single config.onRequest hook still runs (as an implicit first middleware)', () => {
    const captured = runConsumerFile(dir, join(__dirname, 'consumer', 'config-on-request.ts')) as {
      order: string[];
    };

    expect(captured.order).toEqual(['config', 'mw']);
  }, 60_000);

  test('onRequest sees ctx.operation { id, path, tags }', () => {
    const captured = runConsumerFile(dir, join(__dirname, 'consumer', 'operation-context.ts')) as {
      op: { id: string; path: string; tags: string[] };
    };

    expect(captured.op.id).toBe('createPet');
    expect(captured.op.path).toBe('/pets');
    expect(Array.isArray(captured.op.tags)).toBe(true);
  }, 60_000);

  test('onRequest can mutate ctx.body and the change is sent', () => {
    const captured = runConsumerFile(dir, join(__dirname, 'consumer', 'mutate-body.ts')) as {
      sent: string;
    };

    expect(JSON.parse(captured.sent)).toEqual({ name: 'Mutated' });
  }, 60_000);

  test('configure({ middleware }) runs before later use() middleware', () => {
    const captured = runConsumerFile(
      dir,
      join(__dirname, 'consumer', 'configured-before-use.ts')
    ) as { order: string[] };

    expect(captured.order).toEqual(['configured', 'use']);
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
    const captured = runConsumerFile(dir, join(__dirname, 'consumer', 'split-barrel.ts')) as {
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
    dir = mkdtempSync(join(tmpdir(), 'mw-result-'));
    generateInto(dir, fixture, ['--error-mode', 'result']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('onRequest/onResponse run; onError does not fire (the error is returned, not thrown)', () => {
    const result = runConsumerFile(dir, join(__dirname, 'consumer', 'result-mode.ts')) as {
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
