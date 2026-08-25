// The public, spec-independent runtime contract a publisher's `--setup` file imports.
// These types are DEFINED here, at the package level, and the TypeScript runtime
// re-exports them (ADR-0022) — the embed splices the definitions into the generated
// client's types module, so the contract cannot drift from the generated output.

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

/**
 * The spec-independent subset of a client's `ClientConfig` a publisher may bake in
 * (everything except the spec-derived `auth`).
 */
export type ClientSetupConfig = {
  serverUrl?: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetch?: typeof fetch;
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  onResponse?: (
    response: Response,
    ctx: RequestContext
  ) => Response | void | Promise<Response | void>;
  onError?: (error: Error, ctx: RequestContext) => Error;
  retry?: RetryConfig;
};

export type ClientSetup = { config?: ClientSetupConfig; middleware?: Middleware[] };

/**
 * Identity helper for authoring a `--setup` module: gives full type inference and a stable
 * call the baker recognises. `export default defineClientSetup({ config, middleware })`.
 *
 * @experimental The setup API may change between minor versions until stabilized.
 */
export function defineClientSetup(setup: ClientSetup): ClientSetup {
  return setup;
}

/** One declared response header the runtime coerces into the envelope `headers` object. */
export type ResponseHeaderSpec = {
  name: string;
  key: string;
  type: 'string' | 'number' | 'boolean';
};
