import { abortError } from './errors.js';
import { defaultRetryOn, retryDelay, sleep } from './retry.js';
import type {
  ClientConfig,
  Middleware,
  OperationContext,
  RequestContext,
  RequestOptions,
  RetryConfig,
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
      ? [{ onRequest: config.onRequest, onResponse: config.onResponse, onError: config.onError }]
      : [];
  return [...single, ...(config.middleware ?? [])];
}

/**
 * The fetch core shared by every operation: default + config + per-call headers, the
 * `onRequest` chain (BEFORE body serialization, so mutations are sent), body
 * serialization (JSON, or FormData via the multipart capability), the retry loop
 * (idempotent-only defaults, `Retry-After`, abandoned-body drain), and the reverse
 * `onResponse` onion. Returns the final response plus the request context.
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
  if (context.body !== undefined) {
    const value = context.body;
    const isBinary =
      value instanceof Blob ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value as ArrayBufferView);
    const isFormData = typeof FormData !== 'undefined' && value instanceof FormData;
    const isURLSearchParams = value instanceof URLSearchParams;
    if (isFormData || isURLSearchParams || isBinary || typeof value === 'string') {
      payload = value as BodyInit;
    } else if (bodySpec?.multipart === true) {
      if (!caps.serializeMultipart) {
        throw new Error('Multipart capability not wired: cannot serialize the request body');
      }
      payload = caps.serializeMultipart(value as Record<string, unknown>);
    } else {
      payload = JSON.stringify(value);
      if (!('Content-Type' in context.headers) && !('content-type' in context.headers)) {
        // The spec's declared request content type (e.g. application/merge-patch+json).
        context.headers['Content-Type'] = bodySpec?.contentType ?? 'application/json';
      }
    }
  }
  const doFetch = config.fetch ?? fetch;
  const maxAttempts = 1 + (retry.retries ?? 0);
  const retryOn = retry.retryOn ?? defaultRetryOn;
  const signal = fetchInit.signal ?? undefined;

  let attempt = 0;
  while (true) {
    attempt++;
    if (signal?.aborted) throw abortError(signal);
    // A fresh timeout budget per attempt; the caller's signal still wins the race.
    // The composed signal also governs reading the response body.
    const attemptSignal = timeout
      ? signal
        ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
        : AbortSignal.timeout(timeout)
      : signal;
    let response: Response;
    try {
      response = await doFetch(context.url, {
        ...fetchInit,
        signal: attemptSignal,
        method: context.method,
        headers: context.headers,
        body: payload,
      });
    } catch (error) {
      if (
        attempt < maxAttempts &&
        !signal?.aborted &&
        (await retryOn({ attempt, request: context, error }))
      ) {
        await sleep(retryDelay(retry, attempt, null), signal);
        continue;
      }
      throw error;
    }
    // Reverse order: the last-registered middleware wraps closest to the network (onion).
    for (let i = middleware.length - 1; i >= 0; i--) {
      const onResponse = middleware[i].onResponse;
      if (onResponse) {
        const replaced = await onResponse(response, context);
        if (replaced && replaced !== response) {
          // Cancel the abandoned original's body — like the retry path, an unread body
          // keeps its connection checked out under Node/undici.
          await response.body?.cancel().catch(() => undefined);
          response = replaced;
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
      await sleep(retryDelay(retry, attempt, retryAfter), signal);
      continue;
    }
    return { response, context };
  }
}
