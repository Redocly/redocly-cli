// The public, spec-independent runtime contract a publisher's `--setup` file imports.
// These are the runtime's own types (src/runtime/types.ts) — the very module the
// generated client embeds (inline) or imports (package) — so the contract cannot
// drift from the generated output.

import type { Middleware, RequestContext, RetryConfig } from './runtime/types.js';

export type {
  Middleware,
  OperationContext,
  RequestContext,
  RetryConfig,
  RetryContext,
  RetryStrategy,
} from './runtime/types.js';

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
