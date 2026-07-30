import { abortError } from './errors.js';
import type { RetryConfig, RetryContext } from './types.js';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/**
 * The default retry predicate: idempotent methods only, on a transport error or a
 * transient status. A custom `retryOn` fully replaces this (no method check kept).
 */
export function defaultRetryOn(ctx: RetryContext): boolean {
  if (!IDEMPOTENT_METHODS.has(ctx.request.method.toUpperCase())) return false;
  return ctx.response === undefined || TRANSIENT_STATUS.has(ctx.response.status);
}

/**
 * The delay before the next attempt: a `Retry-After` header (seconds or HTTP-date)
 * wins; otherwise fixed/exponential backoff over `retryDelay`, with full jitter
 * unless `jitter === false`.
 */
export function retryDelay(retry: RetryConfig, attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) return seconds * 1000;
    const when = Date.parse(retryAfter);
    if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  }
  const base = retry.retryDelay ?? 1000;
  const raw = retry.retryStrategy === 'fixed' ? base : base * Math.pow(2, attempt - 1);
  return retry.jitter === false ? raw : Math.random() * raw;
}

/** Abort-aware sleep: resolves after `ms`, rejects with the abort reason immediately on abort. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(signal as AbortSignal));
    };
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}
