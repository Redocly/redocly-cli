import { describe, expect, it } from 'vitest';

import { runRulesUntilStable } from '../../core/runner.js';
import { lintContent } from '../../index.js';
import { validate } from '../validate.js';

// =============================================================================
// Acceptance evidence item 1 (preset-detection-only-brief.md): every
// corruption string named in the brief -- drawn from the fifth and final
// adversarial probe, which found 18 of 29 probed pairs (62%) still
// corrupting genuinely correct prose after three prior rounds of narrowing
// the fix-safety criterion -- run through `--fix`, must come out COMPLETELY
// UNCHANGED. The brief calls this "a trivially satisfiable gate -- that is
// the point": with both `recheck/google` and `recheck/microsoft` fully
// detection-only (see google.ts's/microsoft.ts's "DETECTION-ONLY BY DESIGN"
// header notes), no rule in either preset can rewrite anything, so every
// one of these must be a no-op regardless of which specific pair or preset
// it came from.
//
// Rounds 1-4's own named corruptions (the `us-spelling` inflection
// collapse, the ~15 Tier-1 pairs, `as well as`/`or greater`, `DMZ`/`the
// ask`/`home directory`/`spec`/`click-through`, the proper-noun-axis
// findings) already have dedicated "no longer rewrites, but still detects"
// regression tests in preset-microsoft.test.ts's "fix wave B"/"fix wave
// C"/"fix-posture wave 2" describe blocks and preset-google-fix-wave-c.test.ts
// (both rewritten by this same change -- see their own file-header notes).
// This file is round 5's own acceptance evidence, not a duplicate of
// those -- each sentence below is a full, natural rendering of a fragment
// quoted in the brief, reconstructed to be grammatical while preserving the
// exact corrupting phrase.
//
// Every sentence is run through BOTH presets together (`extends:
// ['recheck/google', 'recheck/microsoft']`): which preset a given pair
// happens to live in is incidental to the point being proven here (nothing
// fixes, anywhere), and running both together is strictly stronger evidence
// than picking the "right" one for each line.
// =============================================================================

async function fixTwice(content: string) {
  const config = { extends: ['recheck/google', 'recheck/microsoft'] };
  const { rules } = await validate(config);
  const pass1 = await runRulesUntilStable([{ path: 'x.md', content }], rules);
  const afterPass1 = pass1.fixedFiles.get('x.md') ?? content;
  const pass2 = await runRulesUntilStable([{ path: 'x.md', content: afterPass1 }], rules);
  const afterPass2 = pass2.fixedFiles.get('x.md') ?? afterPass1;
  return { afterPass1, afterPass2 };
}

// Each case: [content, rule that would have fired the corrupting fix, what
// the OLD (pre-detection-only) behavior used to rewrite it to -- recorded
// for the historical evidence, not asserted directly, since asserting a
// NEGATIVE ("did not become X") is weaker than asserting the POSITIVE
// ("is byte-identical to the input") already checked below].
const round5Corruptions: Array<[string, string, string]> = [
  // Brief's own two headline examples (category axes previously believed
  // safe: an inverted meaning, and hyphenation).
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
  // The rest of the brief's own eight-line corruption block.
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
  // Additional round-5 corruptions beyond the brief's own quoted eight,
  // recovered from the probe's full "18 of 29" finding.
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
      expect(afterPass2).toBe(afterPass1); // idempotent
    }
  );

  // Acceptance item 3's own concern applied here too: a rule that neither
  // fixes nor reports is dead weight. Every rule named above must still
  // detect its corresponding sentence -- proving these are truly
  // "detection-only", not "silently disabled".
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
