import type { Result } from './types.js';

/** The error thrown (throw mode) for a non-2xx response, carrying the decoded error body. */
export class ApiError extends Error {
  public readonly url: string;
  public readonly status: number;
  public readonly statusText: string;
  public readonly body: unknown;
  constructor(url: string, status: number, statusText: string, body: unknown) {
    super(`Request failed with status ${status}`);
    this.name = 'ApiError';
    this.url = url;
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Turn a result-mode call into a throwing one: resolve with the response body, or throw
 * the `ApiError` a throw-mode client would.
 */
export async function unwrapResult<TData>(call: Promise<Result<TData, unknown>>): Promise<TData> {
  const { data, error, response } = await call;
  // Failure is `!response.ok`, not `data === undefined`: a successful bodyless response
  // (204/void) also has undefined data, and a failed one can have an undefined `error`
  // (unreadable body).
  if (!response.ok) throw new ApiError(response.url, response.status, response.statusText, error);
  return data as TData;
}

/** The error thrown when a request attempt exceeds the configured `timeout` — carries
 * the context a log line needs (which operation, what budget, which attempt). */
export class TimeoutError extends Error {
  public readonly operationId: string;
  public readonly timeout: number;
  public readonly attempt: number;
  constructor(operationId: string, timeout: number, attempt: number) {
    super(`Request "${operationId}" timed out after ${timeout} ms (attempt ${attempt})`);
    this.name = 'TimeoutError';
    this.operationId = operationId;
    this.timeout = timeout;
    this.attempt = attempt;
  }
}

/** The error to throw for an aborted request: the caller's abort reason when it is an Error. */
// `globalThis.Error` (not bare `Error`) so a spec schema named `Error` cannot shadow it
// when this module is embedded alongside generated types (inline mode).
export function abortError(signal: AbortSignal): globalThis.Error {
  const reason = (signal as { reason?: unknown }).reason;
  if (reason instanceof Error) return reason;
  return new DOMException('The operation was aborted.', 'AbortError');
}
