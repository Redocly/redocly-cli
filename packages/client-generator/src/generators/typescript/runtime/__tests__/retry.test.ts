import { defaultRetryOn, retryDelay, sleep } from '../retry.js';
import type { RetryContext } from '../types.js';

const ctx = (method: string, part: Partial<RetryContext>): RetryContext => ({
  attempt: 1,
  request: { url: 'u', method, headers: {}, operation: { id: 'x', path: '/x', tags: [] } },
  ...part,
});

describe('defaultRetryOn', () => {
  it('retries idempotent methods on transport errors and transient statuses', () => {
    expect(defaultRetryOn(ctx('GET', { error: new Error('net') }))).toBe(true);
    expect(defaultRetryOn(ctx('get', { error: new Error('net') }))).toBe(true); // case-insensitive
    expect(defaultRetryOn(ctx('DELETE', { response: new Response(null, { status: 503 }) }))).toBe(
      true
    );
  });

  it('never retries POST/PATCH; never retries non-transient statuses', () => {
    expect(defaultRetryOn(ctx('POST', { error: new Error('net') }))).toBe(false);
    expect(defaultRetryOn(ctx('PATCH', { response: new Response(null, { status: 503 }) }))).toBe(
      false
    );
    expect(defaultRetryOn(ctx('GET', { response: new Response(null, { status: 400 }) }))).toBe(
      false
    );
  });
});

describe('retryDelay', () => {
  it('honors Retry-After seconds over the computed backoff', () => {
    expect(retryDelay({ retryDelay: 100, jitter: false }, 1, '2')).toBe(2000);
  });

  it('honors an HTTP-date Retry-After (clamped at 0 for past dates)', () => {
    const past = new Date(Date.now() - 60_000).toUTCString();
    expect(retryDelay({ jitter: false }, 1, past)).toBe(0);
    const future = new Date(Date.now() + 5_000).toUTCString();
    const delay = retryDelay({ jitter: false }, 1, future);
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(5_000);
  });

  it('falls through an unparseable Retry-After to the backoff', () => {
    expect(retryDelay({ retryDelay: 100, jitter: false }, 1, 'not-a-date-or-number')).toBe(100);
  });

  it('exponential doubles per attempt; fixed stays constant (jitter off)', () => {
    expect(retryDelay({ retryDelay: 100, jitter: false }, 3, null)).toBe(400);
    expect(retryDelay({ retryDelay: 100, retryStrategy: 'fixed', jitter: false }, 3, null)).toBe(
      100
    );
    // Defaults: base 1000, exponential.
    expect(retryDelay({ jitter: false }, 2, null)).toBe(2000);
  });

  it('full jitter stays within [0, computed]', () => {
    const d = retryDelay({ retryDelay: 100 }, 3, null);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(400);
  });
});

describe('sleep', () => {
  it('resolves after the delay', async () => {
    await expect(sleep(1)).resolves.toBeUndefined();
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('pre-aborted'));
    await expect(sleep(5000, controller.signal)).rejects.toThrow('pre-aborted');
  });

  it('rejects when the signal aborts mid-sleep', async () => {
    const controller = new AbortController();
    const p = sleep(5000, controller.signal);
    controller.abort(new Error('stop'));
    await expect(p).rejects.toThrow('stop');
  });

  it('resolves normally when a signal is present but never aborts', async () => {
    const controller = new AbortController();
    await expect(sleep(1, controller.signal)).resolves.toBeUndefined();
  });
});
