import type { EmitOptions } from '../emitters/emit-options.js';
import { NotSupportedError } from '../errors.js';
import { mockGenerator } from './mock.js';
import { sdkGenerator } from './sdk.js';
import { swrGenerator } from './swr.js';
import { tanstackQueryGenerator } from './tanstack-query.js';
import { transformersGenerator } from './transformers.js';
import type { GeneratorDescriptor, GeneratorName } from './types.js';
import { zodGenerator } from './zod.js';

export type {
  CustomGenerator,
  Generator,
  GeneratorDescriptor,
  GeneratorInput,
  GeneratorName,
} from './types.js';

function tanstackQuery(framework: 'react' | 'vue' | 'svelte' | 'solid'): GeneratorDescriptor {
  return { run: tanstackQueryGenerator(framework), requires: ['sdk'], errorModes: ['throw'] };
}

const GENERATORS: Record<GeneratorName, GeneratorDescriptor> = {
  // sdk is the base client; zod emits a standalone schema module importing nothing from it.
  sdk: { run: sdkGenerator },
  zod: { run: zodGenerator },
  // transformers import the schema *types* from the sdk entry module (so sdk must run) and
  // assign `Date` values to those fields, which only type-checks when the sdk types dates as `Date`.
  transformers: { run: transformersGenerator, requires: ['sdk'], dateTypes: ['Date'] },
  // tanstack-query wraps the sdk's exported, throw-mode operation functions — present in
  // both runtime distributions, so no runtime restriction. The framework variants differ
  // only in the `@tanstack/<framework>-query` import; the bare name means React.
  'tanstack-query': tanstackQuery('react'),
  'tanstack-query-vue': tanstackQuery('vue'),
  'tanstack-query-svelte': tanstackQuery('svelte'),
  'tanstack-query-solid': tanstackQuery('solid'),
  // swr wraps the sdk's exported, throw-mode operation functions as SWR hooks.
  swr: { run: swrGenerator, requires: ['sdk'], errorModes: ['throw'] },
  // mock emits a standalone MSW handlers/factories module referencing the sdk's types.
  mock: { run: mockGenerator, requires: ['sdk'] },
};

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
  registry: Map<string, GeneratorDescriptor> = builtinGenerators()
): void {
  const selected = new Set(names);
  const errorMode = emit.errorMode ?? 'throw';
  const dateType = emit.dateType ?? 'string';
  const runtime = emit.runtime ?? 'inline';
  for (const name of names) {
    const descriptor = registry.get(name);
    if (!descriptor) {
      throw new NotSupportedError(`Unknown generator: ${name}`);
    }
    for (const required of descriptor.requires ?? []) {
      if (!selected.has(required)) {
        const fixed = [...new Set([required, ...names])].map((g) => `--generator ${g}`).join(' ');
        throw new NotSupportedError(
          `The "${name}" generator requires the "${required}" generator. Add it, e.g. ${fixed}.`
        );
      }
    }
    if (descriptor.errorModes && !descriptor.errorModes.includes(errorMode)) {
      throw new NotSupportedError(
        `The "${name}" generator does not support --error-mode "${errorMode}" (supported: ${descriptor.errorModes.join(', ')}).`
      );
    }
    if (descriptor.dateTypes && !descriptor.dateTypes.includes(dateType)) {
      throw new NotSupportedError(
        `The "${name}" generator requires --date-type ${descriptor.dateTypes.join(' or ')} (got "${dateType}") so the runtime values match the generated types.`
      );
    }
    if (descriptor.runtimes && !descriptor.runtimes.includes(runtime)) {
      throw new NotSupportedError(
        `The "${name}" generator does not support runtime "${runtime}" (supported: ${descriptor.runtimes.join(', ')}).`
      );
    }
  }
}
