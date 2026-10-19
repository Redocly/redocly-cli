/**
 * Behavioral e2e for retry. Injects a fake `fetch` via `configure()` so we can
 * script transient failures and count attempts deterministically — no live server.
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, generate, runConsumer } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

describe('retry behavior', () => {
  let dir = '';
  beforeAll(() => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    generate(fixture, join(dir, 'client.ts'));
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('retries a GET on 503 then succeeds; default is no retry', () => {
    const result = runConsumer(join(dir, 'retry-get-on-503.ts')) as {
      defaultThrew: boolean;
      defaultCalls: number;
      retryCalls: number;
    };

    expect(result.defaultThrew).toBe(true);
    expect(result.defaultCalls).toBe(1);
    expect(result.retryCalls).toBe(3); // 2 failures + 1 success
  }, 60_000);

  test('drains the unread body of a retried response before the next attempt', () => {
    const result = runConsumer(join(dir, 'drain-retried-body.ts')) as {
      calls: number;
      cancelled: number;
    };

    expect(result.calls).toBe(2); // 1 failure + 1 success
    expect(result.cancelled).toBe(1); // the abandoned 503 body was cancelled before retrying
  }, 60_000);

  test('does NOT retry a non-idempotent POST by default, but does when retryOn opts in', () => {
    const result = runConsumer(join(dir, 'post-not-retried.ts')) as {
      defaultCalls: number;
      optInCalls: number;
    };

    expect(result.defaultCalls).toBe(1); // POST not retried by default
    expect(result.optInCalls).toBe(4); // 1 + 3 retries
  }, 60_000);

  test('aborting during backoff stops retries and rejects', () => {
    const result = runConsumer(join(dir, 'abort-during-backoff.ts')) as {
      aborted: boolean;
      calls: number;
    };

    expect(result.aborted).toBe(true);
    expect(result.calls).toBe(1); // aborted during the first backoff; no second attempt
  }, 60_000);
});
