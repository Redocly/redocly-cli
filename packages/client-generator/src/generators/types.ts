import type { DateType } from '../authoring/options.js';
import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';
import type { ModelPagination } from '../pagination.js';

export type { DateType } from '../authoring/options.js';

/** Error-handling shape of the generated client: throw on non-2xx, or return a result union. */
export type ErrorMode = 'throw' | 'result';

/**
 * How an operation's inputs are passed to the generated call.
 * - `'flat'` (default): path params spread as positional args, then the
 *   `params`/`body`/`headers` slots — one exported sugar arrow per operation.
 * - `'grouped'`: the client methods' own shape — a single `args` object bundling
 *   every input; the sugar is a plain destructure of the client. The per-call
 *   `init: RequestOptions` stays a separate trailing argument in both styles.
 */
export type ArgsStyle = 'flat' | 'grouped';

export type EmitOptions = {
  /**
   * Override the server URL baked into the generated client config. When omitted,
   * the value is derived from `servers[0].url` in the source OpenAPI description.
   */
  serverUrl?: string;
  /**
   * How operation inputs are passed to each call. Defaults to `'flat'`;
   * `'grouped'` bundles inputs into a single `args` object.
   */
  argsStyle?: ArgsStyle;
  /** Error-handling shape of the generated client. Defaults to `'throw'`. */
  errorMode?: 'throw' | 'result';
  /**
   * How `format: date-time`/`date` string fields are typed. `'string'` (default)
   * keeps the ISO wire shape; `'Date'` emits a `Date` reference. Opt-in — pair with
   * the `transformers` generator so the runtime value matches the type.
   */
  dateType?: DateType;
  /**
   * How the `mock` generator produces data. `'static'` (default) inlines deterministic
   * literals (zero-dep, contract-faithful); `'faker'` emits `@faker-js/faker` calls for
   * realistic data — reproducible when `mockSeed` is set. Only the mock module is affected.
   */
  mockData?: 'static' | 'faker';
  /** Seed for faker-mode mocks: emits a top-level `faker.seed(<n>)` so runs reproduce. */
  mockSeed?: number;
  /** Leading element for every tanstack-query key — namespaces the cache when several
   * generated APIs share one QueryClient (operationIds may collide across APIs). */
  queryKeyPrefix?: string;
  /**
   * A pre-baked publisher setup block (from `bakeSetup`) merged into the client's config
   * via `mergeSetup`. Absent when no `--setup` is given.
   */
  setup?: string;
  /** Runtime distribution: 'inline' (default, self-contained) | 'package' (imports @redocly/client-generator). */
  runtime?: 'inline' | 'package';
  /**
   * Extension used in generated relative import specifiers (the split entry's schemas
   * re-export and each satellite's sdk import). `'js'` (default) is the tsc/bundler
   * convention; `'ts'` targets runtimes that resolve specifiers literally, like Node's
   * built-in type stripping (`node client.ts`).
   */
  importExt?: 'js' | 'ts';
  /**
   * Package clause of the `go` generator's output. Defaults to `client` — a generated
   * file usually lands in a package the consumer already owns, so the name is theirs
   * to choose. An invalid Go package name fails generation.
   */
  goPackage?: string;
  /**
   * Auto-pagination RESOLVED by the pipeline (fit-verified, one answer per run),
   * resolved together with each operation's `x-redoclyPagination` extension. Verified
   * statically: an explicit rule that doesn't fit its operation fails generation.
   */
  pagination?: ModelPagination;
  /**
   * Also write the reference documentation for what each selected generator emits: one
   * Markdown page per generator that implements the `docs` hook. One switch for the whole
   * run, so a new documented language never needs a new flag.
   */
  docs?: boolean;
  /** Emit YAML front matter carrying the title above each documentation page. */
  docsFrontmatter?: boolean;
};

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

/**
 * The `--output` anchor, parsed once by the pipeline: the full `path`, its `dir`,
 * the `stem` (base name without the final extension), and the `ext` (with the dot).
 * Generators derive sibling-file names from these instead of re-parsing the path.
 */
export type OutputAnchor = { path: string; dir: string; stem: string; ext: string };

/** Everything a generator needs to produce its files. */
export type GeneratorInput = {
  model: ApiModel;
  /** The `--output` anchor, parsed (see `OutputAnchor`). */
  output: OutputAnchor;
  /**
   * The generated-by banner lines, free of comment markers — each generator prepends
   * them in its own comment syntax, so every emitted file says the same thing.
   */
  banner: string[];
  /**
   * Pagination resolved ONCE by the pipeline — per-op config > `x-redoclyPagination` >
   * convention, fit-verified, pointers resolved — keyed by operation name. Generators
   * read this instead of re-resolving, so two of them cannot disagree about whether an
   * operation paginates.
   */
  pagination?: ModelPagination;
  /** File partitioning the generator should honor. */
  outputMode: OutputMode;
  /** Emit options — serverUrl, runtime, and the generator knobs (dateType, mockData, …); see `EmitOptions`. */
  emit: EmitOptions;
  /** Every generator name in the run — lets a generator adapt to co-selection (cli wires zod validation when `zod` is selected). */
  selected?: string[];
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

/**
 * What a `sample` hook receives besides the operation. `outputPath` is the `--output`
 * anchor: a snippet has to import the module this run actually writes, and each language
 * derives that name from the anchor its own way (`openapi.client.ts` becomes
 * `openapi_client.py`), so a hardcoded module name is wrong for most stems.
 */
export type SampleContext = {
  model: ApiModel;
  emit: EmitOptions;
  outputPath: string;
  /** The run's resolved pagination (see `GeneratorInput.pagination`). */
  pagination?: ModelPagination;
};

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
  /**
   * Optional: the reference documentation for what `run` emits — a Markdown page per
   * generated artifact, returned like `run`'s files. Called only when `client.docs` (or
   * `--docs`) is on, so documentation is one switch for the whole run instead of a
   * generator name per language. A generator documents ITSELF: nothing else knows its
   * call syntax, and ejecting the generator takes its page with it.
   */
  docs?: Generator;
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
