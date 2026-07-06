import { ApiError } from './errors.js';
import { parse, readError } from './parse.js';
import { middlewareChain, send, type SendCapabilities } from './send.js';
import type {
  ApiErrorLike,
  Client,
  ClientConfig,
  Middleware,
  OperationContext,
  OperationDescriptor,
  OpsShape,
  ParseAs,
  QueryValue,
  RequestOptions,
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
    security: readonly SecuritySpec[],
    config: ClientConfig
  ) => Promise<{ headers: Record<string, string>; query: Record<string, string> }>;
  sse?: (
    config: ClientConfig,
    op: OperationContext,
    url: string,
    init: SseOptions,
    dataKind: 'json' | 'text'
  ) => AsyncGenerator<ServerSentEvent<unknown>>;
};

/** The grouped args wire shape: path params by name plus the `params`/`body`/`headers` slots. */
type OperationArgs = {
  params?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, unknown>;
} & Record<string, unknown>;

/** The response reader implied by the descriptor (before any per-call `parseAs` override). */
function kindFor(op: OperationDescriptor): ParseAs | 'void' {
  if (op.responseKind === 'void' || op.responseKind === 'blob' || op.responseKind === 'text') {
    return op.responseKind;
  }
  return 'auto';
}

/** Route the grouped args by the descriptor: path values, query object, body, extra headers. */
function splitArgs(op: OperationDescriptor, args: OperationArgs) {
  const path: Record<string, unknown> = {};
  for (const param of op.params ?? []) {
    if (param.in === 'path') path[param.name] = args[param.name];
  }
  return { path, query: args.params, body: args.body, headers: args.headers };
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
  const { path, query, body, headers } = splitArgs(op, args);
  const authed =
    op.security?.length && caps.resolveAuth
      ? await caps.resolveAuth(op.security, config)
      : { headers: {}, query: {} };
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
      ...(init.headers as Record<string, string> | undefined),
    },
  };
  return { url, init: mergedInit, body };
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
  const { parseAs, ...sendInit } = prepared.init;
  const { response, context } = await send(
    config,
    opCtx,
    prepared.url,
    sendInit,
    prepared.body,
    op.body?.multipart === true,
    caps
  );
  const readKind = parseAs ?? kindFor(op);
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
  return parse(response, readKind);
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
      client[name] = (args: OperationArgs = {}, init: SseOptions = {}) => {
        if (!caps.sse) {
          throw new Error(`SSE capability not wired: cannot stream operation "${op.id}"`);
        }
        const stream = caps.sse;
        return (async function* () {
          const prepared = await prepareRequest(config, op, args, init, caps);
          const opCtx: OperationContext = { id: op.id, path: op.path, tags: [...(op.tags ?? [])] };
          yield* stream(config, opCtx, prepared.url, prepared.init, op.sseDataKind ?? 'text');
        })();
      };
    } else {
      client[name] = (args: OperationArgs = {}, init: RequestOptions = {}) =>
        execute(config, op, args, init, caps);
    }
  }

  // Core members are assigned AFTER the operation loop — they win over colliding op names.
  client.configure = (next: ClientConfig): void => {
    // `errorMode` is fixed at generate time (it shapes the static types); flipping it at
    // runtime would silently desync return shapes from `Client<Ops>`, so it is ignored.
    const { errorMode: _fixed, ...rest } = next;
    Object.assign(config, rest);
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
