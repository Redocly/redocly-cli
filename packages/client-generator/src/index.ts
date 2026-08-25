// The package ROOT entry — the authoring surface: the language-neutral toolkit, the
// plugin API, the user-facing config types, and the setup contract. Nothing imports
// this entry at app runtime — generated clients embed their runtime (ADR-0022) — and
// the TypeScript-emitting stack lives behind the dynamic import inside `generateClient`
// and the `@redocly/client-generator/generate` entry.

// The language-neutral generator-authoring toolkit — pure functions over the IR.
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
// Descriptor wire shapes the generators emit and every runtime implements.
export type { ResponseHeaderSpec } from './runtime-contract.js';
export type { ModelPagination, PaginationSpec } from './pagination.js';
export { resolveSchemaPointer } from './pagination.js';
// Names the generated sdk wiring reserves — the typescript descriptor keeps schema
// identifiers clear of them.
export { WIRING_NAMES } from './reserved-names.js';
// The generated-CLI authoring contract — the command/wiring shapes a wrapper around a
// generated or composed CLI is written against, plus the two casing helpers CLI-flavored
// generators share; the engine itself (`runCli`) is embedded in, and re-exported by,
// every generated cli module.
export { constantCase, groupSlug } from './cli-contract.js';
export type {
  CliAuthScheme,
  CliCommand,
  CliFlag,
  CliGlobals,
  CliWiring,
  CommandContext,
  CommandSource,
  CustomCommand,
} from './cli-contract.js';
// The user-facing pagination rule shapes (`Config.pagination` / `x-redoclyPagination`).
export type { PaginationConfig, PaginationRule, PaginationStyle } from './pagination.js';
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
