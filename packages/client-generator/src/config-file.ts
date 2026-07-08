// packages/client-generator/src/config-file.ts
import type { Config } from './config.js';

/**
 * Merge a base config (a `redocly.yaml` `client` block) with CLI overrides.
 * Defined keys in `overrides` win; `undefined` override values are ignored
 * so absent flags don't clobber the base values.
 */
export function mergeConfig(base: Partial<Config>, overrides: Partial<Config>): Partial<Config> {
  const merged: Partial<Config> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  // `pagination` is the one nested block: a partial override (e.g. a per-API `operations`
  // map alone) must layer onto the shared convention fields, not replace the whole object.
  if (base.pagination && overrides.pagination) {
    merged.pagination = { ...base.pagination, ...overrides.pagination };
    if (base.pagination.operations || overrides.pagination.operations) {
      merged.pagination.operations = {
        ...base.pagination.operations,
        ...overrides.pagination.operations,
      };
    }
  }
  return merged;
}
