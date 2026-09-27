import type { RecheckConfig } from '@redocly/config';

import { isPlainObject } from '../utils/is-plain-object.js';

/** The plugin id that Recheck presets use in `extends`; a custom plugin cannot take it. */
export const RECHECK_PLUGIN_ID = 'recheck';

/** A rule entry of the `recheck` block: a severity string or a rule object. */
export type RecheckRuleEntry = NonNullable<RecheckConfig['rules']>[string];
export type RecheckRules = Record<string, RecheckRuleEntry>;

/** True for an `extends` entry that names a Recheck preset, such as `recheck/markdown`. */
export function isRecheckPreset(name: string): boolean {
  return name.startsWith(`${RECHECK_PLUGIN_ID}/`);
}

/**
 * Merges one rule entry on top of another. A severity string sets `severity`;
 * an object sets its own keys and merges `assertions` per assertion id; any
 * other value replaces the entry. The inputs do not change.
 */
export function mergeRecheckRule(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base)) return override;
  if (typeof override === 'string') return { ...base, severity: override };
  if (!isPlainObject(override)) return override;
  const merged: Record<string, unknown> = { ...base, ...override };
  if (isPlainObject(base.assertions) && isPlainObject(override.assertions)) {
    merged.assertions = { ...base.assertions, ...override.assertions };
  }
  return merged;
}

/** Merges `override` on top of `base` by rule key. The inputs do not change. */
export function mergeRecheckRules(base?: unknown, override?: unknown): RecheckRules {
  const merged: Record<string, unknown> = isPlainObject(base) ? { ...base } : {};
  if (isPlainObject(override)) {
    for (const [key, entry] of Object.entries(override)) {
      merged[key] = mergeRecheckRule(merged[key], entry);
    }
  }
  // Both maps hold the rule entries of a `recheck` block.
  return merged as RecheckRules;
}

/**
 * Merges one `recheck` block on top of another: `rules` by rule key, the other
 * keys assigned. A block that is not an object comes back as it is, so the
 * engine reports the wrong type. The inputs do not change.
 */
export function mergeRecheckBlocks(base: RecheckConfig, override: unknown): RecheckConfig {
  if (override === undefined || override === null) return base;
  if (!isPlainObject(override)) return override as RecheckConfig;
  const { rules, ...settings } = override;
  return { ...base, ...settings, rules: mergeRecheckRules(base.rules, rules) };
}
