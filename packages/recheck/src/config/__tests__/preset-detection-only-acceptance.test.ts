import { describe, expect, it } from 'vitest';

import { runRulesUntilStable } from '../../core/runner.js';
import { lintContent } from '../../index.js';
import { validate } from '../validate.js';

// Sentences that the google and microsoft presets used to rewrite wrongly. Both presets only
// detect now, so running `--fix` with both presets together must leave each sentence unchanged.

async function fixTwice(content: string) {
  const config = { extends: ['recheck/google', 'recheck/microsoft'] };
  const { rules } = await validate(config);
  const pass1 = await runRulesUntilStable([{ path: 'x.md', content }], rules);
  const afterPass1 = pass1.fixedFiles.get('x.md') ?? content;
  const pass2 = await runRulesUntilStable([{ path: 'x.md', content: afterPass1 }], rules);
  const afterPass2 = pass2.fixedFiles.get('x.md') ?? afterPass1;
  return { afterPass1, afterPass2 };
}

// Each case: [content, the rule that must still report it, what the old fix rewrote it to].
const round5Corruptions: Array<[string, string, string]> = [
  // Fixes that changed the meaning or the hyphenation.
  [
    'No SQL is used here.\n',
    'google/acronym-forms',
    '"NoSQL is used here." -- MEANING INVERTED (a NoSQL-free document became a false claim about using NoSQL)',
  ],
  [
    'Please read only the introduction before the meeting.\n',
    'google/compound-forms',
    '"Please read-only the introduction..." -- hyphenation corrupts an adverb + object into a nonsense adjective',
  ],
  [
    'Pass -w/--watch to enable file watching.\n',
    'google/no-slash-abbrev',
    '"-with--watch" -- CLI flag mangled',
  ],
  [
    'The legacy integration is using Oauth 1.0a for authentication.\n',
    'google/acronym-forms',
    '"...using OAuth 2.0 1.0a..." -- version string garbled',
  ],
  [
    'Please check box 4 before submitting the form.\n',
    'google/compound-forms',
    '"Please checkbox 4..." -- verb + noun collapsed into a UI-element noun',
  ],
  [
    "Hemingway's memoir A Moveable Feast describes 1920s Paris.\n",
    'microsoft/az-grammar-usage',
    '"A Movable Feast" -- a real, correctly-spelled published title corrected into a misspelling of itself',
  ],
  [
    'Run defrag from an elevated command prompt to optimize the disk.\n',
    'microsoft/az-abbreviations-names',
    '"Run defragment..." -- defragment is not the command name; defrag is',
  ],
  [
    "The NFL's Wild Card Weekend kicks off the playoffs.\n",
    'google/compound-forms',
    '"...wildcard Weekend" -- a proper-noun event name lowercased and joined',
  ],
  // More sentences that the old fixes corrupted.
  [
    'Review the code base classes before merging the change.\n',
    'google/compound-forms',
    '"...codebase classes..." -- "classes of the code base" reads as a different structure once joined',
  ],
  [
    'The team lead will run book club sessions every Friday afternoon.\n',
    'google/compound-forms',
    '"...will runbook club..." -- verb "run" + noun "book club" collapsed into a nonsense compound',
  ],
  [
    'Dial up the treble until the mix sounds right.\n',
    'microsoft/spelling-hyphenation',
    '"Dial-up the treble..." -- a phrasal verb (turn a knob up), not 1990s modem technology',
  ],
  [
    'The invitations are printed on heavy white paper stock.\n',
    'google/compound-forms',
    '"...whitepaper stock." -- literal paper stock, not a business-jargon document',
  ],
  [
    "The car's front end faces the garage door.\n",
    'google/compound-forms',
    '"...frontend faces..." -- automotive, not software',
  ],
  [
    "The venue's license permits on-premise consumption only.\n",
    'google/compound-forms',
    '"...on-premises consumption..." -- collides with a distinct, defined liquor-licensing term',
  ],
  [
    'She enrolled in the Big Data Engineering program at her university.\n',
    'microsoft/az-case-fixable',
    '"...big data Engineering program..." -- a proper program name partially lowercased',
  ],
  [
    'After each cycle, the counter zeroes out automatically.\n',
    'microsoft/az-grammar-usage',
    '"...the counter zeros out..." -- a correct verb conjugation corrected into the plural noun form',
  ],
];

describe('preset-detection-only acceptance evidence: round-5 probe corruptions no longer reproduce', () => {
  it.each(round5Corruptions)(
    '%j is left byte-identical through two --fix passes (previously: %s)',
    async (content, _ruleName, _oldCorruption) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
    }
  );

  // The rules must still report the sentences, so they are detection-only and not disabled.
  it('every rule implicated above still detects its corresponding sentence', async () => {
    const config = { extends: ['recheck/google', 'recheck/microsoft'] };
    for (const [content, ruleName] of round5Corruptions) {
      const problems = await lintContent(content, config);
      expect(
        problems.some((p) => p.ruleName === ruleName),
        `expected ${ruleName} to report a problem for ${JSON.stringify(content)}`
      ).toBe(true);
    }
  });
});
