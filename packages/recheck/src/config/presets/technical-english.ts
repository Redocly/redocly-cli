import type { RecheckRules } from '../../types/index.js';

/**
 * `recheck/technical-english`: an original rule set that helps writers
 * follow the principles of ASD-STE100 Simplified Technical English.
 *
 * ASD-STE100 Simplified Technical English is a Copyright and a Trade Mark
 * of ASD, Brussels, Belgium. This preset is an independent work: ASD and
 * the STEMG do not review, validate, approve, certify, or endorse it. It
 * reproduces no part of the standard, neither its text nor its dictionary.
 * See packages/recheck/presets/technical-english/PROVENANCE.md for the
 * sources and the list of omissions.
 *
 * Left out on purpose:
 * - The approved-word dictionary, because it is part of the copyrighted standard.
 *   Use `recheck/plain-language` for word choice instead.
 * - The noun-cluster rule, because it needs part-of-speech tagging.
 * - A present-tense rule, because `will` is fine in changelogs and roadmaps.
 * - One instruction per sentence, because it cannot be detected reliably.
 *   The sentence-length rule is the closest check.
 */
export function buildTechnicalEnglishPreset(): RecheckRules {
  const rules: RecheckRules = {};
  const SITE = 'https://www.asd-ste100.org';

  // The standard allows 20 words in procedures and 25 in descriptions. A linter
  // cannot tell them apart, so this uses 25. Set max to 20 for procedures only.
  rules['technical-english/sentence-length'] = {
    severity: 'warn',
    scope: 'sentence',
    link: SITE,
    message:
      'Sentence is %s %s long; ASD-STE100 recommends at most 20 words in procedures and 25 in descriptive text (max %s).',
    assertions: { length: { unit: 'words', max: 25 } },
  };

  rules['technical-english/paragraph-length'] = {
    severity: 'warn',
    scope: 'paragraph',
    link: SITE,
    message:
      'Paragraph is %s %s long; ASD-STE100 recommends at most 6 sentences per paragraph (max %s).',
    assertions: { length: { unit: 'sentences', max: 6 } },
  };

  // Looks for a form of "be" followed by a participle. It is only a guess, so
  // the severity is `info`.
  rules['technical-english/passive-voice'] = {
    severity: 'info',
    scope: 'sentence',
    link: SITE,
    message: 'Prefer the active voice; ASD-STE100 recommends it ("%s").',
    assertions: {
      pattern: {
        ignoreCase: true,
        tokens: [
          '\\b(?:is|are|was|were|be|been|being)\\s+(?:\\w+ed|begun|broken|brought|built|chosen|done|drawn|driven|found|given|held|hidden|kept|known|left|lost|made|meant|paid|put|read|said|seen|sent|set|shown|taken|told|thrown|understood|written)\\b',
        ],
      },
    },
  };

  // Like the other style presets, this one only reports and never auto-fixes.
  for (const rule of Object.values(rules)) {
    (rule as { fix?: boolean }).fix = false;
  }

  return rules;
}
