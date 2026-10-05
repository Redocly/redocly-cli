import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/inclusive-language`: terms that both the Google and Microsoft style
 * guides say to avoid. Add it after `recheck/google`, `recheck/microsoft` or
 * `recheck/prose` in `extends`.
 *
 * Most of these terms are also in the Google or Microsoft preset, so using it
 * with one of them can report the same text twice. See
 * `packages/recheck/presets/inclusive-language/PROVENANCE.md` for the sources
 * and for the terms left out.
 *
 * Messages use the single-word forms `allowlist` and `blocklist`, as Google
 * does. Microsoft prefers `allow list` and `block list`.
 *
 * Rules only report and never fix, because a word swap can break the text.
 */

const GOOGLE_WORD_LIST = 'https://developers.google.com/style/word-list';
const GOOGLE_INCLUSIVE_DOCUMENTATION =
  'https://developers.google.com/style/inclusive-documentation';
const MS_BIAS_FREE = 'https://learn.microsoft.com/en-us/style-guide/bias-free-communication';
const MS_MASTER_SLAVE =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave';
const MS_ACCESSIBILITY_TERMS =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/accessibility-terms';
const MS_AZ_BLACKLIST =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/b/blacklist';
const MS_MILITARISTIC_LANGUAGE =
  'https://learn.microsoft.com/en-us/style-guide/militaristic-language';

function swapRule(opts: {
  pairs: Record<string, string>;
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  wordBoundary?: boolean;
  keysAreRegex?: boolean;
}): BaseRule {
  return {
    severity: 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      swap: {
        pairs: opts.pairs,
        ignoreCase: opts.ignoreCase,
        wordBoundary: opts.wordBoundary,
        keysAreRegex: opts.keysAreRegex,
      },
    },
  };
}

function patternRule(opts: {
  tokens: string[];
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
}): BaseRule {
  return {
    severity: 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      pattern: {
        tokens: opts.tokens,
        ignoreCase: opts.ignoreCase,
      },
    },
  };
}

export function buildInclusiveLanguagePreset(): RecheckRules {
  const rules: RecheckRules = {};

  // Bare "master" is not flagged: it has too many other meanings, such as
  // master's degree or master key.
  rules['inclusive-language/slave'] = swapRule({
    pairs: { slave: 'worker' },
    message:
      'Avoid "%s"; use "%s" or "replica" instead (Google C§3.5 row 2; Microsoft a-z/master-slave agrees the pairing itself must be avoided).',
    link: `${GOOGLE_WORD_LIST}#slave`,
    ignoreCase: true,
    wordBoundary: true,
  });

  // The guides suggest different replacements for "master/slave", so this
  // only reports it and does not swap.
  rules['inclusive-language/master-slave-pairing'] = patternRule({
    tokens: ['\\bmaster\\s*/\\s*slave\\b', '\\bmaster-slave\\b'],
    message:
      'Avoid the "%s" pairing (Google C§3.5 row 1; Microsoft a-z/master-slave); both guides agree to avoid it but recommend different replacements — e.g. "primary/replica" or "primary/subordinate".',
    link: MS_MASTER_SLAVE,
    ignoreCase: true,
  });

  // Only the noun forms are swapped. Verb forms such as "whitelist an address"
  // need a rewrite, and the message says so.
  rules['inclusive-language/blacklist-whitelist'] = swapRule({
    pairs: { blacklist: 'denylist', whitelist: 'allowlist' },
    message:
      'Use "%s" instead of "%s" (Google C§3.5 rows 3-4; Microsoft a-z/blacklist agrees but prefers the two-word "block list"/"allow list" forms — recheck/microsoft ships those). Verb forms need a rewrite, not a word-for-word swap.',
    link: MS_AZ_BLACKLIST,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Does not match the DMZ between North and South Korea.
  rules['inclusive-language/dmz'] = patternRule({
    tokens: [
      '\\bDMZ\\b(?!\\s+(?:dividing|between|separating)\\b)',
      '\\bdemilitarized zone\\b(?!\\s+(?:dividing|between|separating)\\b)',
    ],
    message:
      'Avoid "%s"; use "perimeter network" instead (Google C§3.5 row 26; Microsoft a-z/demilitarized-zone-dmz — both guides recommend the identical replacement).',
    link: MS_BIAS_FREE,
  });

  rules['inclusive-language/grayed-out'] = swapRule({
    pairs: { 'grayed-out': 'unavailable', 'greyed-out': 'unavailable' },
    message:
      'Use "%s" instead of "%s" (Google C§3.5 row 20; Microsoft a-z/gray-grayed-out agrees the term itself should be avoided when describing an unusable UI state, preferring "not available"/"isn\'t available").',
    link: `${GOOGLE_WORD_LIST}#grayed-out`,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['inclusive-language/he-she'] = swapRule({
    pairs: { 'he/she': 'they', 's/he': 'they' },
    message:
      'Use "%s" instead of "%s" (Google pronouns page; Microsoft bias-free-communication V23).',
    link: MS_BIAS_FREE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Matches the whole phrase only, because a bare "normal" has other meanings
  // such as "normal distribution".
  rules['inclusive-language/nondisabled-person'] = swapRule({
    pairs: {
      'normal person': 'person without a disability',
      'healthy person': 'person without a disability',
    },
    message:
      'Use "%s" instead of "%s" (Google inclusive-documentation D§3.6 row 45; Microsoft accessibility term collection Row 5).',
    link: GOOGLE_INCLUSIVE_DOCUMENTATION,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['inclusive-language/suffering-victim'] = swapRule({
    pairs: { 'suffering from': 'experiencing', 'victim of': 'living with' },
    message:
      'Use "%s" instead of "%s" (Google inclusive-documentation D§3.6 row 43; Microsoft accessibility term collection Row 4 agrees this phrase should be avoided, though its own replacement is sometimes a fuller sentence rewrite).',
    link: GOOGLE_INCLUSIVE_DOCUMENTATION,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Reports only. The guides suggest different wording for different cases.
  rules['inclusive-language/differently-abled'] = patternRule({
    tokens: ['\\bdifferently[- ]abled\\b'],
    message:
      'Avoid the euphemism "%s" (Google inclusive-documentation D§3.6 row 44; Microsoft accessibility term collection Row 8); use specific, person-first language instead.',
    link: MS_ACCESSIBILITY_TERMS,
    ignoreCase: true,
  });

  // Reports only. The replacement depends on whether the word describes a
  // system or a person.
  rules['inclusive-language/crippled'] = patternRule({
    tokens: ['\\bcripple\\b', '\\bcrippled\\b'],
    message:
      'Avoid "%s" (Google word-list#cripple D§3.6 row 27; Microsoft accessibility term collection Row 2); use "slowed down" for a figurative/system sense, or person-first language when referring to a person.',
    link: MS_ACCESSIBILITY_TERMS,
    ignoreCase: true,
  });

  rules['inclusive-language/nuke'] = swapRule({
    pairs: { nuke: 'remove' },
    message:
      'Avoid the violent-metaphor jargon "%s"; use "%s" or "attack" instead (Google word-list#nuke C§3.5; Microsoft militaristic-language "Never use" list agrees).',
    link: MS_MILITARISTIC_LANGUAGE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Rules never fix, even if a future rule sets `fix`.
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
