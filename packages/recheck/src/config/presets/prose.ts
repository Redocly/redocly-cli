import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/prose` — the Vale-parity counterpart to `recheck/markdown`:
 * `extends: [recheck/markdown, recheck/prose]` is the README-documented
 * one-liner that replaces a markdownlint + Vale combo with one config.
 *
 * A deliberately small, high-signal set, all at `severity: warn` (prose
 * suggestions, not structural violations):
 *
 * - `repetition` — default options, flags an adjacent repeated word.
 * - `consistency` — internal consistency (first-seen wins) for four common
 *   British/American variant pairs, with `ignoreCase: true` so a
 *   sentence-initial "Colour" still counts. Deliberately not a `swap`-style
 *   fixed-spelling list — `consistency` only requires the file be
 *   internally consistent, the gentler default.
 * - `capitalization` — `$sentence`, scoped to `heading` only, with
 *   `fix: false` (see the `capitalization` rule below). No preset-level
 *   `exceptions` list: `TECHNICAL_PROPER_NOUNS` (`../../data/proper-nouns.ts`,
 *   Task 8 of this phase) is unioned in by default by the `capitalization`
 *   rule itself (rules/scope/capitalization.ts), so the preset inherits the
 *   built-in vocabulary instead of shipping its own copy — this also
 *   dissolves the ergonomic wart the Phase 3 version of this list had: a
 *   user's own `exceptions` on a preset-configured rule *replaces* the
 *   preset's list (see the README's `extends` merge semantics), so a
 *   preset-shipped list and built-ins unioned by the rule are not the same
 *   guarantee — only the latter survives a user override.
 *
 * Scope rules have no `defaults.message` to derive a message from (see
 * markdown.ts's doc comment), so each entry sets its own explicit
 * `message`, matching the assertion module's own fallback string exactly
 * so the two never drift apart.
 *
 * `occurrence`, `conditional`, `metric`, and `spelling` are documented
 * opt-ins instead (see the README's "Opt-in prose assertions") — their
 * thresholds or external peer dependencies are inherently project-specific.
 * `DOCUMENTED_OPT_IN_ASSERTIONS` (presets/index.ts) is the source of truth
 * the registry<->preset completeness test (config/__tests__/presets.test.ts)
 * checks against: every scope-rule assertion must be shipped in some
 * preset (any preset, not just this one) or be in that list — never
 * neither, never both.
 *
 * `length` used to be a fifth entry here (an opt-in, not a preset default,
 * because it has no default bounds and requires a `unit` -- see
 * rules/scope/length.ts). `recheck/google` now ships it directly (see
 * `google/sentence-length`, spec §5.6's "fewer than 26 words per sentence"
 * rule), so it moved out of the opt-in list entirely -- see
 * `DOCUMENTED_OPT_IN_ASSERTIONS`'s own doc comment in presets/index.ts and
 * cross-task-constraints.md §C / task-9-10-resolutions.md §5 for why.
 */
export const PROSE_PRESET_ASSERTIONS = ['repetition', 'consistency', 'capitalization'] as const;

/**
 * Shared scope for the preset's `repetition`/`consistency` rules: `summary`
 * is the canonical all-prose scope — paragraph, heading (all levels),
 * list-item, blockquote, and table header/body cell text (see
 * scopes/extractor.ts). Without an explicit scope these would default to
 * `all` (the whole raw file), and a `--fix` run could rewrite code samples
 * or frontmatter — "never rewrites code samples" is part of the preset's
 * README contract; code and frontmatter are not summary sources.
 */
const PROSE_SCOPE = 'summary';

export function buildProsePreset(): RecheckRules {
  const repetition: BaseRule = {
    severity: 'warn',
    scope: PROSE_SCOPE,
    message: 'Repeated word "%s".',
    assertions: { repetition: {} },
  };

  const consistency: BaseRule = {
    severity: 'warn',
    scope: PROSE_SCOPE,
    message: 'Inconsistent spelling: "%s" conflicts with first-seen "%s".',
    assertions: {
      consistency: {
        either: {
          behavior: 'behaviour',
          color: 'colour',
          license: 'licence',
          organize: 'organise',
        },
        ignoreCase: true,
      },
    },
  };

  // SENTENCE case, not AP title case (changed from `$title` + `style: 'ap'`
  // by product decision 2026-07-29: Redocly's own documentation style guide,
  // this repo's CLAUDE.md, Google's developer documentation style guide, and
  // Microsoft's writing style guide all mandate sentence case for headings —
  // AP title case was the outlier).
  //
  // No `style` key: applyDollarStyle in rules/scope/capitalization.ts only
  // reads `style` inside its `$title` branch, so alongside `$sentence` it
  // would be dead config (the README already documents it as a no-op for
  // every other `match`).
  //
  // `fix: false` (the per-rule auto-fix opt-out the runner honors as
  // `rule.fix !== false`, see core/runner.ts) even though `capitalization`
  // is registered `fixable` for the four `$`-styles: a sentence-case
  // auto-fix lowercases any proper noun the built-in vocabulary (see below)
  // and the user's own `exceptions` don't cover, so enabling it out of the
  // box would silently damage content the moment a project's vocabulary
  // went beyond that. Users turn fixes on (`fix: true`, or just drop this
  // key) once their exceptions list covers their own vocabulary.
  //
  // No `exceptions` key here (Task 8 of this phase; Phase 3 shipped a
  // 38-entry starter list directly on this rule): `capitalization` itself
  // now unions `TECHNICAL_PROPER_NOUNS` (../../data/proper-nouns.ts) into
  // `exceptions` by default (rules/scope/capitalization.ts's `collectSites`),
  // so this preset inherits that protection instead of shipping its own
  // copy of the vocabulary — one copy of the list for the whole package,
  // and it survives a user's own `exceptions` override on this rule key
  // (which would otherwise REPLACE a preset-shipped list entirely, per the
  // README's `extends` merge semantics — see proper-nouns.ts's header
  // comment for why the two are not the same guarantee). Only a handful of
  // entries don't qualify for the built-in vocabulary's inclusion bar (the
  // ALL-CAPS `JWT`/`YAML`; `Realm`/`Replay`/`Respect`/`Node`; and, per the
  // final-review fix wave's audit, `Chrome`/`Markdown`/`Postman`/`Prettier`/
  // `Safari`/`Swagger`/`Windows` — each a real ordinary English word — see
  // proper-nouns.ts's header comment for why) and are no longer protected by
  // this preset by default; ordinary Title-Case brand names like `Redocly`
  // and `Kubernetes` DO qualify as of the Task 8 fix wave (see
  // task-8-report.md) and are covered. A project relying on one of the
  // excluded entries adds it back via its own `exceptions` list on this rule
  // key, same as any other project-specific vocabulary.
  const capitalization: BaseRule = {
    severity: 'warn',
    scope: 'heading',
    fix: false,
    message: '"%s" should use %s capitalization.',
    assertions: {
      capitalization: { match: '$sentence' },
    },
  };

  return {
    'recheck/repetition': repetition,
    'recheck/consistency': consistency,
    'recheck/capitalization': capitalization,
  };
}
