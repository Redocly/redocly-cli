import type { Config as RedoclyConfig, Oas3Definition, detectSpec } from '@redocly/openapi-core';

import type { ArgsStyle } from './emitters/emit-options.js';
import type { PaginationConfig } from './emitters/pagination.js';
import type { CustomGenerator, OutputMode } from './generators/types.js';

export type GenerateClientOptions = {
  /** Path or URL to the OpenAPI document (or an `apis:` alias from `redocly.yaml`). */
  api: string;
  output: string;
  /** Resolved Redocly config for spec loading. */
  config?: RedoclyConfig;
  /**
   * How the generated client is partitioned across files. Defaults to `single`
   * (one self-contained file).
   */
  outputMode?: OutputMode;
  /**
   * How operation inputs are passed to each generated function/method:
   * `'flat'` (default) spreads path params as positional args followed by
   * `params`/`body`/`headers` slots; `'grouped'` bundles every input into a single
   * `args` object. The per-call `init` argument stays separate in both styles.
   */
  argsStyle?: ArgsStyle;
  /**
   * Override the BASE URL inlined into the generated runtime. When omitted,
   * the value is derived from `servers[0].url` in the source OpenAPI document.
   * Validation (e.g. `new URL(value)`) is the caller's responsibility — the
   * CLI handler validates before calling.
   */
  serverUrl?: string;
  /**
   * How named string enums are emitted. `'const-object'` (default) emits a
   * runtime `as const` companion object alongside the union type; `'union'`
   * emits only the string-literal union.
   */
  enumStyle?: 'union' | 'const-object';
  /**
   * Error-handling shape of the generated client. `'throw'` (default) throws
   * `ApiError` on non-2xx responses; `'result'` returns a discriminated
   * `{ data, error, response }` whose `error` is typed from the spec's 4xx/5xx
   * response bodies.
   */
  errorMode?: 'throw' | 'result';
  /**
   * How `format: date-time`/`date` string fields are typed. `'string'` (default)
   * keeps the ISO wire shape; `'Date'` emits a `Date` reference. Opt-in — pair with
   * the `transformers` generator so the runtime value matches the type. The
   * generated client stays zero-dep (`Date` is a web standard).
   */
  dateType?: 'string' | 'Date';
  /**
   * TanStack Query adapter the `tanstack-query` generator imports from
   * (`@tanstack/${queryFramework}-query`). Defaults to `'react'`; only the import
   * specifier changes — the emitted factory module is byte-identical across frameworks.
   */
  queryFramework?: 'react' | 'vue' | 'svelte' | 'solid';
  /**
   * How the `mock` generator produces data. `'baked'` (default) inlines deterministic
   * literals (zero-dep, contract-faithful); `'faker'` emits `@faker-js/faker` calls for
   * realistic data — making `@faker-js/faker` the consumer's dev-dep. Factory signatures
   * are identical across modes, so a consumer can flip this without changing call sites.
   */
  mockData?: 'baked' | 'faker';
  /**
   * Seed for faker-mode mocks. When set, the mock module emits a top-level
   * `faker.seed(<n>)` so generated data is reproducible across runs. Ignored in baked mode.
   */
  mockSeed?: number;
  /**
   * Generators to run, in order. Defaults to `['sdk']`. Each entry is a built-in name
   * (`sdk`/`zod`/`tanstack-query`/`swr`/`transformers`/`mock`), the `name` of an inline
   * `customGenerators` entry, or an import specifier (a path or package) for a custom generator.
   */
  generators?: string[];
  /**
   * Inline custom generators (the experimental plugin API), registered before resolution so they
   * can be selected in `generators` by `name`. Authored with `defineGenerator` from
   * `@redocly/client-generator`. Path/package specifiers in `generators` don't need this.
   */
  customGenerators?: CustomGenerator[];
  /**
   * Directory that relative-path generator specifiers resolve against (typically the config file's
   * location). Defaults to the current working directory.
   */
  configDir?: string;
  /**
   * Path to a publisher setup module (`export default defineClientSetup({ config, middleware })`)
   * baked into the generated client. Resolved against `configDir`. Works across all output modes.
   */
  setup?: string;
  /** Runtime distribution: 'inline' (default, self-contained) | 'package' (imports @redocly/client-generator). */
  runtime?: 'inline' | 'package';
  /** Extension in generated relative imports. `'js'` (default) suits tsc and bundlers;
   * `'ts'` suits runtimes that resolve specifiers literally, like Node's built-in
   * type stripping (`node client.ts`). */
  importExt?: 'js' | 'ts';
  /**
   * Auto-pagination rules: a convention rule (applied to every operation it
   * structurally fits), per-operation overrides, and `exclude`d operationIds —
   * resolved together with each operation's `x-pagination` extension (per-op config >
   * extension > convention). Paginated operations gain typed `.pages()`/`.items()`
   * iterators. Verified statically: an explicit rule that doesn't fit its operation
   * fails generation.
   */
  pagination?: PaginationConfig;
};

export type GenerateClientResult = {
  /** The `--output` anchor path (the entry file in multi-file modes). */
  outputPath: string;
  /** Total bytes written across every generated file. */
  bytes: number;
  /** Every file written to disk (single-element in `single` mode). */
  files: Array<{ path: string; bytes: number }>;
};

export type LoadResult = {
  document: Oas3Definition;
  /** The detected input spec version (e.g. 'oas2', 'oas3_0', 'oas3_1', 'oas3_2'). */
  version: ReturnType<typeof detectSpec>;
};
