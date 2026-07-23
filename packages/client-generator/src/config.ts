import type { ArgsStyle } from './emitters/emit-options.js';
// packages/client-generator/src/config.ts
import type { PaginationConfig } from './emitters/pagination.js';
import type { CustomGenerator, OutputMode } from './generators/types.js';

/**
 * The user-facing generation config: the options `generateClient()` accepts, plus the
 * `generators` list. Annotate a standalone config object with `satisfies Config` for
 * type-safe authoring. The CLI merges a `redocly.yaml` `client` block into this shape
 * via `mergeConfig` (see config-file.ts).
 */
export type Config = {
  /** Path or URL to the OpenAPI document (or an `apis:` alias from `redocly.yaml`). */
  api: string;
  /** Output anchor path (a `.ts` file; multi-file modes derive siblings from it). */
  output: string;
  /** File partitioning. Defaults to `single`. */
  outputMode?: OutputMode;
  /** How inputs are passed. Defaults to `flat`. */
  argsStyle?: ArgsStyle;
  /** Override the inlined base URL (else derived from `servers[0].url`). */
  serverUrl?: string;
  /** Error-handling shape of the generated client. `'throw'` (default) throws `ApiError`
   * on non-2xx; `'result'` returns a discriminated `{ data, error, response }`. */
  errorMode?: 'throw' | 'result';
  /** How `date-time`/`date` string fields are typed. `'string'` (default) keeps the
   * ISO wire shape; `'Date'` emits a `Date` reference (pair with the `transformers`
   * generator so the runtime value matches). */
  dateType?: 'string' | 'Date';
  /** How the `mock` generator produces data. `'static'` (default) inlines deterministic
   * literals (zero-dep); `'faker'` emits `@faker-js/faker` calls for realistic data
   * (the consumer adds `@faker-js/faker` as a dev-dep). */
  mockData?: 'static' | 'faker';
  /** Seed for faker-mode mocks: emits `faker.seed(<n>)` so runs reproduce. Static mode ignores it. */
  mockSeed?: number;
  /**
   * Generators to run, in order. Defaults to `['sdk']`. Each entry is a built-in name, the `name`
   * of an inline `customGenerators` entry, or an import specifier (path or package) for a plugin.
   */
  generators?: string[];
  /**
   * Inline custom generators (the experimental plugin API), registered so they can be selected in
   * `generators` by `name`. Authored with `defineGenerator` from `@redocly/client-generator`.
   */
  customGenerators?: CustomGenerator[];
  /**
   * Path to a publisher setup module (`export default defineClientSetup({ config, middleware })`)
   * baked into the generated client, so a published SDK ships its request/response defaults built
   * in. Resolved against the config dir. Works across all output modes.
   */
  setup?: string;
  /** Runtime distribution: 'inline' (default, self-contained) | 'package' (imports @redocly/client-generator). */
  runtime?: 'inline' | 'package';
  /** Extension in generated relative imports. `'js'` (default) suits tsc and bundlers;
   * `'ts'` suits runtimes that resolve specifiers literally, like Node's built-in
   * type stripping (`node client.ts`). */
  importExt?: 'js' | 'ts';
  /** Auto-pagination rules (convention + per-operation overrides + `exclude`), resolved
   * together with each operation's `x-pagination` extension. Explicit rules that don't
   * fit their operation fail generation. */
  pagination?: PaginationConfig;
};
