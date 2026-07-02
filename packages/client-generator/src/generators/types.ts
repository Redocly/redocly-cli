// packages/client-generator/src/generators/types.ts
import type { EmitOptions } from '../emitters/client.js';
import type { ErrorMode, Facade } from '../emitters/operations.js';
import type { DateType } from '../emitters/types.js';
import type { ApiModel } from '../intermediate-representation/model.js';
import type { GeneratedFile, OutputMode } from '../writers/types.js';

/** The first-party generators the registry knows. Extends as P5 lands (react-query, …). */
export type GeneratorName = 'sdk' | 'zod' | 'tanstack-query' | 'swr' | 'transformers' | 'mock';

/** Everything a generator needs to produce its files. */
export type GeneratorInput = {
  model: ApiModel;
  /** The `--output` anchor path. */
  outputPath: string;
  /** File partitioning the generator should honor. */
  outputMode: OutputMode;
  /** Emit options (serverUrl/enumStyle/facade/argsStyle/name). */
  emit: EmitOptions;
};

/**
 * A Generator turns the IR + options into a set of files. This is the seam new
 * capabilities (zod, framework hooks) plug into — each is a deep module behind a
 * name in the registry. First-party only in P1; no public plugin API yet.
 */
export type Generator = (input: GeneratorInput) => GeneratedFile[];

/**
 * A generator plus its declared compatibility contract. `validateGenerators`
 * checks these *before* anything is emitted, so an incompatible selection fails
 * fast with an actionable message instead of producing a client that won't compile.
 *
 * - `requires`: other generators that must also be selected (e.g. `tanstack-query`
 *   imports the sdk's operation functions, so it requires `sdk`).
 * - `facades` / `errorModes` / `dateTypes`: the subset this generator supports;
 *   `undefined` means "all". (`tanstack-query` wraps free throw-mode functions, so it
 *   supports only the `functions` facade in `throw` mode; `transformers` only type-checks
 *   when the sdk types date fields as `Date`, so it supports only `dateType: 'Date'`.)
 */
export type GeneratorDescriptor = {
  run: Generator;
  // `string[]` (not `GeneratorName[]`) so a custom generator may require a built-in or another
  // custom generator by name; built-in descriptors still type-check (their names are strings).
  requires?: string[];
  facades?: Facade[];
  errorModes?: ErrorMode[];
  dateTypes?: DateType[];
};

/**
 * A user-authored generator (the public, experimental plugin contract): a `GeneratorDescriptor`
 * plus a unique `name` used to select it in `generators`, to satisfy other generators' `requires`,
 * and to detect collisions. Authors build one via `defineGenerator` from the
 * `@redocly/client-generator/plugin` entry; the resolver registers it under `name`.
 */
export type CustomGenerator = GeneratorDescriptor & {
  /** Unique name, used in `generators` selection, `requires`, and collision detection. */
  name: string;
};
