import type { RecheckRules } from '../../types/index.js';

/**
 * `recheck/technical-english` — an original rule set that helps writers
 * follow the principles of ASD-STE100 Simplified Technical English.
 *
 * ASD-STE100 Simplified Technical English is a Copyright and a Trade Mark
 * of ASD, Brussels, Belgium. This preset is an independent work: ASD and
 * the STEMG do not review, validate, approve, certify, or endorse it. It
 * reproduces no part of the standard — not its text and not its dictionary.
 * Each rule implements a publicly documented writing principle in Recheck's
 * own vocabulary. Provenance, the STEMG correspondence, and the list of
 * deliberate omissions: packages/recheck/presets/technical-english/
 * PROVENANCE.md.
 *
 * WHAT DOESN'T SHIP, AND WHY:
 *
 *   - NO approved-word dictionary. The STE dictionary is part of the
 *     copyrighted standard; encoding it would reproduce the standard in
 *     part. The standard's Special Usage Rights grant reproduction rights
 *     only to a closed list of aerospace and defense organizations, which
 *     a public npm package distributes past — so a dictionary rule needs
 *     written authority from an ASD officer (see PROVENANCE.md). For
 *     general word-choice checking, compose with `recheck/plain-language`
 *     (public-domain source, similar intent).
 *   - NO noun-cluster rule (the standard limits noun clusters to three).
 *     Counting nouns needs part-of-speech tagging; any regex approximation
 *     would flag ordinary prose constantly.
 *   - NO present-tense rule. `will` is a legitimate word in changelogs,
 *     roadmaps, and promises; a tense rule would fight real documentation.
 *   - NO one-instruction-per-sentence rule. Not reliably detectable;
 *     the sentence-length rule is the closest proxy.
 */
export function buildTechnicalEnglishPreset(): RecheckRules {
  const rules: RecheckRules = {};
  const SITE = 'https://www.asd-ste100.org';

  // The standard's best-known numeric principle: procedural sentences stay
  // within 20 words, descriptive sentences within 25. A linter cannot tell
  // a procedure from a description, so the default enforces the lenient
  // bound; a procedures-only project tightens max to 20 in its own config.
  rules['technical-english/sentence-length'] = {
    severity: 'warn',
    scope: 'sentence',
    link: SITE,
    message:
      'Sentence is %s %s long; ASD-STE100 recommends at most 20 words in procedures and 25 in descriptive text (max %s).',
    assertions: { length: { unit: 'words', max: 25 } },
  };

  // Paragraphs stay within six sentences.
  rules['technical-english/paragraph-length'] = {
    severity: 'warn',
    scope: 'paragraph',
    link: SITE,
    message:
      'Paragraph is %s %s long; ASD-STE100 recommends at most 6 sentences per paragraph (max %s).',
    assertions: { length: { unit: 'sentences', max: 6 } },
  };

  // Use the active voice. A heuristic (be-verb followed by a participle),
  // so it ships at `info`: visible, never blocking. The participle
  // alternation covers regular -ed forms plus the common irregulars; the
  // irregular list is ordinary linguistic knowledge, not standard content.
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

  // Detection-only by design, matching the other style presets: no rule in
  // this preset auto-fixes, ever.
  for (const rule of Object.values(rules)) {
    (rule as { fix?: boolean }).fix = false;
  }

  return rules;
}
