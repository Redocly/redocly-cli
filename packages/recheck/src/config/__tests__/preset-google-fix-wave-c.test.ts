import { describe, expect, it } from 'vitest';

import { runRulesUntilStable } from '../../core/runner.js';
import { lintContent } from '../../index.js';
import { validate } from '../validate.js';

// Fix wave C acceptance evidence (task-9-fixC-brief.md's Gates section),
// RETIRED into detection-only proof (2026-07-30): every assertion below
// used to prove a specific rewrite was both correct and idempotent. Now
// that `recheck/google` is detection-only by design (no rule auto-fixes --
// see google.ts's own "DETECTION-ONLY BY DESIGN" header note and
// `presets/google/PROVENANCE.md`'s "Detection-only" section), there is no
// fix left to prove correct: every case that used to demonstrate a REAL
// rewrite now demonstrates the opposite, that `--fix` leaves the text
// completely alone while detection still fires. Rewritten rather than
// deleted, per the brief: "this input must never be rewritten" is exactly
// the assertion worth keeping, and these are real historical corruptions
// (Fix wave A found the originals; Fix wave C found the shouting-cased
// variants) -- losing that record would lose evidence, not just a test.
//
// Each block below runs real config -- `validate({ extends: ['recheck/google'] })`
// -- through the real fix pipeline (`runRulesUntilStable`, the same
// convergence loop the CLI's `--fix` uses), TWICE, to prove both
// correctness and idempotency, not just "compiles".
async function fixTwice(content: string) {
  const { rules } = await validate({ extends: ['recheck/google'] });
  const pass1 = await runRulesUntilStable([{ path: 'x.md', content }], rules);
  const afterPass1 = pass1.fixedFiles.get('x.md') ?? content;
  const pass2 = await runRulesUntilStable([{ path: 'x.md', content: afterPass1 }], rules);
  const afterPass2 = pass2.fixedFiles.get('x.md') ?? afterPass1;
  return { afterPass1, afterPass2 };
}

describe('Fix wave C acceptance evidence', () => {
  // Acceptance set 1: the all-caps variants through --fix twice each -- no
  // shouting. POSTURE CHANGE (fix-posture task): `i.e.`/`e.g.` (moved to
  // `google/no-latinisms`, now `fix: false`) and `vice versa` (moved to
  // `google/no-latinisms-plain`, now `fix: false`) are different-word/
  // phrase substitutions, not respellings, so they no longer auto-fix at
  // all -- the engine-level shouting fix this suite documents is now moot
  // for them (nothing is ever rewritten), so these only assert "unchanged,
  // but still detected" below. `C/O` is a same-word abbreviation expansion
  // (kept in `google/no-slash-abbrev`) and remains fixable, so the original
  // not-shouted assertion still applies to it.
  //
  // FIX-POSTURE CHANGE WAVE 2: `AKA` moved from this bucket to the
  // detection-only one below -- `aka` -> `also known as` was misclassified
  // in wave 1 as a same-word respelling; it's actually an abbreviation
  // EXPANDED into a phrase (a substitution), the same shape as `i.e.`/
  // `e.g.` above.
  describe('Item 1 -- all-caps multi-word replacements are not shouted', () => {
    // POSTURE CHANGE (detection-only task, 2026-07-30): `C/O` -> `care of`
    // used to be the case this whole item existed to prove -- a real,
    // safe, non-shouted fix. `google/no-slash-abbrev` is detection-only
    // like every other rule in this preset now: `--fix`, twice, must leave
    // it completely unchanged, and detection must still fire. The
    // shouting-vs-not-shouting question this item was built to answer is
    // moot when nothing is ever rewritten.
    it.each([['C/O', 'Send documents C/O the compliance department.', 'google/no-slash-abbrev']])(
      '%s is no longer auto-fixed (so it can no longer be shouted either), but is still detected',
      async (_label, content, ruleName) => {
        const { afterPass1, afterPass2 } = await fixTwice(content);
        expect(afterPass1).toBe(content);
        expect(afterPass2).toBe(afterPass1); // idempotent

        const problems = await lintContent(content, { extends: ['recheck/google'] });
        expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
      }
    );

    // `I.E.`/`E.G.`/`VICE VERSA`/`AKA` are now detection-only (fix-posture
    // task, wave 2 for `AKA`): `--fix` must leave them completely
    // unchanged, and detection must still fire (a rule that neither fixes
    // nor reports is worthless).
    it.each([
      ['I.E.', 'This is required, I.E. mandatory for all users.', 'google/no-latinisms'],
      ['E.G.', 'Pick a color, E.G. red or blue.', 'google/no-latinisms'],
      ['VICE VERSA', 'Swap the primary and replica, or VICE VERSA.', 'google/no-latinisms-plain'],
      ['AKA', 'The setting is AKA the legacy flag.', 'google/aka-form'],
    ])('%s is no longer auto-fixed, but is still detected', async (_label, content, ruleName) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
    });

    // `VS.` used to be a documented exception to "no shouting": its
    // replacement ("versus") is a SINGLE word, which was deliberately
    // unaffected by the engine fix (see case-preserve.ts's doc comment --
    // single-word replacements keep the ALL-CAPS shout, the case that
    // branch exists for). POSTURE CHANGE (detection-only task, 2026-07-30):
    // `google/vs-versus` is detection-only like every other rule in this
    // preset now, so the shouting-vs-not-shouting distinction this test
    // existed to pin no longer applies -- nothing is ever rewritten,
    // shouted or otherwise. Kept (rewritten, not deleted) so the "VS. is
    // different from I.E./E.G./VICE VERSA/AKA" record stays on file, even
    // though the difference itself (single-word vs. multi-word
    // replacement) no longer has an observable effect.
    it('VS. no longer shouts -- or does anything else -- because it no longer fixes at all', async () => {
      const content = 'The counter VS. the baseline matters.';
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1); // idempotent

      const problems = await lintContent(content, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === 'google/vs-versus')).toBe(true);
    });

    // WHITELIST -> ALLOWLIST-shaped case: single-word all-caps match, single-word
    // replacement, must still shout (this is the case the branch exists for).
    // No such pair ships in `recheck/google` today, so this is re-confirmed
    // directly against applyMatchCase in case-preserve.test.ts instead of here.
  });

  // Acceptance set 2: all four `Cloud console` spellings, twice each -- no
  // duplication.
  describe('Item 2 -- Cloud console lookbehind is case-insensitive and whitespace-tolerant', () => {
    it.each([
      ['Google', 'Open the Google Cloud console to view your project.'],
      ['google', 'Open the google Cloud console to view your project.'],
      ['GOOGLE', 'Open the GOOGLE Cloud console to view your project.'],
      ['double-spaced Google', 'Open the Google  Cloud console to view your project.'],
    ])('%s Cloud console is not further duplicated', async (_label, content) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).not.toContain('Google Google Cloud console');
      expect(afterPass2).toBe(afterPass1); // idempotent
    });

    // POSTURE CHANGE (fix-posture task): `google/product-names` (which owns
    // this pair) flipped to `fix: false` -- every pair in it is a brand/
    // terminology rename to a different word/phrase, not a respelling. The
    // lookbehind/case-insensitivity engineering above still protects
    // DETECTION (no self-compounding, no duplicate report), it just no
    // longer auto-rewrites.
    it('a bare "Cloud console" (no preceding "google" in any form) is detected but no longer auto-fixed', async () => {
      const content = 'Open the Cloud console to view it.';
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1); // idempotent
      const problems = await lintContent(content, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === 'google/product-names')).toBe(true);
    });
  });

  // Acceptance set 3: `w/o downtime` and `c/oscillator` -- uncorrupted.
  describe('Item 3 -- no-slash-abbrev does not corrupt a following letter', () => {
    it('w/o downtime is left alone entirely', async () => {
      const { afterPass1 } = await fixTwice('Deploy the change w/o downtime.');
      expect(afterPass1).toBe('Deploy the change w/o downtime.');
    });

    it('c/oscillator is left alone entirely', async () => {
      const { afterPass1 } = await fixTwice('Connect the c/oscillator to the board.');
      expect(afterPass1).toBe('Connect the c/oscillator to the board.');
    });

    // POSTURE CHANGE (detection-only task, 2026-07-30): this test used to
    // confirm the leading-`\b` fix (Fix wave A / C1) didn't re-break the
    // ordinary "w/" -> "with" and "c/o" -> "care of" cases by proving they
    // still fixed correctly. `google/no-slash-abbrev` is detection-only
    // like every other rule in this preset now, so there is no fix left to
    // re-break: `--fix`, twice, must leave the whole sentence completely
    // unchanged, and both pairs must still be detected.
    it('w/ headers and c/o the compliance department are detected but no longer rewritten', async () => {
      const content = 'Serve files w/ headers. Send documents c/o the compliance department.';
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);

      const problems = await lintContent(content, { extends: ['recheck/google'] });
      const matches = new Set(
        problems
          .filter((p) => p.ruleName === 'google/no-slash-abbrev')
          .map((p) => p.match.toLowerCase())
      );
      expect(matches.has('w/')).toBe(true);
      expect(matches.has('c/o')).toBe(true);
    });
  });

  // Acceptance set 4: the original corruption strings from wave A's own
  // gate (task-9-report.md's "Corruption re-run cases" section) -- still
  // passing, confirming the engine change didn't regress them. Reproduced
  // verbatim from that report rather than re-derived, since that's the
  // authoritative record of what wave A verified.
  describe('Item 4 (regression) -- wave A corruption cases still hold after the engine change', () => {
    // POSTURE CHANGE (detection-only task, 2026-07-30): line 9
    // ("OAuth2 today.") used to be the one genuine REWRITE in this list --
    // `google/acronym-forms` correctly fixed it to "OAuth 2.0 today.",
    // proving the engine change didn't regress a real fix alongside the
    // near-misses. `google/acronym-forms` is detection-only like every
    // other rule in this preset now, so that line is also byte-identical
    // before and after: the whole list is unchanged, not just the
    // near-misses. Detection is checked separately below.
    it('the first 10 CLI gate lines are unchanged by a second --fix pass', async () => {
      const before = [
        'Route traffic through Akamai for caching.',
        'The region is hosted in Osaka.',
        'The counter revs. up quickly.',
        'Build artifacts land in the src/output dir.',
        'Serve files from www/static.',
        'Use the show/hide control.',
        'Compare the new/old configuration files.',
        'The API supports OAuth 2.0 for authentication.',
        'The API supports OAuth2 today.',
        'This change is in line with the platform roadmap.',
      ].join('\n');
      const { afterPass1, afterPass2 } = await fixTwice(before);
      expect(afterPass1).toBe(before);
      expect(afterPass2).toBe(afterPass1);

      const problems = await lintContent(before, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === 'google/acronym-forms')).toBe(true);
    });

    // POSTURE CHANGE (fix-posture task): `google/product-names` (Cloud
    // console/Developers Console) and `google/gcp-name` (GCP) both flipped
    // to `fix: false` -- brand/terminology substitutions, not respellings
    // (`GCP` -> `Google Cloud` is the same acronym-expands-to-a-different-
    // phrase shape as `DMZ` -> `perimeter network`). The lines that used to
    // get corrected are now left completely unchanged; the two structurally
    // safe lines (already-correct "Google Cloud console", and the two pure
    // casing detection-only pairs UNICODE/IPSEC, which were already
    // `fix: false` before this task) are unaffected either way.
    it('the additional-discoveries lines are unchanged by a second --fix pass', async () => {
      const before = [
        'Open the Cloud console to view your project.',
        'Open the Developers Console to view your project.',
        'Open the Google Cloud console to view your project.',
        'Encode the payload as UNICODE before sending it upstream.',
        'The tunnel is configured with IPSEC for encryption.',
        'Deploy the workload on GCP for better scaling.',
      ].join('\n');
      const { afterPass1, afterPass2 } = await fixTwice(before);
      expect(afterPass1).toBe(before);
      expect(afterPass2).toBe(afterPass1);

      const problems = await lintContent(before, { extends: ['recheck/google'] });
      const reportedRules = new Set(problems.map((p) => p.ruleName));
      expect(reportedRules.has('google/product-names')).toBe(true);
      expect(reportedRules.has('google/gcp-name')).toBe(true);
    });
  });
});

// =============================================================================
// Fix-posture wave 2 acceptance gate: the proper-noun axis. A pair keeps
// `fix: true` only if the avoid-term also cannot occur as part of a real
// organization, product, brand, or place name. `markdown` is both a
// retail/finance homograph AND a proper-noun collision; `FinTech`/`I-O` are
// real company/product names ("FinTech Group AG", "I-O DATA DEVICE, INC.");
// `aka` -> `also known as` was simply misclassified in wave 1 (an
// abbreviation expanded to a phrase is a substitution, not a respelling --
// "AKA" is also literally a real sorority name, Alpha Kappa Alpha);
// `U.S.`/`U.S.A.` collide with real company/org names ("U.S. Bank",
// "U.S. Steel", "U.S.A. Track and Field"); `datasource` collides with the
// Java/Spring `DataSource` type name; `material design`/`search console`
// are generic phrases this rule would wrongly assume always mean Google's
// own products. `--fix`, twice, must leave every one of these completely
// unchanged, and detection must still fire.
// =============================================================================

describe('Fix-posture wave 2 acceptance gate: proper-noun axis', () => {
  const unchangedAndStillDetected: Array<[string, string]> = [
    [
      'The store offered a markdown of thirty percent.\n',
      'google/brand-capitalization-proper-noun',
    ],
    ['Seasonal markdown pricing begins tomorrow.\n', 'google/brand-capitalization-proper-noun'],
    [
      'The material design of the building incorporates local stone.\n',
      'google/brand-capitalization-proper-noun',
    ],
    ['Open the search console to tune the results.\n', 'google/brand-capitalization-proper-noun'],
    ['FinTech Group AG reported strong earnings.\n', 'google/acronym-forms-proper-noun'],
    [
      'FinTech Group AG connects to the drive over an I-O interface.\n',
      'google/acronym-forms-proper-noun',
    ],
    ['She was initiated into AKA her freshman year.\n', 'google/aka-form'],
    ['The payment was processed by U.S. Bank on Tuesday.\n', 'google/us-abbreviation'],
    ['U.S.A. Track and Field sanctioned the meet.\n', 'google/us-abbreviation'],
    ['U.S. Steel announced closures.\n', 'google/us-abbreviation'],
    ['Configure the DataSource bean in the Spring context.\n', 'google/compound-forms-proper-noun'],
  ];

  it.each(unchangedAndStillDetected)(
    'leaves %j unchanged through two --fix passes, but still reports it against %s',
    async (content, ruleName) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
    }
  );

  // Every rule reclassified this wave must still be able to FIRE (detect)
  // on a genuine violation elsewhere in the same rule (no rule went dead):
  // the remaining pairs in each split rule still report.
  //
  // POSTURE CHANGE (detection-only task, 2026-07-30): all three of these
  // used to be "still fixes correctly" cases -- the whole point of this
  // wave's proper-noun split was proving the pairs that DIDN'T move still
  // worked. Detection-only makes the fixing half of that moot:
  // `google/brand-capitalization`, `google/acronym-forms`, and
  // `google/compound-forms` are all detection-only now, same as every other
  // rule in this preset. Detection is what's left to prove, so these now
  // assert "leaves it unchanged, still reports."
  it('google/brand-capitalization no longer fixes a pair NOT moved to the proper-noun sibling, but still detects it', async () => {
    const content = 'Sign in with your Google account to continue.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
    const problems = await lintContent(content, { extends: ['recheck/google'] });
    expect(problems.some((p) => p.ruleName === 'google/brand-capitalization')).toBe(true);
  });

  it('google/acronym-forms no longer fixes a pair NOT moved to the proper-noun sibling, but still detects it', async () => {
    const content = 'The service communicates over IPSec tunnels.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
    const problems = await lintContent(content, { extends: ['recheck/google'] });
    expect(problems.some((p) => p.ruleName === 'google/acronym-forms')).toBe(true);
  });

  it('google/compound-forms no longer fixes a pair NOT moved to the proper-noun sibling, but still detects it', async () => {
    const content = 'Store the uploaded file in the data store for later retrieval.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
    const problems = await lintContent(content, { extends: ['recheck/google'] });
    expect(problems.some((p) => p.ruleName === 'google/compound-forms')).toBe(true);
  });
});
