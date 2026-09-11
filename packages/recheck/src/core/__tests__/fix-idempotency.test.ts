import { describe, expect, it } from 'vitest';

import type { NormalizedRule } from '../../types/index.js';
import { runRules, runRulesUntilStable } from '../runner.js';

// Regression fixture for FIX 3: '* bullet one\t\n' under ul-style +
// no-hard-tabs + no-trailing-spaces used to need 3 separate runRules(fix:
// true) passes to fully converge:
//   pass 1: '* bullet one\t\n'  -> '* bullet one  \n'   (tab -> 2 spaces)
//   pass 2: '* bullet one  \n'  -> '- bullet one\n'     (bullet + trailing space)
//   pass 3: no more fixes
// Root causes: (a) no-hard-tabs used to emit a whole-line fix
// (deleteCount: -1), which made the auto-fix applier discard sibling
// fixes on that line and could itself reintroduce trailing spaces; (b)
// genuinely same-position conflicting fixes are skip-resolved by design,
// leaving remainder work for a later pass.
//
// `no-trailing-spaces` uses `strict: true`: the tab->2-spaces fix from
// no-hard-tabs leaves exactly 2 trailing spaces, which MD009's default
// `brSpaces: 2` semantics treat as an intentional Markdown hard line break
// (not flagged). `strict: true` restores "flag ALL trailing whitespace" so
// this fixture still exercises the same-line multi-rule fix conflict it
// was designed for.
const FIXTURE = '* bullet one\t\n';

function rules(): NormalizedRule[] {
  return [
    {
      name: 'recheck/ul-style',
      shortName: 'ul-style',
      severity: 'error',
      message: 'Use "-" bullets.',
      assertions: { 'ul-style': { style: 'dash' } },
    },
    {
      name: 'recheck/no-hard-tabs',
      shortName: 'no-hard-tabs',
      severity: 'error',
      message: 'Use spaces instead of tabs.',
      assertions: { 'no-hard-tabs': { codeBlocks: false, spacesPerTab: 2 } },
    },
    {
      name: 'recheck/no-trailing-spaces',
      shortName: 'no-trailing-spaces',
      severity: 'error',
      message: 'Remove trailing spaces.',
      assertions: { 'no-trailing-spaces': { codeBlocks: false, strict: true } },
    },
  ];
}

describe('fix idempotency', () => {
  it('runRules alone is single-pass and does not fully converge the fixture in one call', async () => {
    // Documents runRules' contract: it is single-pass by design. This
    // fixture is a case where a single pass leaves fixable problems behind
    // (library callers that need full convergence should use
    // runRulesUntilStable, or loop themselves).
    const result = await runRules([{ path: 'x.md', content: FIXTURE }], rules(), { fix: true });
    const afterOnePass = result.fixedFiles.get('x.md');
    expect(afterOnePass).toBeDefined();

    const secondPass = await runRules(
      [{ path: 'x.md', content: afterOnePass ?? FIXTURE }],
      rules(),
      { fix: true }
    );
    // If runRules had already converged in one pass, this second pass
    // would produce zero fixes. It doesn't — proving the single-pass gap
    // this fixture is designed to exercise.
    expect(secondPass.fixes.length).toBeGreaterThan(0);
  });

  it('runRulesUntilStable converges the fixture in a single call', async () => {
    const result = await runRulesUntilStable([{ path: 'x.md', content: FIXTURE }], rules());
    const converged = result.fixedFiles.get('x.md');
    expect(converged).toBe('- bullet one\n');

    // A fresh lint of the converged content must report zero problems.
    const relint = await runRules([{ path: 'x.md', content: converged ?? FIXTURE }], rules());
    expect(relint.problems).toEqual([]);
  });

  it('runRulesUntilStable reports only the fixes that actually landed across passes', async () => {
    // Pass 1 proposes THREE fixes on the one line (ul-style col 1,
    // no-hard-tabs col 13, no-trailing-spaces col 13) but the two col-13
    // edits conflict — only no-hard-tabs lands, no-trailing-spaces is
    // skipped and re-proposed against the fixed content in pass 2, where
    // it lands. So 4 fixes are PROPOSED across passes but only 3 ever
    // change the file; `fixes` must reflect the 3 that landed and, since
    // the run naturally converged, nothing is left pending in
    // `skippedFixes`.
    const result = await runRulesUntilStable([{ path: 'x.md', content: FIXTURE }], rules());
    expect(result.fixes).toHaveLength(3);
    expect(result.fixes.map((fix) => fix.ruleName).sort()).toEqual([
      'recheck/no-hard-tabs',
      'recheck/no-trailing-spaces',
      'recheck/ul-style',
    ]);
    expect(result.skippedFixes).toEqual([]);
  });
});
