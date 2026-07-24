/**
 * The public type surface of the client runtime — `@redocly/client-generator`'s
 * app-facing runtime module. Pure types, no runtime code (excluded from coverage).
 * The generator emits `OPERATIONS` literals typed
 * `satisfies Record<string, OperationDescriptor>` against this module, so an
 * incompatible runtime/generated pair fails the consumer's build (the semver skew guard).
 */

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

/**
 * How to auto-iterate a paginated operation (drives its `.pages()`/`.items()` members).
 * `nextCursor` and `items` are RFC 6901 JSON pointers into the page (response) value.
 */
export type PaginationSpec =
  | {
      style: 'cursor';
      /** The query param the iterator advances with the response's cursor. */
      param: string;
      /** Optional page-size query param (recorded for tooling; never set by the runtime). */
      limitParam?: string;
      /** Pointer to the next cursor in the page. */
      nextCursor: string;
      /** Optional pointer to a boolean "more pages" flag — `false` stops iteration. */
      hasMore?: string;
      /** Pointer to the page's item array. */
      items: string;
    }
  | {
      style: 'offset' | 'page';
      /** The numeric query param the iterator advances. */
      param: string;
      /** Optional page-size query param (recorded for tooling; never set by the runtime). */
      limitParam?: string;
      /** Pointer to the page's item array. */
      items: string;
    };

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
};

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

/** Backoff shape: 'fixed' = constant delay; 'exponential' = doubling per attempt. */
export type RetryStrategy = 'fixed' | 'exponential';

/**
 * The operation's identity, exposed to middleware for targeting (`ctx.operation`).
 * Generated clients instantiate the type parameters with the spec's literal unions
 * (`OperationId`/`OperationPath`/`OperationTag`) so a misspelled operation id in a
 * middleware comparison fails to compile; the string defaults keep every
 * spec-independent consumer (`runtime-contract.ts`, the runtime internals) working
 * with the base shape. `tags` stays mutable (`Tag[]`) so setup-contract types
 * (byte-locked to generated output) remain assignable through middleware callbacks.
 */
export type OperationContext<
  Id extends string = string,
  Path extends string = string,
  Tag extends string = string,
> = { id: Id; path: Path; tags: Tag[] };

/** The mutable request context threaded through the middleware chain. */
export type RequestContext<Op extends OperationContext = OperationContext> = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  operation: Op;
};

/** The failed attempt handed to a custom `retryOn`: exactly one of `response`/`error` is set. */
export type RetryContext<Op extends OperationContext = OperationContext> = {
  attempt: number;
  request: RequestContext<Op>;
  response?: Response;
  error?: unknown;
};

/** Opt-in retry policy; a per-call override merges field-by-field over the config policy. */
export type RetryConfig<Op extends OperationContext = OperationContext> = {
  retries?: number;
  retryDelay?: number;
  retryStrategy?: RetryStrategy;
  jitter?: boolean;
  retryOn?: (ctx: RetryContext<Op>) => boolean | Promise<boolean>;
};

/**
 * Structural stand-in for the runtime's ApiError so this module stays import-free
 * (pure types); the real `ApiError` class is assignable to it.
 */
export type ApiErrorLike = globalThis.Error & {
  url: string;
  status: number;
  statusText: string;
  body: unknown;
};

/** One interceptor: any subset of the three hooks. */
export type Middleware<Op extends OperationContext = OperationContext> = {
  onRequest?: (ctx: RequestContext<Op>) => void | Promise<void>;
  onResponse?: (
    response: Response,
    ctx: RequestContext<Op>
  ) => Response | void | Promise<Response | void>;
  /** Throw mode only: may map/replace the error. */
  // `globalThis.Error` so a spec schema named `Error` cannot shadow it in inline mode.
  onError?: (
    error: ApiErrorLike,
    ctx: RequestContext<Op>
  ) => globalThis.Error | Promise<globalThis.Error>;
};

/** Client configuration: transport, defaults, retry policy, middleware, and credentials. */
export type ClientConfig<Op extends OperationContext = OperationContext> = {
  serverUrl?: string;
  fetch?: typeof fetch;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  retry?: RetryConfig<Op>;
  middleware?: Middleware<Op>[];
  auth?: AuthCredentials;
  /** Fixed at generate time by the generator (`'throw'` when omitted); `configure()` ignores it. */
  errorMode?: 'throw' | 'result';
  onRequest?: Middleware<Op>['onRequest'];
  onResponse?: Middleware<Op>['onResponse'];
  onError?: Middleware<Op>['onError'];
};

/** Response readers for the per-call `parseAs` override. */
export type ParseAs = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';

/** Per-call options: standard `RequestInit` plus a retry override and a forced reader. */
export type RequestOptions = RequestInit & { retry?: RetryConfig; parseAs?: ParseAs };

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
  { args: object; result: unknown; kind?: 'sse'; item?: unknown; page?: unknown }
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

/** The typed instance client: one bound method per operation plus the core members. */
export type Client<Ops extends OpsShape, Op extends OperationContext = OperationContext> = {
  [K in keyof Ops]: Ops[K] extends { kind: 'sse' }
    ? NoRequiredKeys<Ops[K]['args']> extends true
      ? (
          args?: Ops[K]['args'],
          init?: SseOptions
        ) => AsyncGenerator<ServerSentEvent<Ops[K]['result']>>
      : (
          args: Ops[K]['args'],
          init?: SseOptions
        ) => AsyncGenerator<ServerSentEvent<Ops[K]['result']>>
    : (NoRequiredKeys<Ops[K]['args']> extends true
        ? (args?: Ops[K]['args'], init?: RequestOptions) => Promise<Ops[K]['result']>
        : (args: Ops[K]['args'], init?: RequestOptions) => Promise<Ops[K]['result']>) &
        Paginated<Ops[K]>;
} & ClientCore<Op>;
