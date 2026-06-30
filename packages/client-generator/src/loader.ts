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
  const parsed = result.bundle.parsed;
  return {
    document: parsed as unknown as Oas3Definition,
    version: detectSpec(parsed),
    // The entry plus every external `$ref` target the resolver read (absolute fs paths;
    // remote refs appear as URLs).
    fileDependencies: result.fileDependencies,
  };
}
