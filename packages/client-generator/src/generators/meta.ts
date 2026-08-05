// Built-in generator METADATA — importable without loading any emitter (and so
// without loading `typescript`). The pipeline validates selections against this
// table and dynamic-imports only the generators actually selected; the sync
// `/generate` registry in index.ts derives from it, so the metadata has one home.

import { logger } from '@redocly/openapi-core';

import type { EmitOptions } from '../emitters/emit-options.js';
import { NotSupportedError } from '../errors.js';
import type { GeneratorDescriptor, GeneratorName, OutputMode } from './types.js';

export type BuiltinMeta = Omit<GeneratorDescriptor, 'run' | 'sample'> & {
  load: () => Promise<Pick<GeneratorDescriptor, 'run' | 'sample'>>;
};

function tanstackQuery(framework: 'react' | 'vue' | 'svelte' | 'solid'): BuiltinMeta {
  return {
    requires: ['sdk'],
    errorModes: ['throw'],
    load: () =>
      import('./tanstack-query/index.js').then((m) => ({
        run: m.tanstackQueryGenerator(framework),
      })),
  };
}

/**
 * The TypeScript-only knobs a standalone language SDK cannot apply: it always emits
 * one self-contained file with the runtime embedded, and each language passes inputs
 * its own idiomatic way (keyword arguments, named arguments, a params struct).
 */
const LANGUAGE_SDK_NOT_APPLICABLE: BuiltinMeta['notApplicable'] = {
  outputMode: 'it always emits one self-contained file',
  runtime: 'the runtime is always embedded in the generated file',
  argsStyle: "inputs follow the target language's own idiom",
  importExt: 'the generated file has no relative imports',
};

export const BUILTIN_META: Record<GeneratorName, BuiltinMeta> = {
  // sdk is the base client; zod emits a standalone schema module importing nothing from it.
  sdk: {
    load: () =>
      import('./sdk/index.js').then((m) => ({ run: m.sdkGenerator, sample: m.sdkSample })),
  },
  zod: { load: () => import('./zod/index.js').then((m) => ({ run: m.zodGenerator })) },
  // transformers import the schema *types* from the sdk entry module (so sdk must run) and
  // assign `Date` values to those fields, which only type-checks when the sdk types dates as `Date`.
  transformers: {
    requires: ['sdk'],
    dateTypes: ['Date'],
    load: () => import('./transformers/index.js').then((m) => ({ run: m.transformersGenerator })),
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
    load: () => import('./swr/index.js').then((m) => ({ run: m.swrGenerator })),
  },
  // mock emits a standalone MSW handlers/factories module referencing the sdk's types.
  mock: {
    requires: ['sdk'],
    load: () => import('./mock/index.js').then((m) => ({ run: m.mockGenerator })),
  },
  // cli dispatches through the sdk's instance client and relies on thrown ApiError
  // for its exit-code mapping, so it is sdk-bound and throw-only.
  // Validation is part of the CLI's contract (exit code 3), so it requires `zod` —
  // the pipeline pulls prerequisites in, so `--generator cli` alone is enough.
  cli: {
    requires: ['sdk', 'zod'],
    errorModes: ['throw'],
    load: () =>
      import('./cli/index.js').then((m) => ({ run: m.cliGenerator, sample: m.cliSample })),
  },
  // python emits a standalone full Python SDK (httpx) — no TypeScript involved,
  // so a python-only selection never loads the `typescript` package.
  python: {
    notApplicable: LANGUAGE_SDK_NOT_APPLICABLE,
    load: () =>
      import('./python/index.js').then((m) => ({ run: m.pythonGenerator, sample: m.pythonSample })),
  },
  // go emits a standalone full Go SDK (stdlib-only) — no TypeScript involved.
  // `(T, error)` returns ARE its error mode, so `result` has no Go rendering.
  go: {
    errorModes: ['throw'],
    notApplicable: LANGUAGE_SDK_NOT_APPLICABLE,
    load: () => import('./go/index.js').then((m) => ({ run: m.goGenerator, sample: m.goSample })),
  },
  // php emits a standalone full PHP SDK (curl extension) — no TypeScript involved.
  // Exceptions ARE its error mode, so `result` has no PHP rendering.
  php: {
    errorModes: ['throw'],
    notApplicable: LANGUAGE_SDK_NOT_APPLICABLE,
    load: () =>
      import('./php/index.js').then((m) => ({ run: m.phpGenerator, sample: m.phpSample })),
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
  registry: Map<string, Omit<GeneratorDescriptor, 'run'> | GeneratorDescriptor>,
  // `outputMode` travels beside `emit` in the generator input, so the caller passes it
  // in for the not-applicable check; absent means the caller left it at the default.
  outputMode?: OutputMode
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
    // An option this generator can't apply is announced, not silently dropped. Only an
    // EXPLICIT value warns — defaults would nag every run.
    const chosen: Record<string, unknown> = { ...emit, outputMode };
    for (const [option, reason] of Object.entries(descriptor.notApplicable ?? {})) {
      if (chosen[option] !== undefined) {
        logger.warn(`generate-client: the "${name}" generator ignores ${option} — ${reason}.\n`);
      }
    }
  }
}
