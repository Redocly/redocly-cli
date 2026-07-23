import {
  BaseResolver,
  bundle,
  createConfig,
  detectSpec,
  lintDocument,
  type Config,
  type NormalizedProblem,
  type Oas3Definition,
} from '@redocly/openapi-core';

import type { LoadResult } from './types.js';

export async function loadSpec(ref: string, config?: Config): Promise<LoadResult> {
  const cfg = config ?? (await createConfig({}));
  // We do NOT pass `dereference: true` — the IR builder needs `$ref` preserved so it can map
  // response/parameter schemas back to named `components.schemas` entries.
  // Validation (shape, OpenAPI version) is delegated to `bundle()`, which throws clear messages.
  const result = await bundle({ ref, config: cfg });
  // `bundle()` reports unresolved $refs as problems instead of throwing, and runs NO
  // validation rules — a structurally invalid document bundles with zero problems.
  // Generating from either emits code that doesn't compile (or crashes the builder), so
  // gate on both: the bundler's own problems plus a `struct` pass over the bundled
  // document. The gate is deliberately independent of the user's lint config — their
  // rules govern `redocly lint`, not whether the generator can trust its input.
  const structConfig = await createConfig({ rules: { struct: 'error' } });
  const structProblems = await lintDocument({
    externalRefResolver: new BaseResolver(),
    document: result.bundle,
    config: structConfig,
  });
  const errors = [...result.problems, ...structProblems].filter(
    (problem) => problem.severity === 'error'
  );
  if (errors.length > 0) {
    const details = errors
      .map(
        (problem: NormalizedProblem) =>
          `- ${problem.message} (at ${problem.location?.[0]?.pointer ?? ref})`
      )
      .join('\n');
    throw new Error(`The API description has ${errors.length} error(s):\n${details}`);
  }
  const parsed = result.bundle.parsed;
  return {
    document: parsed as unknown as Oas3Definition,
    version: detectSpec(parsed),
  };
}
