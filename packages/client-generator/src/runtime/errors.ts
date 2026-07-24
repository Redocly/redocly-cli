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

/** The error to throw for an aborted request: the caller's abort reason when it is an Error. */
// `globalThis.Error` (not bare `Error`) so a spec schema named `Error` cannot shadow it
// when this module is embedded alongside generated types (inline mode).
export function abortError(signal: AbortSignal): globalThis.Error {
  const reason = (signal as { reason?: unknown }).reason;
  if (reason instanceof Error) return reason;
  return new DOMException('The operation was aborted.', 'AbortError');
}
