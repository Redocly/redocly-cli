// The public, spec-independent runtime contract a publisher's `--setup` file imports.
// These MUST stay byte-identical to the spec-independent types emitted into every client
// (see emitters/runtime.ts); a lockstep test guards against drift.

export type OperationContext = { id: string; path: string; tags: string[] };

export type RequestContext = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  operation: OperationContext;
};

export type Middleware = {
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  onResponse?: (
    response: Response,
    ctx: RequestContext
  ) => Response | void | Promise<Response | void>;
  onError?: (error: Error, ctx: RequestContext) => Error | Promise<Error>;
};

export type RetryStrategy = 'fixed' | 'exponential';

export type RetryContext = {
  attempt: number;
  request: RequestContext;
  response?: Response;
  error?: unknown;
};

export type RetryConfig = {
  retries?: number;
  retryDelay?: number;
  retryStrategy?: RetryStrategy;
  jitter?: boolean;
  retryOn?: (ctx: RetryContext) => boolean | Promise<boolean>;
};

/**
 * The spec-independent subset of a client's `ClientConfig` a publisher may bake in
 * (everything except the spec-derived `auth`).
 */
export type ClientSetupConfig = {
  baseUrl?: string;
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
