// packages/client-generator/src/generators/types.ts
import type { EmitOptions } from '../emitters/emit-options.js';
import type { ErrorMode } from '../emitters/operations.js';
import type { DateType } from '../emitters/types.js';
import type { ApiModel } from '../intermediate-representation/model.js';

/**
 * How the generated client is partitioned across files.
 *
 * - `single` (default): one self-contained file.
 * - `split`: schema types + guards in a sibling `<stem>.schemas.ts`; everything
 *   else in the entry file, which re-exports the schemas module.
 */
export type OutputMode = 'single' | 'split';

/** A single file the generator will write to disk. */
export type GeneratedFile = { path: string; content: string };

/** The first-party generators the registry knows. */
export type GeneratorName = 'sdk' | 'zod' | 'tanstack-query' | 'swr' | 'transformers' | 'mock';

/** Everything a generator needs to produce its files. */
export type GeneratorInput = {
  model: ApiModel;
  /** The `--output` anchor path. */
  outputPath: string;
  /** File partitioning the generator should honor. */
  outputMode: OutputMode;
  /** Emit options — serverUrl, runtime, and the generator knobs (dateType, mockData, queryFramework, …); see `EmitOptions`. */
  emit: EmitOptions;
};

/**
 * A Generator turns the IR + options into a set of files. Each lives behind a
 * name in the registry — the built-ins, plus custom generators registered
 * through the plugin API (see `CustomGenerator`).
 */
export type Generator = (input: GeneratorInput) => GeneratedFile[];

/**
 * A generator plus its declared compatibility contract. `validateGenerators`
 * checks these *before* anything is emitted, so an incompatible selection fails
 * fast with an actionable message instead of producing a client that won't compile.
 *
 * - `requires`: other generators that must also be selected (e.g. `tanstack-query`
 *   imports the sdk's operation functions, so it requires `sdk`).
 * - `errorModes` / `dateTypes` / `runtimes`: the subset this generator supports;
 *   `undefined` means "all". (`tanstack-query` wraps throw-mode functions, so it
 *   supports only `throw` mode; `transformers` only type-checks when the sdk types
 *   date fields as `Date`, so it supports only `dateType: 'Date'`.)
 */
export type GeneratorDescriptor = {
  run: Generator;
  // `string[]` (not `GeneratorName[]`) so a custom generator may require a built-in or another
  // custom generator by name; built-in descriptors still type-check (their names are strings).
  requires?: string[];
  errorModes?: ErrorMode[];
  dateTypes?: DateType[];
  /** Runtime modes this generator supports; absent = compatible with both. */
  runtimes?: ('inline' | 'package')[];
};

/**
 * A user-authored generator (the public, experimental plugin contract): a `GeneratorDescriptor`
 * plus a unique `name` used to select it in `generators`, to satisfy other generators' `requires`,
 * and to detect collisions. Authors build one via `defineGenerator` from the
 * `@redocly/client-generator` entry; the resolver registers it under `name`.
 */
export type CustomGenerator = GeneratorDescriptor & {
  /** Unique name, used in `generators` selection, `requires`, and collision detection. */
  name: string;
};
