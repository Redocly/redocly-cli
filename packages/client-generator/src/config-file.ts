import type { GenerateClientConfig } from './types.js';

/**
 * Merge a base config (a `redocly.yaml` `client` block) with CLI overrides.
 * Defined keys in `overrides` win; `undefined` override values are ignored
 * so absent flags don't clobber the base values.
 */
export function mergeConfig(
  base: GenerateClientConfig,
  overrides: GenerateClientConfig
): GenerateClientConfig {
  const merged: GenerateClientConfig = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}
