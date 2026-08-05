import type { EmitOptions } from '../emitters/emit-options.js';
import { cliGenerator, cliSample } from './cli.js';
import { goGenerator, goSample } from './go/index.js';
import { BUILTIN_META, validateSelection, type BuiltinMeta } from './meta.js';
import { mockGenerator } from './mock.js';
import { phpGenerator, phpSample } from './php/index.js';
import { pythonGenerator, pythonSample } from './python/index.js';
import { sdkGenerator, sdkSample } from './sdk.js';
import { swrGenerator } from './swr.js';
import { tanstackQueryGenerator } from './tanstack-query.js';
import { transformersGenerator } from './transformers.js';
import type { GeneratorDescriptor, GeneratorName, OutputMode } from './types.js';
import { zodGenerator } from './zod.js';

export type {
  CustomGenerator,
  Generator,
  GeneratorDescriptor,
  GeneratorInput,
  GeneratorName,
} from './types.js';

// The sync registry for the `/generate` toolkit entry (which loads the emitters
// statically anyway). Compatibility metadata lives in BUILTIN_META — one home;
// only the eagerly imported `run` functions live here. The pipeline entry never
// touches this module: it loads built-ins lazily through the meta table.
const RUNS: Record<GeneratorName, Pick<GeneratorDescriptor, 'run' | 'sample'>> = {
  sdk: { run: sdkGenerator, sample: sdkSample },
  zod: { run: zodGenerator },
  transformers: { run: transformersGenerator },
  'tanstack-query': { run: tanstackQueryGenerator('react') },
  'tanstack-query-vue': { run: tanstackQueryGenerator('vue') },
  'tanstack-query-svelte': { run: tanstackQueryGenerator('svelte') },
  'tanstack-query-solid': { run: tanstackQueryGenerator('solid') },
  swr: { run: swrGenerator },
  mock: { run: mockGenerator },
  cli: { run: cliGenerator, sample: cliSample },
  python: { run: pythonGenerator, sample: pythonSample },
  go: { run: goGenerator, sample: goSample },
  php: { run: phpGenerator, sample: phpSample },
};

const GENERATORS = Object.fromEntries(
  (Object.entries(BUILTIN_META) as [GeneratorName, BuiltinMeta][]).map(
    ([name, { load: _load, ...meta }]) => [name, { ...meta, ...RUNS[name] }]
  )
) as Record<GeneratorName, GeneratorDescriptor>;

/**
 * A fresh registry of the built-in generators keyed by name. The plugin resolver seeds from this
 * and adds custom generators to the copy, so mutating the result never affects the built-in table.
 */
export function builtinGenerators(): Map<string, GeneratorDescriptor> {
  return new Map(Object.entries(GENERATORS));
}

/**
 * Validate a generator selection against every selected generator's declared
 * contract, throwing the first violation with an actionable message. Runs before
 * any file is produced so an incompatible combination never reaches the printer.
 */
export function validateGenerators(
  names: string[],
  emit: EmitOptions,
  registry: Map<string, GeneratorDescriptor> = builtinGenerators(),
  outputMode?: OutputMode
): void {
  validateSelection(names, emit, registry, outputMode);
}
