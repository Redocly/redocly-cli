import type { ArgsStyle, Facade } from './emitters/client.js';
// packages/client-generator/src/config.ts
import type { CustomGenerator } from './generators/types.js';
import type { OutputMode } from './writers/types.js';

/**
 * The user-facing generation config: the options `generateClient()` accepts, plus the
 * `generators` list. Annotate a standalone config object with `satisfies Config` for
 * type-safe authoring. `redocly.yaml` ingestion is intentionally not modeled here
 * (roadmap P7.5).
 */
export type Config = {
  /** Path or URL to the OpenAPI document. */
  input: string;
  /** Output anchor path (a `.ts` file; multi-file modes derive siblings from it). */
  output: string;
  /** File partitioning. Defaults to `single`. */
  outputMode?: OutputMode;
  /** Developer-facing operation shape. Defaults to `functions`. */
  facade?: Facade;
  /** How inputs are passed. Defaults to `flat`. */
  argsStyle?: ArgsStyle;
  /** Class name for the service-class facade. Defaults to `Client`. */
  name?: string;
  /** Override the inlined base URL (else derived from `servers[0].url`). */
  baseUrl?: string;
  /** Named-enum emission. Defaults to `const-object`. */
  enumStyle?: 'union' | 'const-object';
  /** Error-handling shape of the generated client. `'throw'` (default) throws `ApiError`
   * on non-2xx; `'result'` returns a discriminated `{ data, error, response }`. */
  errorMode?: 'throw' | 'result';
  /** How `date-time`/`date` string fields are typed. `'string'` (default) keeps the
   * ISO wire shape; `'Date'` emits a `Date` reference (pair with the `transformers`
   * generator so the runtime value matches). */
  dateType?: 'string' | 'Date';
  /** TanStack Query adapter the `tanstack-query` generator imports from
   * (`@tanstack/${queryFramework}-query`). Defaults to `react`; only the import
   * specifier changes. */
  queryFramework?: 'react' | 'vue' | 'svelte' | 'solid';
  /** How the `mock` generator produces data. `'baked'` (default) inlines deterministic
   * literals (zero-dep); `'faker'` emits `@faker-js/faker` calls for realistic data
   * (the consumer adds `@faker-js/faker` as a dev-dep). */
  mockData?: 'baked' | 'faker';
  /** Seed for faker-mode mocks: emits `faker.seed(<n>)` so runs reproduce. Baked mode ignores it. */
  mockSeed?: number;
  /**
   * Generators to run, in order. Defaults to `['sdk']`. Each entry is a built-in name, the `name`
   * of an inline `customGenerators` entry, or an import specifier (path or package) for a plugin.
   */
  generators?: string[];
  /**
   * Inline custom generators (the experimental plugin API), registered so they can be selected in
   * `generators` by `name`. Authored with `defineGenerator` from `@redocly/client-generator/plugin`.
   */
  customGenerators?: CustomGenerator[];
};
