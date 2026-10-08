/**
 * The public type surface of the client runtime — `@redocly/client-generator`'s
 * app-facing runtime module. Pure types, no runtime code (excluded from coverage).
 * The generator emits `OPERATIONS` literals typed
 * `satisfies Record<string, OperationDescriptor>` against this module, so an
 * incompatible runtime/generated pair fails the consumer's build (the semver skew guard).
 */

import type { PaginationSpec } from '../../../pagination.js';
import type {
  ApiErrorLike,
  ResponseHeaderSpec,
  Middleware,
  OperationContext,
  RequestContext,
  RetryConfig,
} from '../../../runtime-contract.js';

/** How one operation parameter is sent: its location plus OpenAPI query-serialization hints. */
export type ParamSpec = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
  explode?: boolean;
  allowReserved?: boolean;
};

/** One security scheme, denormalized onto the operation (`scheme` names the spec's scheme). */
export type SecuritySpec =
  | { scheme: string; kind: 'bearer' | 'basic' }
  | { scheme: string; kind: 'apiKey'; name: string; in: 'header' | 'query' | 'cookie' };

// The spec this runtime drives is DEFINED at the package level, beside the resolver
// that produces it (src/pagination.ts); re-exported here so the generated client's
// type surface is unchanged. The embed splices the definition back in (see
// scripts/generate-runtime-sources.mjs).
export type { PaginationSpec } from '../../../pagination.js';

/** The frozen data contract between generated code and the runtime: one operation's wire shape. */
export type OperationDescriptor = {
  id: string;
  method: string;
  path: string;
  tags?: readonly string[];
  params?: readonly ParamSpec[];
  /** `multipart: true` marks a typed object body serialized to FormData by the runtime. */
  body?: { contentType: string; multipart?: boolean };
  /** Defaults to `'json'` (content-type negotiation on parse). */
  responseKind?: 'json' | 'text' | 'blob' | 'void' | 'sse';
  sseDataKind?: 'json' | 'text';
  /** OR-alternatives, each an AND-set: the runtime applies the first fully-configured one. */
  security?: readonly (readonly SecuritySpec[])[];
  pagination?: PaginationSpec;
  /**
   * `'grouped'` marks an operation that takes its inputs namespaced by layer even on a
   * `argsStyle: 'flat'` client — the generator sets it where a merged call could not carry
   * one name for two layers, and the operation's own input type says the same.
   */
  argsStyle?: 'grouped';
  /**
   * Declared success-response headers for throw-mode `{ envelope: true }`.
   * `name` is the lowercased wire name; `key` is the camelCase envelope property.
   */
  responseHeaders?: readonly ResponseHeaderSpec[];
};

export type { ResponseHeaderSpec } from '../../../runtime-contract.js';

/** A query value: scalars, arrays of scalars, or objects (serialized as deepObject brackets). */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>
  | Record<string, unknown>;

/** A credential: a literal, or a (possibly async) function resolved per request (refresh flows). */
export type TokenProvider = string | (() => string | Promise<string>);

/** Per-instance credentials, keyed by the scheme kinds the runtime can inject. */
export type AuthCredentials = {
  bearer?: TokenProvider;
  basic?: { username: string; password: string };
  apiKey?: Record<string, TokenProvider>;
};

// The setup contract (ADR-0022): these types are defined at the package level in
// src/runtime-contract.ts — the layer publishers author `--setup` files against —
// and re-exported here. The embed splices the definitions back in.
export type {
  ApiErrorLike,
  Middleware,
  OperationContext,
  RequestContext,
  RetryConfig,
  RetryContext,
  RetryStrategy,
} from '../../../runtime-contract.js';

/** Client configuration: transport, defaults, retry policy, middleware, and credentials. */
export type ClientConfig<Op extends OperationContext = OperationContext> = {
  serverUrl?: string;
  fetch?: typeof fetch;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  retry?: RetryConfig<Op>;
  /** Milliseconds before a request attempt aborts (covers the body read too; each retry
   * attempt gets a fresh budget). Per-call `timeout` overrides it, `0` disables it.
   * SSE streams are long-lived by design and never inherit this value. */
  timeout?: number;
  /** Send an `Idempotency-Key` header on POST/PATCH (one stable key per logical call,
   * reused across retry attempts) — which also makes those retries safe under the
   * default retry policy. `true` generates a UUID per call; a function supplies the key. */
  idempotencyKey?: boolean | (() => string);
  /** Identifies this client to the API via an `X-Redocly-Client` header (the generator
   * bakes a default). Sent only OUTSIDE browsers — a custom header would force a CORS
   * preflight. Override with your own value, or `false` to disable. */
  clientHeader?: string | false;
  middleware?: Middleware<Op>[];
  auth?: AuthCredentials;
  /** Fixed at generate time by the generator (`'throw'` when omitted); `configure()` ignores it. */
  errorMode?: 'throw' | 'result';
  /**
   * How each call spells its inputs: `'grouped'` (the default) namespaces them by layer —
   * `{ path, query, headers, cookies, body }` — and `'flat'` takes one merged object.
   * Fixed at generate time, like `errorMode`, because it shapes the static types.
   */
  argsStyle?: 'grouped' | 'flat';
  onRequest?: Middleware<Op>['onRequest'];
  onResponse?: Middleware<Op>['onResponse'];
  onError?: Middleware<Op>['onError'];
};

/** Response readers for the per-call `parseAs` override. */
export type ParseAs = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';

/** Per-call options: standard `RequestInit` plus a retry override, a timeout override
 * (`0` disables the config default), and a forced reader. */
export type RequestOptions = RequestInit & {
  retry?: RetryConfig;
  timeout?: number;
  /** Per-call idempotency key: a literal key, `true` to generate one, `false` to skip. */
  idempotencyKey?: string | boolean | (() => string);
  parseAs?: ParseAs;
  /**
   * Throw mode only: return `{ data, headers, response }` instead of the parsed body;
   * ignored in result mode. The explicit `| undefined` keeps the wrappers' emitted
   * `envelope: undefined` strip legal under `exactOptionalPropertyTypes`.
   */
  envelope?: boolean | undefined;
};

/** Throw-mode success envelope when `RequestOptions.envelope` is `true`. */
export type Envelope<TData, THeaders = Record<string, never>> = {
  data: TData;
  headers: THeaders;
  response: Response;
};

/** Per-call options for an SSE stream; reconnect defaults to true. */
export type SseOptions = RequestInit & { reconnect?: boolean; reconnectDelay?: number };

/** A single decoded Server-Sent Event with its payload typed from the spec. */
export type ServerSentEvent<T> = { event?: string; data: T; id?: string; retry?: number };

/** Result-mode return shape: exactly one of `data`/`error` is set. */
export type Result<TData, TError> =
  | { data: TData; error: undefined; response: Response }
  | { data: undefined; error: TError; response: Response };

/**
 * The generated `Ops` type's shape: per-operation args/result, plus `kind: 'sse'` for
 * streams and, for paginated operations, `item` (the page's element type) and — on
 * result-mode clients only — `page` (the RAW page type `.pages()` yields, since
 * iteration unwraps the `Result` envelope the one-shot `result` carries).
 */
export type OpsShape = Record<
  string,
  {
    args: object;
    result: unknown;
    kind?: 'sse';
    item?: unknown;
    page?: unknown;
    /** Declared success-response headers for `{ envelope: true }` (camelCase keys). */
    headers?: object;
    /** Result-mode entries ignore the throw-only `envelope` option. */
    mode?: 'result';
  }
>;

/** The always-present client members (assigned after the operation loop — they win collisions). */
export type ClientCore<Op extends OperationContext = OperationContext> = {
  /** Merge into the config; note `middleware` REPLACES the chain (use `use()` to compose). */
  configure(config: ClientConfig<Op>): void;
  /** Append interceptors (composes with baked/publisher middleware). */
  use(...middleware: Middleware<Op>[]): void;
  auth: {
    bearer(token: TokenProvider): void;
    basic(username: string, password: string): void;
    apiKey(scheme: string, value: TokenProvider): void;
  };
};

/**
 * The standard TypeScript optionality probe: `{}` has no required members, so
 * `{} extends A` is true exactly when every member of `A` is optional.
 */
// oxlint-disable-next-line typescript/no-empty-object-type
type NoRequiredKeys<A> = {} extends A ? true : false;

/**
 * The page type `.pages()` yields: the RAW page declared by `page` (the generator
 * writes it only on result-mode paginated entries, whose `result` is the envelope),
 * or the method's own `result` (throw mode — already the raw page).
 */
type PageOf<Entry extends OpsShape[string]> = Entry extends { page: unknown }
  ? Entry['page']
  : Entry['result'];

/**
 * The auto-pagination members intersected onto a paginated method — present exactly when
 * the Ops entry declares `item` (the generator writes it only for paginated operations).
 * Args optionality mirrors the method's own; `unknown` otherwise (identity under `&`).
 * Iteration is error-mode-agnostic: `.pages()`/`.items()` yield raw pages/items, and a
 * failed page aborts iteration by throwing `ApiError`, even on result-mode clients; the
 * `onError` middleware hook (throw-mode-only) is not invoked.
 */
type Paginated<Entry extends OpsShape[string]> = 'item' extends keyof Entry
  ? NoRequiredKeys<Entry['args']> extends true
    ? {
        pages(args?: Entry['args'], init?: RequestOptions): AsyncGenerator<PageOf<Entry>>;
        items(args?: Entry['args'], init?: RequestOptions): AsyncGenerator<Entry['item']>;
      }
    : {
        pages(args: Entry['args'], init?: RequestOptions): AsyncGenerator<PageOf<Entry>>;
        items(args: Entry['args'], init?: RequestOptions): AsyncGenerator<Entry['item']>;
      }
  : unknown;

/**
 * The stable identity every client method carries: the SPEC operationId (also set as
 * `fn.name`, but `operationId` is the explicit, minification-proof form) — a robust
 * cache key for consumer wrappers (react-query keys and the like).
 */
export type OperationMethodIdentity = { readonly operationId: string };

/** Declared response-header bag for an Ops entry; empty object when none are declared. */
type HeadersOf<Entry extends OpsShape[string]> = 'headers' extends keyof Entry
  ? NonNullable<Entry['headers']>
  : Record<string, never>;

/**
 * Return type of a throw-mode call: the body by default, `Envelope<…>` for a literal
 * `envelope: true`, their union when the flag is a widened `boolean`. Exact
 * `RequestOptions` stays the body — pre-envelope package-mode flat sugar typed every
 * `init` parameter as `RequestOptions`, and widening that would break upgrades without
 * a regenerate. The `keyof` presence gate keeps `{ headers }` / `{ signal }` as the body
 * (`TInit['envelope']` through `TInit & RequestOptions` would otherwise be
 * `boolean | undefined`).
 */
export type EnvelopeResult<
  TData,
  THeaders,
  TInit extends RequestOptions | undefined,
> = TInit extends undefined
  ? TData
  : RequestOptions extends TInit
    ? TInit extends RequestOptions
      ? TData
      : EnvelopeResultForKnownInit<TData, THeaders, TInit>
    : EnvelopeResultForKnownInit<TData, THeaders, TInit>;

type EnvelopeResultForKnownInit<TData, THeaders, TInit> = 'envelope' extends keyof TInit
  ? [TInit['envelope' & keyof TInit]] extends [true]
    ? Envelope<TData, THeaders>
    : [TInit['envelope' & keyof TInit]] extends [false | undefined]
      ? TData
      : TData | Envelope<TData, THeaders>
  : TData;

/** A one-shot method whose return shape never varies with per-call options. */
type BodyMethod<Entry extends OpsShape[string]> =
  NoRequiredKeys<Entry['args']> extends true
    ? (args?: Entry['args'], init?: RequestOptions) => Promise<Entry['result']>
    : (args: Entry['args'], init?: RequestOptions) => Promise<Entry['result']>;

/**
 * One-shot (non-SSE) method: default returns the body; `{ envelope: true }` returns
 * `{ data, headers, response }` with typed declared headers.
 */
type ThrowMethod<Entry extends OpsShape[string]> =
  NoRequiredKeys<Entry['args']> extends true
    ? <Init extends RequestOptions | undefined = undefined>(
        args?: Entry['args'],
        init?: Init
      ) => Promise<EnvelopeResult<Entry['result'], HeadersOf<Entry>, Init>>
    : <Init extends RequestOptions | undefined = undefined>(
        args: Entry['args'],
        init?: Init
      ) => Promise<EnvelopeResult<Entry['result'], HeadersOf<Entry>, Init>>;

/** The typed instance client: one bound method per operation plus the core members. */
export type Client<Ops extends OpsShape, Op extends OperationContext = OperationContext> = {
  [K in keyof Ops]: Ops[K] extends { kind: 'sse' }
    ? (NoRequiredKeys<Ops[K]['args']> extends true
        ? (
            args?: Ops[K]['args'],
            init?: SseOptions
          ) => AsyncGenerator<ServerSentEvent<Ops[K]['result']>>
        : (
            args: Ops[K]['args'],
            init?: SseOptions
          ) => AsyncGenerator<ServerSentEvent<Ops[K]['result']>>) &
        OperationMethodIdentity
    : (Ops[K] extends { mode: 'result' } ? BodyMethod<Ops[K]> : ThrowMethod<Ops[K]>) &
        OperationMethodIdentity &
        Paginated<Ops[K]>;
} & ClientCore<Op>;
