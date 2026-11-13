import { abortError, TimeoutError } from './errors.js';
import { defaultRetryOn, retryDelay, sleep } from './retry.js';
import type {
  ClientConfig,
  Middleware,
  OperationContext,
  RequestContext,
  RequestOptions,
  RetryConfig,
  SettledCall,
} from './types.js';

/**
 * Optional behaviors the send core can use but never statically imports — wired by
 * `createClient` (the same seam the future inline-mode assembler relies on).
 */
export type SendCapabilities = {
  /** Serialize a typed multipart body (a plain object) to FormData. */
  serializeMultipart?: (body: Record<string, unknown>) => FormData;
};

/**
 * Normalize a caller's `HeadersInit` (plain record, `Headers` instance, or entry pairs)
 * to a plain record — spreading a `Headers` or an array contributes no entries.
 */
export function toHeaderRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (headers === undefined) return {};
  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

/**
 * The effective middleware chain for a request: the single `onRequest`/`onResponse`/
 * `onError` config hooks as one implicit first middleware, then `config.middleware`.
 */
export function middlewareChain(config: ClientConfig): Middleware[] {
  const single =
    config.onRequest || config.onResponse || config.onError
      ? [
          {
            ...(config.onRequest ? { onRequest: config.onRequest } : {}),
            ...(config.onResponse ? { onResponse: config.onResponse } : {}),
            ...(config.onError ? { onError: config.onError } : {}),
          },
        ]
      : [];
  return [...single, ...(config.middleware ?? [])];
}

/**
 * `AbortSignal.timeout()` where the platform has it, else an `AbortController` armed by
 * `setTimeout`: Chrome before 103, Safari before 16, and Firefox before 100 lack the
 * static, and every request with a timeout would throw before `fetch` runs.
 */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException(`Timed out after ${ms} ms`, 'TimeoutError'));
  }, ms);
  return controller.signal;
}

/**
 * `AbortSignal.any()` where the platform has it, else a controller that follows whichever
 * signal aborts first: Chrome before 116, Safari before 17.4, and Firefox before 124 lack
 * the static. The listeners come off once one signal fires, so a caller's long-lived
 * signal does not keep one per request.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const controller = new AbortController();
  const listeners = new Map<AbortSignal, () => void>();
  const abort = (reason: unknown) => {
    for (const [signal, listener] of listeners) signal.removeEventListener('abort', listener);
    controller.abort(reason);
  };
  for (const signal of signals) {
    const listener = () => abort(signal.reason);
    listeners.set(signal, listener);
    signal.addEventListener('abort', listener);
  }
  return controller.signal;
}

/**
 * The fetch core shared by every operation: default + config + per-call headers, the
 * `onRequest` chain (BEFORE body serialization, so mutations are sent), body
 * serialization (JSON, or FormData via the multipart capability; a stream passes
 * through in one attempt), the retry loop
 * (idempotent-only defaults, `Retry-After`, abandoned-body drain), and the reverse
 * `onResponse` onion, then the `onSettled` chain once with the final outcome. Returns the
 * final response plus the request context.
 */
export async function send(
  config: ClientConfig,
  op: OperationContext,
  url: string,
  init: RequestOptions,
  body: unknown | undefined,
  bodySpec: { contentType: string; multipart?: boolean } | undefined,
  caps: SendCapabilities,
  accept = 'application/json'
): Promise<{ response: Response; context: RequestContext }> {
  const { retry: callRetry, timeout: callTimeout, idempotencyKey: callKey, ...fetchInit } = init;
  const retry: RetryConfig = { ...config.retry, ...callRetry };
  const timeout = callTimeout ?? config.timeout;
  const idempotency = callKey ?? config.idempotencyKey;
  const extra = typeof config.headers === 'function' ? await config.headers() : config.headers;
  const headers: Record<string, string> = {
    Accept: accept,
    ...extra,
    ...toHeaderRecord(fetchInit.headers),
  };
  const method = (fetchInit.method ?? 'GET').toUpperCase();
  // One stable key per LOGICAL call — set before the retry loop so every attempt
  // re-sends the same key; a caller-provided header always wins.
  if (
    idempotency !== undefined &&
    idempotency !== false &&
    (method === 'POST' || method === 'PATCH') &&
    !('Idempotency-Key' in headers) &&
    !('idempotency-key' in headers)
  ) {
    headers['Idempotency-Key'] =
      typeof idempotency === 'string'
        ? idempotency
        : typeof idempotency === 'function'
          ? idempotency()
          : crypto.randomUUID();
  }
  // Client identification for the API owner's telemetry — never in browsers, where a
  // custom header would force a CORS preflight the API may not allow.
  if (
    typeof config.clientHeader === 'string' &&
    typeof document === 'undefined' &&
    !('X-Redocly-Client' in headers) &&
    !('x-redocly-client' in headers)
  ) {
    headers['X-Redocly-Client'] = config.clientHeader;
  }
  const context: RequestContext = {
    url,
    method: fetchInit.method ?? 'GET',
    headers,
    body,
    operation: op,
  };
  const middleware = middlewareChain(config);
  for (const mw of middleware) if (mw.onRequest) await mw.onRequest(context);
  // Serialize AFTER onRequest so body mutations (case conversion, enveloping, signing) take effect.
  let payload: BodyInit | undefined;
  let isStream = false;
  if (context.body !== undefined) {
    const value = context.body;
    const isBinary =
      value instanceof Blob ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value as ArrayBufferView);
    const isFormData = typeof FormData !== 'undefined' && value instanceof FormData;
    const isURLSearchParams = value instanceof URLSearchParams;
    isStream =
      (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) ||
      (value !== null &&
        typeof (value as Partial<AsyncIterable<unknown>>)[Symbol.asyncIterator] === 'function');
    const hasContentType = 'Content-Type' in context.headers || 'content-type' in context.headers;
    if (isFormData || isURLSearchParams || isBinary || isStream || typeof value === 'string') {
      payload = value as BodyInit;
      // `fetch` derives the type of FormData and URLSearchParams, boundary included, and a
      // multipart boundary is only the caller's to set. Any other pass-through body gets
      // the declared type when the caller set none.
      const declared = bodySpec?.contentType;
      if (
        !isFormData &&
        !isURLSearchParams &&
        !hasContentType &&
        declared !== undefined &&
        !declared.toLowerCase().includes('multipart')
      ) {
        context.headers['Content-Type'] = declared;
      }
    } else if (bodySpec?.multipart === true) {
      if (!caps.serializeMultipart) {
        throw new Error('Multipart capability not wired: cannot serialize the request body');
      }
      payload = caps.serializeMultipart(value as Record<string, unknown>);
    } else {
      payload = JSON.stringify(value);
      if (!hasContentType) {
        // The spec's declared request content type (e.g. application/merge-patch+json).
        context.headers['Content-Type'] = bodySpec?.contentType ?? 'application/json';
      }
    }
  }
  const doFetch = config.fetch ?? fetch;
  // A stream is consumed by the first attempt and cannot be replayed, so it never retries.
  const maxAttempts = isStream ? 1 : 1 + (retry.retries ?? 0);
  const retryOn = retry.retryOn ?? defaultRetryOn;
  const signal = fetchInit.signal ?? undefined;

  const startedAt = Date.now();
  let attempt = 0;
  let finalResponse: Response;
  let lastResponse: Response | undefined;
  try {
    while (true) {
      if (signal?.aborted) throw abortError(signal);
      attempt++;
      // A fresh timeout budget per attempt; the caller's signal still wins the race.
      // The composed signal also governs reading the response body.
      const budget = timeout ? timeoutSignal(timeout) : undefined;
      const attemptSignal = budget && signal ? anySignal([signal, budget]) : (budget ?? signal);
      let response: Response;
      try {
        response = await doFetch(context.url, {
          ...fetchInit,
          // `fetch` requires it for a stream body.
          ...(isStream ? { duplex: 'half' } : {}),
          signal: attemptSignal ?? null,
          method: context.method,
          headers: context.headers,
          body: payload ?? null,
        });
      } catch (error) {
        // Decided before any await, when no timer can have fired since `fetch` rejected: an
        // aborted budget means this attempt timed out. The abort reason's name is no
        // evidence, because Chrome 103 to 123 abort a timeout with `AbortError`.
        const timedOut = timeout !== undefined && budget?.aborted && !signal?.aborted;
        if (
          attempt < maxAttempts &&
          !signal?.aborted &&
          (await retryOn({ attempt, request: context, error }))
        ) {
          await sleep(retryDelay(retry, attempt, null), signal);
          continue;
        }
        // Our timeout fired (never the caller's own abort — that rethrows untouched):
        // wrap the bare DOMException with the context a log line needs.
        if (timedOut) throw new TimeoutError(op.id, timeout, attempt);
        throw error;
      }
      lastResponse = response;
      // Reverse order: the last-registered middleware wraps closest to the network (onion).
      for (let i = middleware.length - 1; i >= 0; i--) {
        const onResponse = middleware[i]?.onResponse;
        if (onResponse) {
          const replaced = await onResponse(response, context);
          if (replaced && replaced !== response) {
            // Cancel the abandoned original's body — like the retry path, an unread body
            // keeps its connection checked out under Node/undici.
            await response.body?.cancel().catch(() => undefined);
            response = replaced;
            lastResponse = replaced;
          }
        }
      }
      if (
        !response.ok &&
        attempt < maxAttempts &&
        !signal?.aborted &&
        (await retryOn({ attempt, request: context, response }))
      ) {
        const retryAfter = response.headers.get('retry-after');
        // Drain the abandoned response body before the next attempt: an unread body
        // keeps the connection checked out (and can stall the pool) under Node/undici
        // and other strict HTTP clients. Ignore errors (e.g. a middleware already read it).
        await response.body?.cancel().catch(() => undefined);
        lastResponse = undefined;
        await sleep(retryDelay(retry, attempt, retryAfter), signal);
        continue;
      }
      finalResponse = response;
      break;
    }
  } catch (error) {
    const settled: SettledCall = {
      response: lastResponse,
      error,
      attempts: attempt,
      durationMs: Date.now() - startedAt,
    };
    for (const mw of middleware) {
      if (!mw.onSettled) continue;
      try {
        await mw.onSettled(context, settled);
      } catch (hookError) {
        globalThis.console?.warn('onSettled hook failed', hookError);
      }
    }
    throw error;
  }
  const settled: SettledCall = {
    response: finalResponse,
    attempts: attempt,
    durationMs: Date.now() - startedAt,
  };
  const hookErrors: unknown[] = [];
  for (const mw of middleware) {
    if (!mw.onSettled) continue;
    try {
      await mw.onSettled(context, settled);
    } catch (hookError) {
      hookErrors.push(hookError);
    }
  }
  if (hookErrors.length > 0) {
    // The caller never gets this response, so release its connection.
    await finalResponse.body?.cancel().catch(() => undefined);
    throw hookErrors[0];
  }
  return { response: finalResponse, context };
}
