import {
  bundle,
  createConfig,
  detectSpec,
  type Config,
  type Oas3Definition,
} from '@redocly/openapi-core';

import type { LoadResult } from './types.js';

export async function loadSpec(ref: string, config?: Config): Promise<LoadResult> {
  const cfg = config ?? (await createConfig({}));
  // We do NOT pass `dereference: true` — the IR builder needs `$ref` preserved so it can map
  // response/parameter schemas back to named `components.schemas` entries.
  // Validation (shape, OpenAPI version) is delegated to `bundle()`, which throws clear messages.
  const result = await bundle({ ref, config: cfg });
  // `bundle()` reports unresolved $refs as problems instead of throwing; generating from such
  // a document emits `/*unresolved*/ any` types that don't compile — fail fast instead.
  const errors = result.problems.filter((problem) => problem.severity === 'error');
  if (errors.length > 0) {
    const details = errors
      .map((problem) => `- ${problem.message} (at ${problem.location?.[0]?.pointer ?? ref})`)
      .join('\n');
    throw new Error(`The API description has ${errors.length} error(s):\n${details}`);
  }
  const parsed = result.bundle.parsed;
  return {
    document: parsed as unknown as Oas3Definition,
    version: detectSpec(parsed),
  };
}
