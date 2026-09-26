import type { RecheckRules } from '../../types/index.js';
import type { RecheckBlock } from '../public.js';
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

const PRESET_PREFIX = 'recheck/';

// The same presets keyed by bare name, each as a config with a `recheck`
// block. Core registers them as the configs of its built-in `recheck` plugin.
export const presetConfigs: Record<string, { recheck: RecheckBlock }> = Object.fromEntries(
  Object.entries(presets).map(([id, rules]) => [
    id.slice(PRESET_PREFIX.length),
    { recheck: { rules } },
  ])
);

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
