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
