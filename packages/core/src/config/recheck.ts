import type { RecheckConfig } from '@redocly/config';

import { isPlainObject } from '../utils/is-plain-object.js';

/** The plugin id of Recheck presets in `extends`. A custom plugin cannot use it. */
export const RECHECK_PLUGIN_ID = 'recheck';

export type RecheckRuleEntry = NonNullable<RecheckConfig['rules']>[string];
export type RecheckRules = Record<string, RecheckRuleEntry>;

/** Checks if an `extends` entry is a Recheck preset, such as `recheck/markdown`. */
export function isRecheckPreset(name: string): boolean {
  return name.startsWith(`${RECHECK_PLUGIN_ID}/`);
}

/**
 * Merges one rule entry on top of another. A severity string sets `severity`.
 * An object sets its own keys and merges `assertions` by id.
 * Any other value replaces the entry.
 */
export function mergeRecheckRule(base: unknown, override: unknown): unknown {
  const baseRule = typeof base === 'string' && isPlainObject(override) ? { severity: base } : base;
  if (!isPlainObject(baseRule)) return override;
  if (typeof override === 'string') return { ...baseRule, severity: override };
  if (!isPlainObject(override)) return override;
  const merged: Record<string, unknown> = { ...baseRule, ...override };
  if (isPlainObject(baseRule.assertions) && isPlainObject(override.assertions)) {
    merged.assertions = { ...baseRule.assertions, ...override.assertions };
  }
  return merged;
}

/** Merges `override` on top of `base` by rule key. */
export function mergeRecheckRules(base?: unknown, override?: unknown): RecheckRules {
  const merged: Record<string, unknown> = isPlainObject(base) ? { ...base } : {};
  if (isPlainObject(override)) {
    for (const [key, entry] of Object.entries(override)) {
      merged[key] = mergeRecheckRule(merged[key], entry);
    }
  }
  return merged as RecheckRules;
}

/**
 * Merges one `recheck` block on top of another: `rules` by rule key, other keys
 * are replaced. If the override is not an object, it replaces the block so the
 * engine can report the wrong type.
 */
export function mergeRecheckBlocks(base: RecheckConfig, override: unknown): RecheckConfig {
  if (!isPlainObject(base)) return base;
  if (override === undefined || override === null) return base;
  if (!isPlainObject(override)) return override as RecheckConfig;
  const { rules, ...settings } = override;
  return { ...base, ...settings, rules: mergeRecheckRules(base.rules, rules) };
}
