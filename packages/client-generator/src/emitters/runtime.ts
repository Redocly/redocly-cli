/**
 * The static runtime inlined verbatim into every generated client: the config /
 * extension contract, the error type, the URL/query builder, the fetch wrapper,
 * and the optional header normalizer.
 *
 * Three things vary by call: the inlined `BASE` value; whether `__headers` is
 * emitted (only when some operation declares header params, so `noUnusedLocals`
 * consumers don't trip over dead code); and whether the operation-facing helpers
 * (`__buildUrl` / `__request` / `__headers` / `__config`) are `export`ed — they
 * are in multi-file modes, module-private in single-file.
 */
/**
 * The public `export type`s the runtime/http module exposes. Multi-file writers
 * re-export exactly these from the entry barrel so a consumer gets the whole
 * config surface from one import (and the same names resolve in single-file
 * output, where the types live inline). Kept here, beside the template that emits
 * them, so the list and the emitted `export type`s stay in lockstep — add a
 * public type to the template below and add its name here.
 */
export const PUBLIC_RUNTIME_TYPES = [
  'ClientConfig',
  'Middleware',
  'OperationContext',
  'ParseAs',
  'RequestContext',
  'RequestOptions',
  'RetryConfig',
  'RetryContext',
  'RetryStrategy',
] as const;

import { printStatements, parseStatements, type ts } from './ts.js';

/**
 * TS *type* source strings for the `RequestContext.operation` fields. Defaults to the spec-agnostic
 * all-`string` form; the emitter narrows them to the client's `OperationId`/`OperationPath`/
 * `OperationTag` literal unions when the spec has operations (and tags).
 */
export type OperationContextTypes = { id: string; path: string; tags: string };
const DEFAULT_OPERATION_CONTEXT: OperationContextTypes = {
  id: 'string',
  path: 'string',
  tags: 'string[]',
};

export function renderRuntime(
  baseUrl: string,
  needsHeaderHelper: boolean,
  exportHelpers: boolean,
  errorMode: 'throw' | 'result' = 'throw',
  needsSse: boolean = false,
  authConfig: boolean = false,
  needsMultipart: boolean = false,
  opCtx: OperationContextTypes = DEFAULT_OPERATION_CONTEXT
): string {
  return printStatements(
    runtimeStatements(
      baseUrl,
      needsHeaderHelper,
      exportHelpers,
      errorMode,
      needsSse,
      authConfig,
      needsMultipart,
      opCtx
    )
  );
}

/**
 * The runtime as parsed `ts.Statement[]` — the same hand-authored reference
 * source, embedded via `parseStatements` so the composition (Task 6) can fold it
 * into the single-file / module statement lists. `renderRuntime` prints these.
 */
export function runtimeStatements(
  baseUrl: string,
  needsHeaderHelper: boolean,
  exportHelpers: boolean,
  errorMode: 'throw' | 'result' = 'throw',
  needsSse: boolean = false,
  authConfig: boolean = false,
  needsMultipart: boolean = false,
  opCtx: OperationContextTypes = DEFAULT_OPERATION_CONTEXT
): ts.Statement[] {
  return parseStatements(
    runtimeSource(
      baseUrl,
      needsHeaderHelper,
      exportHelpers,
      errorMode,
      needsSse,
      authConfig,
      needsMultipart,
      opCtx
    )
  );
}

function runtimeSource(
  baseUrl: string,
  needsHeaderHelper: boolean,
  exportHelpers: boolean,
  errorMode: 'throw' | 'result',
  needsSse: boolean,
  authConfig: boolean,
  needsMultipart: boolean,
  opCtx: OperationContextTypes
): string {
  const base = JSON.stringify(baseUrl);
  const ex = exportHelpers ? 'export ' : '';
  const multipartBlock = needsMultipart
    ? `

/**
 * Serialize a plain object into \`FormData\` for a \`multipart/form-data\` body. \`Blob\`/\`File\`
 * and strings pass through; arrays append one field per item; other objects are JSON-encoded;
 * everything else is stringified. \`undefined\` / \`null\` entries are skipped.
 */
${ex}function __toFormData(body: Record<string, unknown>): FormData {
  const fd = new FormData();
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (value instanceof Blob || typeof value === 'string') fd.append(key, value);
    else if (value instanceof Date) fd.append(key, value.toISOString());
    else if (typeof value === 'object') fd.append(key, JSON.stringify(value));
    else fd.append(key, String(value));
  };
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) for (const item of value) append(key, item);
    else append(key, value);
  }
  return fd;
}`
    : '';
  const headerHelper = needsHeaderHelper
    ? `

/**
 * Normalize an operation's header-parameter object into a plain string record,
 * dropping any \`undefined\` / \`null\` entries (optional headers the caller omitted)
 * and stringifying the rest. Mirrors __buildUrl's handling of query values.
 */
${ex}function __headers(values: Record<string, string | number | boolean | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}`
    : '';
  const sseBlock = needsSse
    ? `

/** A single decoded Server-Sent Event. \`data\` is the parsed payload (\`T\`). */
export type ServerSentEvent<T> = { event?: string; data: T; id?: string; retry?: number };

/** Per-call options for an SSE stream. \`reconnect\` defaults to true (auto-reconnect). */
export type SseOptions = RequestInit & {
  /** Opt out of automatic reconnection; the iterator then ends/throws on the first stream end/error. */
  reconnect?: boolean;
  /** Override the base reconnect backoff in ms. The server's \`retry:\` value still takes precedence. */
  reconnectDelay?: number;
};

${ex}async function* __sse<T>(
  config: ClientConfig,
  op: OperationContext,
  url: string,
  init: SseOptions,
  dataKind: 'json' | 'text' = 'text'
): AsyncGenerator<ServerSentEvent<T>> {
  const { reconnect = true, reconnectDelay, ...rest } = init;
  const signal = rest.signal ?? undefined;
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    ...(rest.headers as Record<string, string> | undefined),
  };
  let lastEventId: string | undefined;
  let serverRetry: number | undefined;
  let failures = 0;
  while (true) {
    if (signal?.aborted) return;
    const sendHeaders = lastEventId === undefined ? headers : { ...headers, 'Last-Event-ID': lastEventId };
    try {
      const { response } = await __send(config, op, url, { ...rest, method: rest.method ?? 'GET', headers: sendHeaders });
      if (!response.ok) {
        const errorBody = await readError(response);
        throw new ApiError(url, response.status, response.statusText, errorBody);
      }
      failures = 0;
      const body = response.body;
      if (!body) return;
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          let index: number;
          while ((index = buffer.search(/\\r\\n\\r\\n|\\n\\n|\\r\\r/)) !== -1) {
            const raw = buffer.slice(0, index);
            buffer = buffer.slice(index + buffer.slice(index).match(/^(\\r\\n\\r\\n|\\n\\n|\\r\\r)/)![0].length);
            const event = __parseSseFrame(raw, dataKind);
            if (event) {
              if (event.id !== undefined) lastEventId = event.id;
              if (event.retry !== undefined) serverRetry = event.retry;
              yield event as ServerSentEvent<T>;
            }
          }
          if (done) {
            // Stream closed cleanly. Flush a final event that arrived without a trailing
            // delimiter, then finish — a clean end is not a dropped connection, so do not reconnect.
            const event = buffer.length > 0 ? __parseSseFrame(buffer, dataKind) : undefined;
            if (event) {
              if (event.id !== undefined) lastEventId = event.id;
              if (event.retry !== undefined) serverRetry = event.retry;
              yield event as ServerSentEvent<T>;
            }
            return;
          }
          // Bound memory: a server that never sends a frame delimiter would otherwise
          // grow \`buffer\` without limit. 1 MiB is far above any real SSE frame.
          if (buffer.length > 1048576) {
            throw new Error('SSE frame exceeded 1048576 characters without a delimiter');
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    } catch (error) {
      if (signal?.aborted) return;
      // A non-OK HTTP response is a definitive error (4xx/5xx), not a transient drop —
      // surface it instead of reconnecting in a loop.
      if (error instanceof ApiError) throw error;
      // A transport failure (connect/DNS/reset) when opening the request, or a mid-stream
      // read error, is a dropped connection: fall through to backoff/reconnect when enabled.
      if (!reconnect) throw error;
    }
    if (!reconnect || signal?.aborted) return;
    failures++;
    const base = serverRetry ?? reconnectDelay ?? 1000;
    const delay = Math.min(base * Math.pow(2, failures - 1), 30_000);
    try {
      await __sleep(Math.random() * delay, signal);
    } catch (error) {
      if (signal?.aborted) return;
      throw error;
    }
  }
}

/** Parse one raw SSE frame (its lines) into an event; returns undefined for comment-only frames. */
function __parseSseFrame(raw: string, dataKind: 'json' | 'text'): ServerSentEvent<unknown> | undefined {
  let event: string | undefined;
  const dataLines: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;
  let sawField = false;
  for (const line of raw.split(/\\r\\n|\\n|\\r/)) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let val = colon === -1 ? '' : line.slice(colon + 1);
    if (val.startsWith(' ')) val = val.slice(1);
    sawField = true;
    if (field === 'event') event = val;
    else if (field === 'data') dataLines.push(val);
    else if (field === 'id') id = val;
    else if (field === 'retry') { const n = Number(val); if (!Number.isNaN(n)) retry = n; }
  }
  if (!sawField) return undefined;
  const dataText = dataLines.join('\\n');
  const data = dataKind === 'json' && dataText !== '' ? JSON.parse(dataText) : dataText;
  return { event, data, id, retry };
}`
    : '';
  const terminal =
    errorMode === 'result'
      ? `/**
 * The discriminated result returned by every operation under \`errorMode: 'result'\`.
 * On success \`error\` is \`undefined\`; on a non-2xx response \`data\` is \`undefined\` and
 * \`error\` is the typed response body. \`response\` is always the raw \`Response\` (use
 * \`response.status\` for the HTTP code). Transport/abort failures still throw.
 */
export type Result<TData, TError> =
  | { data: TData; error: undefined; response: Response }
  | { data: undefined; error: TError; response: Response };

${ex}async function __requestResult<TData, TError>(
  config: ClientConfig,
  op: OperationContext,
  url: string,
  init: RequestOptions,
  body?: unknown,
  responseKind: 'json' | 'blob' | 'text' | 'void' = 'json'
): Promise<Result<TData, TError>> {
  const { parseAs, ...sendInit } = init;
  const { response } = await __send(config, op, url, sendInit, body);
  if (!response.ok) {
    const error = (await readError(response)) as TError;
    return { data: undefined, error, response };
  }
  const kind = parseAs ?? (responseKind === 'json' ? 'auto' : responseKind);
  const data = (await __parse(response, kind)) as TData;
  return { data, error: undefined, response };
}`
      : `${ex}async function __request<T>(
  config: ClientConfig,
  op: OperationContext,
  url: string,
  init: RequestOptions,
  body?: unknown,
  responseKind: 'json' | 'blob' | 'text' | 'void' = 'json'
): Promise<T> {
  const { parseAs, ...sendInit } = init;
  const { response, context } = await __send(config, op, url, sendInit, body);
  if (!response.ok) {
    const errorBody = await readError(response);
    let error: globalThis.Error = new ApiError(context.url, response.status, response.statusText, errorBody);
    // Thread the error through each middleware's onError in turn (each may replace it).
    for (const mw of __middleware(config)) {
      if (mw.onError) error = await mw.onError(error as ApiError, context);
    }
    throw error;
  }
  const kind = parseAs ?? (responseKind === 'json' ? 'auto' : responseKind);
  return (await __parse(response, kind)) as T;
}`;
  // Per-instance credentials field on ClientConfig, emitted only when the client has
  // injectable security schemes (so the `AuthCredentials` type exists). Lets each
  // service-class instance carry its own credentials instead of sharing the module
  // globals — see ADR-0007.
  const authField = authConfig
    ? `
  /**
   * Per-instance auth credentials. When set, they override the module-global
   * \`set*\` helpers for requests made through this config (each scheme falls back
   * to its global slot when omitted here). Only the schemes an operation declares
   * in its \`security\` are ever sent.
   */
  auth?: AuthCredentials;`
    : '';
  return `let BASE = ${base};

/** Identity of the operation a request belongs to. Stable across path interpolation. */
export type OperationContext = { id: ${opCtx.id}; path: ${opCtx.path}; tags: ${opCtx.tags} };

/** The mutable request context handed to \`onRequest\` (mutate \`url\`/\`method\`/\`headers\`/\`body\`). */
export type RequestContext = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  /** The operation being called: its id (operationId), path template, and tags. */
  operation: OperationContext;
};

/**
 * Configuration and extension hooks for a client. Supplied per-instance via
 * \`new <Client>(config)\` (service-class facade) or globally via \`configure(config)\`
 * (functions facade).
 */
export type ClientConfig = {
  /** Base URL for this client; overrides the inlined default and \`setBaseUrl()\`. */
  baseUrl?: string;
  /** Extra headers merged into every request; a function is invoked per request. */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Transport used to issue requests. Defaults to the global \`fetch\`. */
  fetch?: typeof fetch;
  /** Mutate the request (\`url\` / \`method\` / \`headers\`) before it is sent. */
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  /** Observe — or replace, by returning a \`Response\` — the response before parsing. */
  onResponse?: (response: Response, ctx: RequestContext) => Response | void | Promise<Response | void>;
  /**
   * Map a failed request's \`ApiError\` into a custom error to throw instead (throw mode only).
   * Synchronous, kept so for backward compatibility; \`Middleware.onError\` additionally allows async.
   */
  onError?: (error: ApiError, ctx: RequestContext) => globalThis.Error;
  /**
   * Composable interceptors run around every request, alongside the single
   * \`onRequest\`/\`onResponse\`/\`onError\` hooks above (which act as one implicit, first
   * middleware). \`onRequest\` runs in array order; \`onResponse\` in reverse — an onion, so
   * the last-registered middleware wraps closest to the network. Register more at runtime
   * with \`use()\` (functions facade) or \`<Client>.use()\` (service-class facade).
   */
  middleware?: Middleware[];
  /** Retry policy for transient failures. Omitted ⇒ no retries (\`retries\` defaults to 0). */
  retry?: RetryConfig;${authField}
};

/**
 * A request interceptor; every field is optional, so a middleware can hook any subset of
 * the lifecycle. \`onRequest\` may mutate the request \`ctx\` (\`url\`/\`method\`/\`headers\`);
 * \`onResponse\` may return a replacement \`Response\`; \`onError\` (throw mode only) maps the
 * failure into the error to throw, threaded through each middleware in turn.
 */
export type Middleware = {
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  onResponse?: (response: Response, ctx: RequestContext) => Response | void | Promise<Response | void>;
  // \`globalThis.Error\` (not bare \`Error\`) so a spec schema named \`Error\` can't shadow it.
  onError?: (error: ApiError, ctx: RequestContext) => globalThis.Error | Promise<globalThis.Error>;
};

/** Backoff shape: 'fixed' = constant delay; 'exponential' = doubling per attempt. */
export type RetryStrategy = 'fixed' | 'exponential';

/** Context handed to \`retryOn\` for the attempt that just failed. */
export type RetryContext = {
  /** 1-based number of the attempt that just failed. */
  attempt: number;
  /** The request that was attempted. */
  request: RequestContext;
  /** Present when the server returned a (non-ok) response. */
  response?: Response;
  /** Present when the transport threw (network error, DNS, connection reset). */
  error?: unknown;
};

/** Retry policy; all fields optional with sensible defaults. */
export type RetryConfig = {
  /** Number of *extra* attempts after the first. Default 0 (opt-in). */
  retries?: number;
  /** Base delay in milliseconds. Default 1000. */
  retryDelay?: number;
  /** Backoff shape. Default 'exponential'. */
  retryStrategy?: RetryStrategy;
  /** Apply full jitter over the computed delay. Default true. */
  jitter?: boolean;
  /**
   * Decide whether to retry a failed attempt. Default: retry only idempotent
   * methods (GET/HEAD/PUT/DELETE/OPTIONS) on a network error or a transient
   * status (408, 429, 500, 502, 503, 504). Override to widen/narrow.
   */
  retryOn?: (ctx: RetryContext) => boolean | Promise<boolean>;
};

/**
 * How the response body is read. \`'auto'\` negotiates from the content type (the
 * generated default); \`'stream'\` returns the raw \`ReadableStream\` (\`response.body\`).
 */
export type ParseAs = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream' | 'auto';

/**
 * The trailing per-operation argument: standard \`RequestInit\` plus an optional
 * per-call retry override and a \`parseAs\` escape hatch.
 *
 * \`parseAs\` forces how the response body is read; overrides the inferred kind.
 * \`'stream'\` returns the raw \`ReadableStream\` (\`response.body\`). This is a runtime
 * override — the static return type is unchanged.
 */
export type RequestOptions = RequestInit & { retry?: Partial<RetryConfig>; parseAs?: ParseAs };

/**
 * Override the base URL used by every generated operation. Useful when the
 * runtime environment differs from the value declared in \`servers[0].url\`
 * (e.g. dev / staging / prod toggles in a single-page app).
 *
 * Mutates a module-scoped binding shared by the functions facade. For multiple
 * bases at once, use the service-class facade with \`new Client({ baseUrl })\`.
 */
export function setBaseUrl(url: string): void {
  BASE = url;
}

/** The global config used by the functions facade (see \`configure\`). */
${ex}const __config: ClientConfig = {};

/**
 * Merge \`config\` into the global configuration used by the functions facade —
 * set a custom \`fetch\`, default \`headers\`, or \`onRequest\`/\`onResponse\`/\`onError\`
 * hooks once for every free function. The service-class facade configures per
 * instance instead (\`new Client(config)\`).
 */
export function configure(config: ClientConfig): void {
  Object.assign(__config, config);
}

/**
 * Append interceptors to the functions facade's global middleware chain (see
 * \`ClientConfig.middleware\`). The service-class facade registers per instance via
 * \`<Client>.use(...)\` instead.
 */
export function use(...middleware: Middleware[]): void {
  // Reassign (don't push) so a caller-provided \`middleware\` array isn't mutated.
  __config.middleware = [...(__config.middleware ?? []), ...middleware];
}

/**
 * The effective middleware chain for a request: the single \`onRequest\`/\`onResponse\`/
 * \`onError\` config hooks as one implicit first middleware, then \`config.middleware\`.
 */
function __middleware(config: ClientConfig): Middleware[] {
  const single =
    config.onRequest || config.onResponse || config.onError
      ? [{ onRequest: config.onRequest, onResponse: config.onResponse, onError: config.onError }]
      : [];
  return [...single, ...(config.middleware ?? [])];
}

export class ApiError extends Error {
  public readonly url: string;
  public readonly status: number;
  public readonly statusText: string;
  public readonly body: unknown;
  constructor(url: string, status: number, statusText: string, body: unknown) {
    super(\`Request failed with status \${status}\`);
    this.name = 'ApiError';
    this.url = url;
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

type QueryPrimitive = string | number | boolean;
type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | Array<QueryPrimitive>
  | Record<string, unknown>;

/** Per-key OpenAPI query serialization spec; absent ⇒ the defaults (\`form\`, \`explode: true\`). */
type QueryStyle = {
  style: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
  explode: boolean;
  allowReserved?: boolean;
};

/**
 * Percent-encode \`value\` but leave the RFC-3986 reserved set
 * (\`:/?#[]@!$&'()*+,;=\`) un-escaped, for query params declaring \`allowReserved\`.
 */
function __encodeReserved(value: string): string {
  return encodeURIComponent(value).replace(
    /%(3A|2F|3F|23|5B|5D|40|21|24|26|27|28|29|2A|2B|2C|3B|3D)/g,
    (match) => decodeURIComponent(match)
  );
}

${ex}function __buildUrl(
  config: ClientConfig,
  path: string,
  query?: Record<string, QueryValue>,
  styles?: Record<string, QueryStyle>
): string {
  const url = (config.baseUrl ?? BASE).replace(/\\/+$/, '') + path;
  if (!query) return url;
  const params = new URLSearchParams();
  const raw: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const spec = styles?.[key];
    if (!spec) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null) params.append(key, String(v));
        }
      } else if (typeof value === 'object') {
        // Object-valued query params use \`deepObject\` style: key[subKey]=subValue.
        for (const [subKey, subValue] of Object.entries(value)) {
          if (subValue !== undefined && subValue !== null) {
            params.append(\`\${key}[\${subKey}]\`, String(subValue));
          }
        }
      } else {
        params.append(key, String(value));
      }
      continue;
    }
    if (Array.isArray(value)) {
      const items = value.filter((v) => v !== undefined && v !== null).map(String);
      if (spec.style === 'form' && spec.explode) {
        for (const v of items) {
          if (spec.allowReserved) raw.push(\`\${key}=\${__encodeReserved(v)}\`);
          else params.append(key, v);
        }
      } else {
        // Delimited styles put the LITERAL delimiter on the wire; only the
        // values are encoded. \`%20\` (not \`+\`) is the literal space delimiter.
        const delim = spec.style === 'pipeDelimited' ? '|' : spec.style === 'spaceDelimited' ? '%20' : ',';
        const enc = spec.allowReserved ? __encodeReserved : encodeURIComponent;
        raw.push(\`\${encodeURIComponent(key)}=\${items.map(enc).join(delim)}\`);
      }
    } else if (typeof value === 'object') {
      // \`deepObject\` (and any object spec, for now): key[subKey]=subValue.
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue !== undefined && subValue !== null) {
          if (spec.allowReserved) raw.push(\`\${key}[\${subKey}]=\${__encodeReserved(String(subValue))}\`);
          else params.append(\`\${key}[\${subKey}]\`, String(subValue));
        }
      }
    } else if (spec.allowReserved) {
      raw.push(\`\${key}=\${__encodeReserved(String(value))}\`);
    } else {
      params.append(key, String(value));
    }
  }
  const qs = [params.toString(), ...raw].filter(Boolean).join('&');
  return qs ? \`\${url}?\${qs}\` : url;
}

${ex}async function __send(
  config: ClientConfig,
  op: OperationContext,
  url: string,
  init: RequestOptions,
  body?: unknown
): Promise<{ response: Response; context: RequestContext }> {
  const { retry: callRetry, ...fetchInit } = init;
  const retry: RetryConfig = { ...config.retry, ...callRetry };
  const extra = typeof config.headers === 'function' ? await config.headers() : config.headers;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extra,
    ...(fetchInit.headers as Record<string, string> | undefined),
  };
  const context: RequestContext = { url, method: fetchInit.method ?? 'GET', headers, body, operation: op };
  const middleware = __middleware(config);
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
    } else {
      payload = JSON.stringify(value);
      if (!('Content-Type' in context.headers) && !('content-type' in context.headers)) {
        context.headers['Content-Type'] = 'application/json';
      }
    }
  }
  const doFetch = config.fetch ?? fetch;
  const maxAttempts = 1 + (retry.retries ?? 0);
  const retryOn = retry.retryOn ?? __defaultRetryOn;
  const signal = fetchInit.signal ?? undefined;

  let attempt = 0;
  while (true) {
    attempt++;
    if (signal?.aborted) throw __abortError(signal);
    let response: Response;
    try {
      response = await doFetch(context.url, {
        ...fetchInit,
        method: context.method,
        headers: context.headers,
        body: payload,
      });
    } catch (error) {
      if (attempt < maxAttempts && !signal?.aborted && (await retryOn({ attempt, request: context, error }))) {
        await __sleep(__retryDelay(retry, attempt, null), signal);
        continue;
      }
      throw error;
    }
    // Reverse order: the last-registered middleware wraps closest to the network (onion).
    for (let i = middleware.length - 1; i >= 0; i--) {
      const onResponse = middleware[i].onResponse;
      if (onResponse) {
        const replaced = await onResponse(response, context);
        if (replaced) response = replaced;
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
      await __sleep(__retryDelay(retry, attempt, retryAfter), signal);
      continue;
    }
    return { response, context };
  }
}

${ex}async function __parse(response: Response, kind: ParseAs | 'void'): Promise<unknown> {
  if (kind === 'void' || response.status === 204) return undefined;
  if (kind === 'stream') return response.body;
  if (kind === 'blob') return response.blob();
  if (kind === 'arrayBuffer') return response.arrayBuffer();
  if (kind === 'formData') return response.formData();
  if (kind === 'text') return response.text();
  if (kind === 'json') return response.json();
  // 'auto' — negotiate from the response's content type.
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('json')) return response.json();
  if (contentType.startsWith('text/')) return response.text();
  return response.blob();
}

${terminal}

async function readError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('json')) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
}

const __IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
const __TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function __defaultRetryOn(ctx: RetryContext): boolean {
  if (!__IDEMPOTENT_METHODS.has(ctx.request.method.toUpperCase())) return false;
  return ctx.response === undefined || __TRANSIENT_STATUS.has(ctx.response.status);
}

function __retryDelay(retry: RetryConfig, attempt: number, retryAfter: string | null): number {
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

function __sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(__abortError(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(__abortError(signal as AbortSignal));
    };
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

function __abortError(signal: AbortSignal): globalThis.Error {
  const reason = (signal as { reason?: unknown }).reason;
  if (reason instanceof Error) return reason;
  return new DOMException('The operation was aborted.', 'AbortError');
}${sseBlock}${headerHelper}${multipartBlock}`;
}
