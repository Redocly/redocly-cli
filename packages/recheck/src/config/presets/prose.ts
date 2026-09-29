import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/prose`: a small set of prose rules, all at `warn`. Use it with
 * `recheck/markdown` to replace a markdownlint plus Vale setup.
 *
 * - `repetition` flags an adjacent repeated word.
 * - `consistency` requires one spelling per file for four British/American pairs.
 * - `capitalization` checks headings for sentence case, without auto-fix.
 *
 * `occurrence`, `conditional`, `metric` and `spelling` are opt-in, because
 * their settings depend on the project.
 */
/**
 * Prose-only scope. Without it these rules would run on the whole file,
 * and `--fix` could rewrite code samples or front matter.
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

  // Sentence case, because the Redocly, Google and Microsoft style guides all use it for headings.
  // `fix: false` because sentence-case auto-fix lowercases proper nouns that
  // are not in the built-in vocabulary or the user's `exceptions`.
  // `capitalization` already adds its built-in proper nouns to `exceptions`,
  // so the preset does not list any.
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
