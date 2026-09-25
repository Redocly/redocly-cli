import type { MarkdocUserConfig } from '../parser/markdoc/schema.js';
import type { BaseRule, RuleSeverity } from '../types/rules.js';
import { isPlainObject } from '../utils/is-plain-object.js';

// This file is the `@redocly/recheck/config` entry. Core loads it for every
// config, so it must not import the parser, the rules, or the metrics.

export type RecheckRuleInput = RuleSeverity | Partial<BaseRule>;
export type RecheckRulesInput = Record<string, RecheckRuleInput>;

// The `recheck` block of redocly.yaml, before the engine validates it.
export interface RecheckBlock {
  rules?: RecheckRulesInput;
  excludes?: string[];
  markdoc?: boolean | MarkdocUserConfig;
  apiDescriptions?: { rules?: RecheckRulesInput };
}

// A severity string sets `severity`; an object sets its own keys; `assertions`
// merge per assertion id.
export function mergeRuleEntry(
  base: Partial<BaseRule>,
  override: RecheckRuleInput
): Partial<BaseRule> {
  const patch = typeof override === 'string' ? { severity: override } : override;
  const merged: Partial<BaseRule> = { ...base, ...patch };
  if (patch.assertions) {
    merged.assertions = { ...base.assertions, ...patch.assertions };
  }
  return merged;
}

// Merges `override` on top of `base` by rule key. Neither input changes.
export function mergeRecheckRules(
  base: RecheckRulesInput = {},
  override: RecheckRulesInput = {}
): RecheckRulesInput {
  const merged: RecheckRulesInput = { ...base };
  for (const [key, entry] of Object.entries(override)) {
    // The input is unvalidated YAML, so an entry can hold any value, such as null.
    const current: unknown = merged[key];
    const next: unknown = entry;
    const canMerge = typeof next === 'string' || isPlainObject(next);
    merged[key] =
      isPlainObject<Partial<BaseRule>>(current) && canMerge
        ? mergeRuleEntry(current, entry)
        : entry;
  }
  return merged;
}
