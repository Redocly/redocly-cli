// Built-in generator METADATA — importable without loading any emitter (and so
// without loading `typescript`). The pipeline validates selections against this
// table and dynamic-imports only the generators actually selected; the sync
// `/generate` registry in index.ts derives from it, so the metadata has one home.

import type { EmitOptions } from '../emitters/emit-options.js';
import { NotSupportedError } from '../errors.js';
import type { GeneratorDescriptor, GeneratorName } from './types.js';

export type BuiltinMeta = Omit<GeneratorDescriptor, 'run' | 'sample'> & {
  load: () => Promise<Pick<GeneratorDescriptor, 'run' | 'sample'>>;
};

function tanstackQuery(framework: 'react' | 'vue' | 'svelte' | 'solid'): BuiltinMeta {
  return {
    requires: ['sdk'],
    errorModes: ['throw'],
    load: () =>
      import('./tanstack-query.js').then((m) => ({ run: m.tanstackQueryGenerator(framework) })),
  };
}

export const BUILTIN_META: Record<GeneratorName, BuiltinMeta> = {
  // sdk is the base client; zod emits a standalone schema module importing nothing from it.
  sdk: {
    load: () => import('./sdk.js').then((m) => ({ run: m.sdkGenerator, sample: m.sdkSample })),
  },
  zod: { load: () => import('./zod.js').then((m) => ({ run: m.zodGenerator })) },
  // transformers import the schema *types* from the sdk entry module (so sdk must run) and
  // assign `Date` values to those fields, which only type-checks when the sdk types dates as `Date`.
  transformers: {
    requires: ['sdk'],
    dateTypes: ['Date'],
    load: () => import('./transformers.js').then((m) => ({ run: m.transformersGenerator })),
  },
  // tanstack-query wraps the sdk's exported, throw-mode operation functions — present in
  // both runtime distributions, so no runtime restriction. The framework variants differ
  // only in the `@tanstack/<framework>-query` import; the bare name means React.
  'tanstack-query': tanstackQuery('react'),
  'tanstack-query-vue': tanstackQuery('vue'),
  'tanstack-query-svelte': tanstackQuery('svelte'),
  'tanstack-query-solid': tanstackQuery('solid'),
  // swr wraps the sdk's exported, throw-mode operation functions as SWR hooks.
  swr: {
    requires: ['sdk'],
    errorModes: ['throw'],
    load: () => import('./swr.js').then((m) => ({ run: m.swrGenerator })),
  },
  // mock emits a standalone MSW handlers/factories module referencing the sdk's types.
  mock: {
    requires: ['sdk'],
    load: () => import('./mock.js').then((m) => ({ run: m.mockGenerator })),
  },
  // python emits a standalone full Python SDK (httpx) — no TypeScript involved,
  // so a python-only selection never loads the `typescript` package.
  python: {
    load: () =>
      import('./python.js').then((m) => ({ run: m.pythonGenerator, sample: m.pythonSample })),
  },
};

/**
 * Validate a generator selection against every selected generator's declared
 * contract, throwing the first violation with an actionable message. Runs before
 * any file is produced so an incompatible combination never reaches the printer.
 * Works on metadata alone — the `run` field is never touched.
 */
export function validateSelection(
  names: string[],
  emit: EmitOptions,
  registry: Map<string, Omit<GeneratorDescriptor, 'run'> | GeneratorDescriptor>
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
