import { ApiError } from './errors.js';
import { parse, readError } from './parse.js';
import { middlewareChain, send, toHeaderRecord, type SendCapabilities } from './send.js';
import type {
  ApiErrorLike,
  Client,
  ClientConfig,
  Middleware,
  OperationContext,
  OperationDescriptor,
  OpsShape,
  PaginationSpec,
  ParseAs,
  QueryValue,
  RequestOptions,
  ResponseHeaderSpec,
  SecuritySpec,
  ServerSentEvent,
  SseOptions,
  TokenProvider,
} from './types.js';
import { buildUrl, substitutePath, type QueryStyle } from './url.js';

/**
 * The optional behaviors `createClientCore` can dispatch to but never statically
 * imports. The package's public `createClient` wires the full set; the future
 * inline-mode assembler wires only the capabilities a spec needs.
 */
export type Capabilities = SendCapabilities & {
  resolveAuth?: (
    security: readonly (readonly SecuritySpec[])[],
    config: ClientConfig
  ) => Promise<{ headers: Record<string, string>; query: Record<string, string> }>;
  sse?: (
    config: ClientConfig,
    op: OperationContext,
    // Re-preparing per (re)connect (not a frozen url/init) lets a refresh-style
    // TokenProvider issue a fresh credential after a dropped stream reconnects.
    prepare: () => Promise<{ url: string; init: SseOptions }>,
    dataKind: 'json' | 'text'
  ) => AsyncGenerator<ServerSentEvent<unknown>>;
  paginate?: {
    pages: (
      call: (args?: OperationArgs, init?: RequestOptions) => Promise<unknown>,
      spec: PaginationSpec,
      args?: OperationArgs,
      init?: RequestOptions
    ) => AsyncGenerator<unknown>;
    items: (
      call: (args?: OperationArgs, init?: RequestOptions) => Promise<unknown>,
      spec: PaginationSpec,
      args?: OperationArgs,
      init?: RequestOptions
    ) => AsyncGenerator<unknown>;
    // The `link`-style iterators need the raw `Link` header + page URL, which the
    // parsed-page call above cannot carry (the shape mirrors paginate's `LinkPageCall`).
    pagesByLink: (
      call: (
        args?: OperationArgs,
        init?: RequestOptions
      ) => Promise<{ page: unknown; linkHeader: string | null; url: string }>,
      args?: OperationArgs,
      init?: RequestOptions
    ) => AsyncGenerator<unknown>;
    itemsByLink: (
      call: (
        args?: OperationArgs,
        init?: RequestOptions
      ) => Promise<{ page: unknown; linkHeader: string | null; url: string }>,
      spec: PaginationSpec,
      args?: OperationArgs,
      init?: RequestOptions
    ) => AsyncGenerator<unknown>;
  };
};

/**
 * One call's inputs, namespaced by transport layer. `argsStyle: 'flat'` clients accept the
 * merged form instead (every parameter and body property at one level) — `namespaceArgs`
 * converts it to this shape before anything downstream reads it.
 */
export type OperationArgs = {
  path?: Record<string, unknown>;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, unknown>;
  cookies?: Record<string, unknown>;
} & Record<string, unknown>;

/** The five layer keys, and the only top-level keys a namespaced call may carry. */
const LAYERS: readonly string[] = ['path', 'query', 'body', 'headers', 'cookies'];

/** Where a declared parameter's `in` value puts it. */
const LAYER_OF: Record<string, 'path' | 'query' | 'headers' | 'cookies'> = {
  path: 'path',
  query: 'query',
  header: 'headers',
  cookie: 'cookies',
};

/**
 * Merged (`argsStyle: 'flat'`) args → the namespaced shape. A key that names a declared
 * parameter goes to that parameter's layer; anything else is a property of the request
 * body, which is how a flat call spells an object body. `body` stays reserved for the
 * operations a flat call cannot merge (an array, a scalar, or a binary body).
 */
function namespaceArgs(op: OperationDescriptor, args: OperationArgs): OperationArgs {
  const layers: Record<string, Record<string, unknown>> = {};
  let body: unknown;
  let properties: Record<string, unknown> | undefined;
  const layerOfParam = new Map((op.params ?? []).map((param) => [param.name, param.in]));
  for (const [key, value] of Object.entries(args)) {
    const layer = LAYER_OF[layerOfParam.get(key) ?? ''];
    if (layer !== undefined) {
      (layers[layer] ??= {})[key] = value;
    } else if (key === 'body' && op.body !== undefined) {
      body = value;
    } else if (op.body !== undefined) {
      (properties ??= {})[key] = value;
    } else {
      throw new TypeError(
        `Unknown argument "${key}" for operation "${op.id}": it names no declared parameter, and the operation takes no request body.`
      );
    }
  }
  const namespaced: OperationArgs = {};
  if (layers.path) namespaced.path = layers.path;
  // The flat surface types every query value, so the collected bag is one by construction.
  if (layers.query) namespaced.query = layers.query as Record<string, QueryValue>;
  if (layers.headers) namespaced.headers = layers.headers;
  if (layers.cookies) namespaced.cookies = layers.cookies;
  if (properties !== undefined) namespaced.body = properties;
  else if (body !== undefined) namespaced.body = body;
  return namespaced;
}

/** The response reader implied by the descriptor (before any per-call `parseAs` override). */
/**
 * The `Accept` header matching how the response will be read — a blob/text operation
 * must not ask for `application/json` (a content-negotiating server would 406 or
 * answer with a JSON error body instead of the payload). Caller `init.headers` and
 * `config.headers` still override.
 */
function acceptFor(kind: ParseAs | 'void'): string {
  if (kind === 'text') return 'text/*';
  if (kind === 'blob' || kind === 'arrayBuffer' || kind === 'stream' || kind === 'formData') {
    return '*/*';
  }
  return 'application/json'; // json | auto | void
}

function kindFor(op: OperationDescriptor): ParseAs | 'void' {
  if (op.responseKind === 'void' || op.responseKind === 'blob' || op.responseKind === 'text') {
    return op.responseKind;
  }
  return 'auto';
}

/** The call's inputs in namespaced form, converting first on a flat-style client. */
function inputOf(
  op: OperationDescriptor,
  args: OperationArgs,
  config: ClientConfig
): OperationArgs {
  return config.argsStyle === 'flat' ? namespaceArgs(op, args) : args;
}

/** Route the namespaced args to the request pieces. */
function splitArgs(op: OperationDescriptor, args: OperationArgs) {
  // An unknown layer key can only be a bug (usually flat-style args on a namespaced
  // client). TypeScript catches it, but a transpiler that skips type-checking would
  // otherwise ship a request that silently drops the value — fail the call loudly.
  for (const key of Object.keys(args)) {
    if (!LAYERS.includes(key)) {
      throw new TypeError(
        `Unknown argument "${key}" for operation "${op.id}". Inputs are grouped by layer: ${LAYERS.join(', ')}.`
      );
    }
  }
  return {
    path: args.path ?? {},
    query: args.query,
    body: args.body,
    headers: args.headers,
    cookies: args.cookies,
  };
}

/**
 * The query-serialization hints for the descriptor's query params. A spec is built only
 * when the param deviates from the OpenAPI defaults (`form` + `explode: true`, encoded),
 * and always fully resolved — so `explode: false` or `allowReserved` alone (no `style`)
 * are honored, and an omitted `explode` keeps the exploded default.
 */
function queryStyles(op: OperationDescriptor): Record<string, QueryStyle> | undefined {
  let styles: Record<string, QueryStyle> | undefined;
  for (const param of op.params ?? []) {
    if (param.in !== 'query') continue;
    const deviates =
      (param.style !== undefined && param.style !== 'form') ||
      param.explode === false ||
      param.allowReserved === true;
    if (!deviates) continue;
    styles ??= {};
    styles[param.name] = {
      style: param.style ?? 'form',
      explode: param.explode ?? true,
      allowReserved: param.allowReserved,
    };
  }
  return styles;
}

/** Stringify caller-supplied extra headers, skipping empty entries. */
function stringHeaders(headers: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

/** Build the request pieces an attempt needs: the final URL and the merged per-call init. */
async function prepareRequest(
  config: ClientConfig,
  op: OperationDescriptor,
  args: OperationArgs,
  init: RequestOptions | SseOptions,
  caps: Capabilities
): Promise<{ url: string; init: RequestOptions; body: unknown }> {
  const { path, query, body, headers, cookies } = splitArgs(op, args);
  const authed: { headers: Record<string, string>; query: Record<string, string> } =
    op.security?.length && caps.resolveAuth
      ? await caps.resolveAuth(op.security, config)
      : { headers: {}, query: {} };
  // Cookie params join the auth-injected cookies in one `Cookie` header (values
  // percent-encoded, like auth cookies). Server-side only — browsers own the header.
  const cookiePairs = Object.entries(cookies ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([cookieName, value]) => `${cookieName}=${encodeURIComponent(String(value))}`);
  if (cookiePairs.length > 0) {
    authed.headers.Cookie = [authed.headers.Cookie, ...cookiePairs].filter(Boolean).join('; ');
  }
  const fullQuery: Record<string, QueryValue> = { ...query, ...authed.query };
  const url = buildUrl(
    config.serverUrl ?? '',
    substitutePath(op.path, path),
    Object.keys(fullQuery).length > 0 ? fullQuery : undefined,
    queryStyles(op)
  );
  const mergedInit: RequestOptions = {
    ...init,
    method: op.method.toUpperCase(),
    // Precedence, lowest → highest (later spreads win): injected auth → explicit
    // header params → caller `init.headers` — the caller always overrides both.
    headers: {
      ...authed.headers,
      ...stringHeaders(headers),
      ...toHeaderRecord(init.headers),
    },
  };
  return { url, init: mergedInit, body };
}

/** Coerce a single declared response header value; omit when absent or unparsable. */
function coerceResponseHeader(
  raw: string | null,
  type: ResponseHeaderSpec['type']
): string | number | boolean | undefined {
  if (raw === null) return undefined;
  if (type === 'number') {
    if (raw.trim() === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }
  if (type === 'boolean') {
    const value = raw.trim().toLowerCase();
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
  return raw;
}

/** Build the camelCase declared-header bag for a throw-mode envelope. */
function readEnvelopeHeaders(
  response: Response,
  specs: readonly ResponseHeaderSpec[] | undefined
): Record<string, string | number | boolean> {
  const headers: Record<string, string | number | boolean> = {};
  for (const spec of specs ?? []) {
    const value = coerceResponseHeader(response.headers.get(spec.name), spec.type);
    if (value !== undefined) headers[spec.key] = value;
  }
  return headers;
}

/** One non-SSE call: send, then branch on the configured error mode. */
async function execute(
  config: ClientConfig,
  op: OperationDescriptor,
  args: OperationArgs,
  init: RequestOptions,
  caps: Capabilities
): Promise<unknown> {
  const prepared = await prepareRequest(config, op, args, init, caps);
  const opCtx: OperationContext = { id: op.id, path: op.path, tags: [...(op.tags ?? [])] };
  // `parseAs` / `envelope` are client options, not fetch RequestInit fields.
  const { parseAs, envelope, ...sendInit } = prepared.init;
  const readKind = parseAs ?? kindFor(op);
  const { response, context } = await send(
    config,
    opCtx,
    prepared.url,
    sendInit,
    prepared.body,
    op.body,
    caps,
    acceptFor(readKind)
  );
  if (config.errorMode === 'result') {
    if (!response.ok) {
      return { data: undefined, error: await readError(response), response };
    }
    return { data: await parse(response, readKind), error: undefined, response };
  }
  if (!response.ok) {
    let error: globalThis.Error = new ApiError(
      context.url,
      response.status,
      response.statusText,
      await readError(response)
    );
    // Thread the error through each middleware's onError in turn (each may replace it).
    for (const mw of middlewareChain(config)) {
      if (mw.onError) error = await mw.onError(error as ApiErrorLike, context);
    }
    throw error;
  }
  const data = await parse(response, readKind);
  if (envelope === true) {
    return {
      data,
      headers: readEnvelopeHeaders(response, op.responseHeaders),
      response,
    };
  }
  return data;
}

/** The paginate capability, or a descriptive throw when a paginated op is iterated unwired. */
function paginateCapability(caps: Capabilities, op: OperationDescriptor) {
  if (!caps.paginate) {
    throw new Error(`Pagination capability not wired: cannot iterate operation "${op.id}"`);
  }
  return caps.paginate;
}

/**
 * The per-page call the iterators drive: the method itself in throw mode; in result
 * mode a wrapper that unwraps the `{ data, error, response }` envelope — the page
 * pointers are data-rooted — rethrowing a failed page as `ApiError` (iteration is
 * error-mode-agnostic; the throw-mode-only `onError` middleware hook is not invoked).
 */
function pageCall(
  method: (args?: OperationArgs, init?: RequestOptions) => Promise<unknown>,
  config: ClientConfig
) {
  const callWithoutEnvelope = (args?: OperationArgs, init?: RequestOptions) => {
    if (!init || init.envelope === undefined) return method(args, init);
    const { envelope: _envelope, ...pageInit } = init;
    return method(args, pageInit);
  };
  if (config.errorMode !== 'result') return callWithoutEnvelope;
  return async (args?: OperationArgs, init?: RequestOptions) => {
    const envelope = (await callWithoutEnvelope(args, init)) as {
      data: unknown;
      error: unknown;
      response: Response;
    };
    // Failure is `!response.ok` — NOT `data === undefined`: a successful bodyless page
    // (204/void) also parses to undefined data, and a failed page's `error` can be
    // undefined too (unreadable body). The pointers then miss on the undefined data
    // and iteration stops cleanly, which is the correct semantics for an empty page.
    if (!envelope.response.ok) {
      const { response } = envelope;
      throw new ApiError(response.url, response.status, response.statusText, envelope.error);
    }
    return envelope.data;
  };
}

/**
 * The per-page call the `link`-style iterators drive: like `execute`, but returning the
 * parsed page together with the raw `Link` header and the page's own URL (for resolving
 * a relative `rel="next"` target). Error-mode-agnostic like all iteration: a failed
 * page throws `ApiError` even on result-mode clients.
 */
function linkPageCall(config: ClientConfig, op: OperationDescriptor, caps: Capabilities) {
  return async (args: OperationArgs = {}, init: RequestOptions = {}) => {
    const prepared = await prepareRequest(config, op, args, init, caps);
    const { parseAs, envelope: _envelope, ...sendInit } = prepared.init;
    const readKind = parseAs ?? kindFor(op);
    const opCtx: OperationContext = { id: op.id, path: op.path, tags: [...(op.tags ?? [])] };
    const { response } = await send(
      config,
      opCtx,
      prepared.url,
      sendInit,
      prepared.body,
      op.body,
      caps,
      acceptFor(readKind)
    );
    if (!response.ok) {
      throw new ApiError(
        prepared.url,
        response.status,
        response.statusText,
        await readError(response)
      );
    }
    return {
      page: await parse(response, readKind),
      linkHeader: response.headers.get('link'),
      // Some `Response` implementations leave `url` empty (mocks, constructed responses).
      url: response.url === '' ? prepared.url : response.url,
    };
  };
}

/**
 * Build a typed instance client over operation descriptors: one real bound method per
 * operation (attached by a construction-time loop — no Proxy), plus the core members
 * (`configure`/`use`/`auth`), which are assigned AFTER the loop so they win any name
 * collision with an operation. All behavior dispatches through the capability seam.
 */
export function createClientCore<
  Ops extends OpsShape,
  Id extends string = string,
  Path extends string = string,
  Tag extends string = string,
>(
  operations: Record<string, OperationDescriptor>,
  initial: ClientConfig<OperationContext<Id, Path, Tag>> = {},
  caps: Capabilities = {}
): Client<Ops, OperationContext<Id, Path, Tag>> {
  // The literal-union narrowing is a compile-time DX contract only; internally the
  // runtime works with the base (string-typed) context. One cast at this boundary —
  // `ClientConfig<Narrow>` is not assignable to `ClientConfig` (middleware ctx
  // params are contravariant).
  const given = initial as ClientConfig;
  // Private mutable config; the middleware array is copied so `use()` never mutates the caller's.
  const config: ClientConfig = { ...given, middleware: [...(given.middleware ?? [])] };
  const client = {} as Record<string, unknown>;

  for (const [name, op] of Object.entries(operations)) {
    if (op.responseKind === 'sse') {
      const method = (given: OperationArgs = {}, init: SseOptions = {}) => {
        const args = inputOf(op, given, config);
        if (!caps.sse) {
          throw new Error(`SSE capability not wired: cannot stream operation "${op.id}"`);
        }
        const stream = caps.sse;
        return (async function* () {
          const opCtx: OperationContext = { id: op.id, path: op.path, tags: [...(op.tags ?? [])] };
          // A thunk the stream re-runs on every (re)connect, so auth (which `prepareRequest`
          // resolves) is refreshed per attempt rather than frozen at the first connect.
          const prepare = async () => {
            const prepared = await prepareRequest(config, op, args, init, caps);
            return { url: prepared.url, init: prepared.init as SseOptions, body: prepared.body };
          };
          yield* stream(config, opCtx, prepare, op.sseDataKind ?? 'text');
        })();
      };
      // Consumers key off the function reference (cache keys, `OPERATIONS[fn.name]`), so
      // each closure carries its operationId instead of an inferred binding name.
      // `operationId` is the explicit, minification-proof form of the same identity
      // (the SPEC operationId — `name` is the emitted key, which a collision may rename).
      Object.defineProperty(method, 'name', { value: name });
      Object.defineProperty(method, 'operationId', { value: op.id });
      client[name] = method;
    } else {
      // `raw` takes namespaced args; `method` is the public entry that accepts whichever
      // style the client was generated with. The iterators namespace once and then drive
      // `raw`, so a flat call is never converted twice.
      const raw = (args: OperationArgs = {}, init: RequestOptions = {}) =>
        execute(config, op, args, init, caps);
      const method = (args: OperationArgs = {}, init: RequestOptions = {}) =>
        raw(inputOf(op, args, config), init);
      Object.defineProperty(method, 'name', { value: name });
      Object.defineProperty(method, 'operationId', { value: op.id });
      const spec = op.pagination;
      // Paginated ops keep their one-shot call and gain `.pages`/`.items`, dispatching
      // through the capability seam (like SSE: absent capability throws descriptively).
      // Iteration is error-mode-agnostic: the iterators' pointers are data-rooted, so on
      // a result-mode client (`errorMode` is fixed at construction — `configure()`
      // ignores it) each page's envelope is unwrapped before it reaches the capability.
      // A failed page aborts iteration by throwing ApiError, even on result-mode
      // clients; the `onError` middleware hook (throw-mode-only) is not invoked.
      client[name] =
        spec === undefined
          ? method
          : spec.style === 'link'
            ? Object.assign(method, {
                pages: (args?: OperationArgs, init?: RequestOptions) =>
                  paginateCapability(caps, op).pagesByLink(
                    linkPageCall(config, op, caps),
                    inputOf(op, args ?? {}, config),
                    init
                  ),
                items: (args?: OperationArgs, init?: RequestOptions) =>
                  paginateCapability(caps, op).itemsByLink(
                    linkPageCall(config, op, caps),
                    spec,
                    inputOf(op, args ?? {}, config),
                    init
                  ),
              })
            : Object.assign(method, {
                pages: (args?: OperationArgs, init?: RequestOptions) =>
                  paginateCapability(caps, op).pages(
                    pageCall(raw, config),
                    spec,
                    inputOf(op, args ?? {}, config),
                    init
                  ),
                items: (args?: OperationArgs, init?: RequestOptions) =>
                  paginateCapability(caps, op).items(
                    pageCall(raw, config),
                    spec,
                    inputOf(op, args ?? {}, config),
                    init
                  ),
              });
    }
  }

  // Core members are assigned AFTER the operation loop — they win over colliding op names.
  client.configure = (next: ClientConfig): void => {
    // `errorMode` and `argsStyle` are fixed at generate time (they shape the static types);
    // flipping either at runtime would silently desync the calls from `Client<Ops>`, so both
    // are ignored here.
    const { errorMode: _fixedMode, argsStyle: _fixedStyle, auth, ...rest } = next;
    Object.assign(config, rest);
    // `auth` merges into existing credentials (like the `auth.*` setters) rather than
    // replacing wholesale — so `configure({ auth: { bearer } })` keeps a previously set
    // basic/apiKey. `apiKey` merges per scheme.
    if (auth) {
      config.auth = {
        ...config.auth,
        ...auth,
        ...(auth.apiKey ? { apiKey: { ...config.auth?.apiKey, ...auth.apiKey } } : {}),
      };
    }
  };
  client.use = (...middleware: Middleware[]): void => {
    // Reassign (don't push) so a caller-provided `middleware` array isn't mutated.
    config.middleware = [...(config.middleware ?? []), ...middleware];
  };
  client.auth = {
    bearer(token: TokenProvider): void {
      config.auth = { ...config.auth, bearer: token };
    },
    basic(username: string, password: string): void {
      config.auth = { ...config.auth, basic: { username, password } };
    },
    apiKey(scheme: string, value: TokenProvider): void {
      config.auth = { ...config.auth, apiKey: { ...config.auth?.apiKey, [scheme]: value } };
    },
  };

  return client as Client<Ops, OperationContext<Id, Path, Tag>>;
}
