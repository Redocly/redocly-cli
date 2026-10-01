import { describe, expect, it } from 'vitest';

import { runRulesUntilStable } from '../../core/runner.js';
import { lintContent } from '../../index.js';
import { validate } from '../validate.js';

// The google preset only detects problems and never rewrites text. Each case runs `--fix` twice
// and checks that the text is unchanged and the rule still reports it.
async function fixTwice(content: string) {
  const { rules } = await validate({ extends: ['recheck/google'] });
  const pass1 = await runRulesUntilStable([{ path: 'x.md', content }], rules);
  const afterPass1 = pass1.fixedFiles.get('x.md') ?? content;
  const pass2 = await runRulesUntilStable([{ path: 'x.md', content: afterPass1 }], rules);
  const afterPass2 = pass2.fixedFiles.get('x.md') ?? afterPass1;
  return { afterPass1, afterPass2 };
}

describe('Fix wave C acceptance evidence', () => {
  // All-caps phrases, run through `--fix` twice. `i.e.`, `e.g.`, `vice versa` and `AKA` are
  // replaced by different words, so they are only detected.
  describe('Item 1 -- all-caps multi-word replacements are not shouted', () => {
    // `C/O` is only detected, not replaced with `care of`.
    it.each([['C/O', 'Send documents C/O the compliance department.', 'google/no-slash-abbrev']])(
      '%s is no longer auto-fixed (so it can no longer be shouted either), but is still detected',
      async (_label, content, ruleName) => {
        const { afterPass1, afterPass2 } = await fixTwice(content);
        expect(afterPass1).toBe(content);
        expect(afterPass2).toBe(afterPass1);

        const problems = await lintContent(content, { extends: ['recheck/google'] });
        expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
      }
    );

    // These are only detected. `--fix` must leave them unchanged.
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

    // `VS.` is only detected too, so `--fix` leaves it as is.
    it('VS. no longer shouts -- or does anything else -- because it no longer fixes at all', async () => {
      const content = 'The counter VS. the baseline matters.';
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);

      const problems = await lintContent(content, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === 'google/vs-versus')).toBe(true);
    });
  });

  describe('Item 2 -- Cloud console lookbehind is case-insensitive and whitespace-tolerant', () => {
    it.each([
      ['Google', 'Open the Google Cloud console to view your project.'],
      ['google', 'Open the google Cloud console to view your project.'],
      ['GOOGLE', 'Open the GOOGLE Cloud console to view your project.'],
      ['double-spaced Google', 'Open the Google  Cloud console to view your project.'],
    ])('%s Cloud console is not further duplicated', async (_label, content) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).not.toContain('Google Google Cloud console');
      expect(afterPass2).toBe(afterPass1);
    });

    // `google/product-names` only detects, so `--fix` leaves this alone.
    it('a bare "Cloud console" (no preceding "google" in any form) is detected but no longer auto-fixed', async () => {
      const content = 'Open the Cloud console to view it.';
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/google'] });
      expect(problems.some((p) => p.ruleName === 'google/product-names')).toBe(true);
    });
  });

  describe('Item 3 -- no-slash-abbrev does not corrupt a following letter', () => {
    it('w/o downtime is left alone entirely', async () => {
      const { afterPass1 } = await fixTwice('Deploy the change w/o downtime.');
      expect(afterPass1).toBe('Deploy the change w/o downtime.');
    });

    it('c/oscillator is left alone entirely', async () => {
      const { afterPass1 } = await fixTwice('Connect the c/oscillator to the board.');
      expect(afterPass1).toBe('Connect the c/oscillator to the board.');
    });

    // `w/` and `c/o` are only detected, so `--fix` leaves the whole sentence unchanged.
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

  describe('Item 4 (regression) -- wave A corruption cases still hold after the engine change', () => {
    // Nothing in this list is rewritten, including "OAuth2 today."; detection is checked below.
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

    // `google/product-names` and `google/gcp-name` only detect, so these lines stay unchanged.
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

// Terms that can be part of a real organization, product or place name must not be rewritten
// (for example `markdown`, `FinTech`, `U.S.`, `datasource`, `material design`). `--fix`, run twice,
// must leave each one unchanged, and the rule must still report it.
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

  // The remaining pairs of each rule must still report, so no rule is dead. They are only detected.
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
