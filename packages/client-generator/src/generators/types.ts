// packages/client-generator/src/generators/types.ts
import type { EmitOptions } from '../emitters/emit-options.js';
import type { ErrorMode } from '../emitters/operations.js';
import type { DateType } from '../emitters/types.js';
import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';

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
export type GeneratorName =
  | 'typescript'
  | 'zod'
  | 'tanstack-query'
  | 'tanstack-query-vue'
  | 'tanstack-query-svelte'
  | 'tanstack-query-solid'
  | 'swr'
  | 'transformers'
  | 'mock'
  | 'cli'
  | 'cli-docs'
  | 'sdk-docs'
  | 'python'
  | 'go'
  | 'php';

/**
 * One option a generator accepts: a scalar, a closed set of values, or a list of scalars.
 * Config values are scalars and lists of scalars, so the schema vocabulary stops there —
 * nothing a `redocly.yaml` block can express is missing.
 */
export type GeneratorOptionSchema = { default?: unknown; description?: string } & (
  | { type: 'string' | 'number' | 'boolean' }
  | { type: 'array'; items: { type: 'string' | 'number' | 'boolean' } }
  | { enum: Array<string | number | boolean> }
);

/** The options a generator declares, as the JSON Schema subset the config layer validates. */
export type GeneratorOptionsSchema = {
  type: 'object';
  properties: Record<string, GeneratorOptionSchema>;
  required?: string[];
  /** Unknown keys are rejected unless this is `true` — a typo'd option is a config bug. */
  additionalProperties?: boolean;
};

/** Everything a generator needs to produce its files. */
export type GeneratorInput = {
  model: ApiModel;
  /** The `--output` anchor path. */
  outputPath: string;
  /** File partitioning the generator should honor. */
  outputMode: OutputMode;
  /** Emit options — serverUrl, runtime, and the generator knobs (dateType, mockData, …); see `EmitOptions`. */
  emit: EmitOptions;
  /** Every generator name in the run — lets a generator adapt to co-selection (cli wires zod validation when `zod` is selected). */
  selected?: string[];
  /**
   * The `sample` hook of every selected generator that declares one, keyed by generator
   * name. A docs generator renders each SDK's own call snippet from these instead of
   * importing the SDK generators, which would pull all of them into its bundle.
   */
  samples?: Record<
    string,
    (operation: OperationModel, ctx: SampleContext) => CodeSample | undefined
  >;
  /**
   * This generator's own options from `client.options.<name>`, already validated against
   * the schema it declares with defaults applied — a generator reads them without re-checking.
   * Empty when the generator declares no options.
   */
  options?: Record<string, unknown>;
};

/**
 * A Generator turns the IR + options into a set of files. Each lives behind a
 * name in the registry — the built-ins, plus custom generators registered
 * through the plugin API (see `CustomGenerator`).
 */
export type Generator = (input: GeneratorInput) => GeneratedFile[];

/** One idiomatic call snippet for an operation, rendered for docs (`x-codeSamples`). */
export type CodeSample = { lang: string; label?: string; source: string };

/** What a `sample` hook receives besides the operation. */
export type SampleContext = { model: ApiModel; emit: EmitOptions };

/**
 * A generator plus its declared compatibility contract. `validateGenerators`
 * checks these *before* anything is emitted, so an incompatible selection fails
 * fast with an actionable message instead of producing a client that won't compile.
 *
 * - `requires`: other generators that must also be selected (e.g. `tanstack-query`
 *   imports the client's operation functions, so it requires `typescript`).
 * - `errorModes` / `dateTypes` / `runtimes`: the subset this generator supports;
 *   `undefined` means "all". (`tanstack-query` wraps throw-mode functions, so it
 *   supports only `throw` mode; `transformers` only type-checks when the client types
 *   date fields as `Date`, so it supports only `dateType: 'Date'`.)
 */
export type GeneratorDescriptor = {
  run: Generator;
  /** The options this generator accepts, validated before `run` (see `GeneratorOptionsSchema`). */
  options?: GeneratorOptionsSchema;
  /** Optional: one idiomatic call snippet per operation for docs (`x-codeSamples`);
   * collected into an overlay when `codeSamples` is enabled. Return undefined to skip. */
  sample?: (operation: OperationModel, ctx: SampleContext) => CodeSample | undefined;
  // `string[]` (not `GeneratorName[]`) so a custom generator may require a built-in or another
  // custom generator by name; built-in descriptors still type-check (their names are strings).
  requires?: string[];
  errorModes?: ErrorMode[];
  dateTypes?: DateType[];
  /** Runtime modes this generator supports; absent = compatible with both. */
  runtimes?: ('inline' | 'package')[];
  /**
   * Options this generator does not apply, mapped to the reason it doesn't. Setting
   * one explicitly warns instead of being silently dropped — a global option
   * (`outputMode`, `runtime`, …) may be meaningful for one selected generator and
   * meaningless for another, so this informs rather than rejects.
   */
  notApplicable?: Partial<Record<keyof EmitOptions | 'outputMode', string>>;
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
  /**
   * The `@redocly/client-generator` version range this module was written against —
   * `^1.2.0`, `~1.2.0`, `>=1.2.0`, or an exact version. A CLI outside the range is
   * rejected at resolve time with the fix path; omitting it accepts the generator as
   * current (friction-free hand authoring). Ejected generators carry it automatically.
   */
  requiresGenerator?: string;
};
