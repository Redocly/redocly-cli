// packages/client-generator/src/config-file.ts
import type { Config } from './config.js';

/**
 * Merge a base config (the `redocly.yaml` `x-client-generator` block) with CLI
 * overrides. Defined keys in `overrides` win; `undefined` override values are ignored
 * so absent flags don't clobber the base values.
 */
export function mergeConfig(base: Partial<Config>, overrides: Partial<Config>): Partial<Config> {
  const merged: Partial<Config> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}
