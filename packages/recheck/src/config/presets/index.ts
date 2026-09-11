import type { BaseRule, RecheckRules, ValidationError } from '../../types/index.js';
import { buildApiDescriptionsPreset } from './api-descriptions.js';
import { buildGooglePreset } from './google.js';
import { buildInclusiveLanguagePreset } from './inclusive-language.js';
import { buildMarkdocPreset } from './markdoc.js';
import { buildMarkdownRelaxedPreset } from './markdown-relaxed.js';
import { buildMarkdownPreset } from './markdown.js';
import { buildMicrosoftPreset } from './microsoft.js';
import { buildMinimalPreset } from './minimal.js';
import { buildPlainLanguagePreset } from './plain-language.js';
import { buildProsePreset } from './prose.js';
import { buildTechnicalEnglishPreset } from './technical-english.js';

/**
 * Registered `extends` presets, keyed by their `recheck/<name>` id (the
 * same string users write under `extends:` in config). Built once at
 * module load — cheap, pure functions of the (currently empty-until-later
 * -batches) rule registration lists in markdown.ts/minimal.ts/prose.ts.
 *
 * `recheck/inclusive-language` and `recheck/plain-language` (Task 11 of
 * Phase 4) are the two composable presets: they carry no structural rules
 * of their own and are meant to layer onto a flagship
 * (`recheck/google`/`recheck/microsoft`) or onto `recheck/prose` via a
 * multi-entry `extends` list, not to be used alone.
 */
export const presets: Record<string, RecheckRules> = {
  'recheck/markdown': buildMarkdownPreset(),
  'recheck/markdown-relaxed': buildMarkdownRelaxedPreset(),
  'recheck/minimal': buildMinimalPreset(),
  'recheck/prose': buildProsePreset(),
  'recheck/markdoc': buildMarkdocPreset(),
  'recheck/google': buildGooglePreset(),
  'recheck/microsoft': buildMicrosoftPreset(),
  'recheck/inclusive-language': buildInclusiveLanguagePreset(),
  'recheck/plain-language': buildPlainLanguagePreset(),
  'recheck/technical-english': buildTechnicalEnglishPreset(),
  'recheck/api-descriptions': buildApiDescriptionsPreset(),
};

/**
 * Documented, monorepo-wide opt-in scope-rule assertions -- native
 * scope-rule assertions (see rules/registry.ts's `scopeRules`) that exist
 * but are deliberately NOT shipped by any preset, because their
 * thresholds, patterns, or dictionaries are inherently project-specific
 * rather than having one right-for-everyone default. Each has a
 * copy-paste README snippet under "Opt-in prose assertions"
 * (readme-prose-opt-ins.test.ts verifies the snippet against this list).
 *
 * This used to be `prose.ts`'s `PROSE_OPT_IN_ASSERTIONS` (5 entries,
 * including `length`) back when `recheck/prose` was the only preset
 * shipping any native scope-rule assertions at all. `recheck/google` now
 * ships `length` (via `google/sentence-length`, spec §5.6's Google-stated
 * "fewer than 26 words per sentence" rule) and `capitalization` (already
 * accounted for via `recheck/prose`), so `length` moved from this list to
 * "shipped in a preset" -- see presets.test.ts's registry<->preset
 * completeness suite, which now checks "shipped in ANY preset" (via
 * `assertionIdsShippedInAnyPreset()`) against this list, not a
 * single-preset-named constant. cross-task-constraints.md §C and
 * task-9-10-resolutions.md §5 record why this moved and why the two
 * constants are no longer filed under a prose-specific name.
 *
 * Task 10: `recheck/microsoft` ships `occurrence` too (via
 * `microsoft/comma-density`, the guide's own "more than a comma or two"
 * sentence-complexity rule), so `occurrence` moves out of this list the
 * same way `length` did -- it now has a real, guide-sourced default
 * (`max: 2`), so it is no longer "no one right answer for everyone".
 * `conditional` and `metric` remain opt-in: `conditional` because the
 * only candidate use (acronym first-mention expansion, spec C21) needs a
 * project-specific list of acronym/expansion pairs the guide itself
 * doesn't provide, and carries three undocumented carve-outs in the draft
 * research; `metric` because Microsoft's guide publishes no readability
 * formula or threshold at all (see microsoft.ts's file header).
 */
export const DOCUMENTED_OPT_IN_ASSERTIONS = ['conditional', 'metric', 'spelling'] as const;

/**
 * Deep-merges a user rule entry on top of a preset rule entry for the same
 * rule key: severity/message/fix are shallow-overridden when the user sets
 * them; `assertions` is merged per assertion id (user options for a given
 * assertion id replace that assertion's preset options entirely, but other
 * preset assertion ids/options are preserved).
 */
function mergeRule(presetRule: BaseRule, userRule: Partial<BaseRule>): BaseRule {
  const merged: BaseRule = { ...presetRule, ...userRule };

  if (userRule.assertions) {
    merged.assertions = { ...presetRule.assertions, ...userRule.assertions };
  }

  return merged;
}

/**
 * Resolves the `extends` key of a raw config object into a fully merged
 * `RecheckRules`: presets are applied in listed order (later presets'
 * rule keys override earlier ones, same per-rule merge as user overrides),
 * then the user's own rule keys are merged on top by rule key. The
 * `extends` key itself is stripped from the result — it is not a rule and
 * must not reach schema/semantic rule validation.
 *
 * Unknown preset names produce a ValidationError (naming the preset) and
 * do not throw — this matches the rest of the load-time validation
 * pipeline, which collects errors into `result.errors` rather than
 * throwing on bad user input.
 */
export function resolveExtends(config: Record<string, unknown>): {
  config: RecheckRules;
  errors: ValidationError[];
} {
  const { extends: extendsList, ...rest } = config;
  const userRules = rest as RecheckRules;

  if (extendsList === undefined) {
    return { config: userRules, errors: [] };
  }

  // Validate `extends` shape before attempting resolution
  if (!Array.isArray(extendsList)) {
    return {
      config: userRules,
      errors: [
        {
          message: '"extends" must be an array of preset names',
          path: 'extends',
          value: extendsList,
        },
      ],
    };
  }

  const errors: ValidationError[] = [];

  let merged: RecheckRules = {};
  for (const name of extendsList) {
    const preset = presets[name as string];
    if (!preset) {
      errors.push({
        message: `Unknown preset "${name}" in "extends" — expected one of: ${Object.keys(presets).join(', ')}`,
        path: 'extends',
        value: name,
      });
      continue;
    }
    for (const [ruleKey, presetRule] of Object.entries(preset)) {
      // Deep-copy the preset rule to prevent AJV mutations from polluting the shared registry
      const ruleCopy = structuredClone(presetRule);
      merged[ruleKey] = merged[ruleKey] ? mergeRule(merged[ruleKey], ruleCopy) : ruleCopy;
    }
  }

  for (const [ruleKey, userRule] of Object.entries(userRules)) {
    merged[ruleKey] = merged[ruleKey] ? mergeRule(merged[ruleKey], userRule) : userRule;
  }

  return { config: merged, errors };
}
