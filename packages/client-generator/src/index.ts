// The package ROOT entry — what package-mode clients load at app runtime, so its static
// import graph stays runtime-only (no `typescript`, no `@redocly/openapi-core`, no Node
// builtins; guarded by entry-weight.test.ts). The generation stack lives behind the dynamic
// import inside `generateClient` and the `@redocly/client-generator/generate` entry.

// The language-neutral generator-authoring toolkit — pure functions over the IR,
// safe on this runtime-only entry (no typescript, no openapi-core, no builtins).
export * from './authoring/index.js';
export { NotSupportedError } from './errors.js';
export { defineClientSetup } from './runtime-contract.js';
export type {
  ClientSetup,
  ClientSetupConfig,
  Middleware,
  OperationContext,
  RequestContext,
  RetryConfig,
  RetryContext,
  RetryStrategy,
} from './runtime-contract.js';
// The app-facing client runtime (package-mode clients import these from the package root).
// The setup-contract names above (Middleware, OperationContext, RequestContext, RetryConfig,
// RetryContext, RetryStrategy) are re-exports of the same runtime types — one definition,
// two entry points; the rest of the runtime's type surface is re-exported here.
export {
  ApiError,
  createClient,
  defaultRetryOn,
  mergeSetup,
  TimeoutError,
} from './runtime/index.js';
export type {
  ApiErrorLike,
  AuthCredentials,
  Client,
  ClientConfig,
  ClientCore,
  Envelope,
  EnvelopeResult,
  OperationDescriptor,
  OperationMethodIdentity,
  OpsShape,
  ParamSpec,
  ParseAs,
  QueryValue,
  RequestOptions,
  Result,
  SecuritySpec,
  ServerSentEvent,
  SseOptions,
  TokenProvider,
} from './runtime/index.js';
// The generated-CLI engine (package-mode cli files import it from the package root).
export { runCli } from './runtime/cli.js';
export type {
  CliAuthScheme,
  CliCommand,
  CliGlobals,
  CliWiring,
  CommandContext,
  CommandSource,
  CustomCommand,
} from './runtime/cli.js';
// The user-facing pagination rule shapes (`Config.pagination` / `x-redoclyPagination`).
export type { PaginationConfig, PaginationRule, PaginationStyle } from './emitters/pagination.js';
export type {
  GenerateClientConfig,
  GenerateClientOptions,
  GenerateClientResult,
  LoadResult,
} from './types.js';
export { mergeConfig } from './config-file.js';
// The custom-generator authoring API (`defineGenerator` + the IR types); the
// TypeScript-emitting toolkit lives in `@redocly/client-generator/generate`.
export * from './plugin.js';

import type { GenerateClientOptions, GenerateClientResult } from './types.js';

export async function generateClient(
  options: GenerateClientOptions
): Promise<GenerateClientResult> {
  const pipeline = await import('./pipeline.js');
  return pipeline.generateClient(options);
}
