import { describe, expect, it } from 'vitest';

import type { NormalizedRule } from '../../types/index.js';
import { runRules, runRulesUntilStable } from '../runner.js';

// Needs two passes to settle: tab to two spaces, then bullet style and trailing space.
// `no-trailing-spaces` uses `strict: true` because two trailing spaces would otherwise count
// as a Markdown hard break.
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
    const result = await runRules([{ path: 'x.md', content: FIXTURE }], rules(), { fix: true });
    const afterOnePass = result.fixedFiles.get('x.md');
    expect(afterOnePass).toBeDefined();

    const secondPass = await runRules(
      [{ path: 'x.md', content: afterOnePass ?? FIXTURE }],
      rules(),
      { fix: true }
    );
    // A second pass still has fixes to make, so one pass is not enough.
    expect(secondPass.fixes.length).toBeGreaterThan(0);
  });

  it('runRulesUntilStable converges the fixture in a single call', async () => {
    const result = await runRulesUntilStable([{ path: 'x.md', content: FIXTURE }], rules());
    const converged = result.fixedFiles.get('x.md');
    expect(converged).toBe('- bullet one\n');

    const relint = await runRules([{ path: 'x.md', content: converged ?? FIXTURE }], rules());
    expect(relint.problems).toEqual([]);
  });

  it('runRulesUntilStable reports only the fixes that actually landed across passes', async () => {
    // Pass 1 proposes three fixes, but the two at column 13 conflict, so no-trailing-spaces waits
    // for pass 2. Only the three fixes that landed are reported.
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
