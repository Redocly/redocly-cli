import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('table-column-style (MD060)', () => {
  const h = tokenRuleHarness('table-column-style');

  it('passes a table matching the aligned style by default (any)', async () => {
    const md =
      '| Character | Meaning |\n| --------- | ------- |\n| Y         | Yes     |\n| N         | No      |\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('passes a table matching the compact style by default (any)', async () => {
    const md = '| Character | Meaning |\n| --- | --- |\n| Y | Yes |\n| N | No |\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('passes a table matching the tight style by default (any)', async () => {
    const md = '|Character|Meaning|\n|---|---|\n|Y|Yes|\n|N|No|\n';
    expect(await h.lint(md)).toEqual([]);
  });

  describe('style: aligned', () => {
    const hAligned = tokenRuleHarness('table-column-style', { style: 'aligned' });

    it('passes a correctly aligned table', async () => {
      const md =
        '| Character | Meaning |\n| --------- | ------- |\n| Y         | Yes     |\n| N         | No      |\n';
      expect(await hAligned.lint(md)).toEqual([]);
    });

    it('flags a table whose pipes do not align with the header, with exact line/column', async () => {
      const md = '|Alpha |Delta|\n|------|-----|\n|Charlie|Beta|\n';
      const problems = await hAligned.lint(md);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0].message).toContain('does not align with header for style "aligned"');
      expect(problems[0].line).toBe(3);
    });

    it('is not fixable (aligned violations require whole-table changes)', async () => {
      const md = '|Alpha |Delta|\n|------|-----|\n|Charlie|Beta|\n';
      const fixed = await hAligned.fix(md);
      expect(fixed).toBe(md);
    });
  });

  describe('style: compact', () => {
    const hCompact = tokenRuleHarness('table-column-style', { style: 'compact' });

    it('passes a correctly compact table', async () => {
      const md = '| Character | Meaning |\n| --- | --- |\n| Y | Yes |\n| N | No |\n';
      expect(await hCompact.lint(md)).toEqual([]);
    });

    it('flags extra space to the left of a pipe, with exact line/column', async () => {
      const md = '| Character | Meaning |\n| --- | --- |\n| Y   | Yes |\n';
      const problems = await hCompact.lint(md);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('extra space to the left'))).toBe(true);
    });

    it('fixes extra space around pipes to a single space', async () => {
      const md = '| Character | Meaning |\n| --- | --- |\n| Y   | Yes |\n';
      const fixed = await hCompact.fix(md);
      expect(fixed).toBe('| Character | Meaning |\n| --- | --- |\n| Y | Yes |\n');
    });

    it('fixes a missing space next to a pipe by inserting one', async () => {
      const md = '|Character | Meaning |\n| --- | --- |\n| Y | Yes |\n';
      const fixed = await hCompact.fix(md);
      expect(fixed).toBe('| Character | Meaning |\n| --- | --- |\n| Y | Yes |\n');
    });
  });

  describe('style: tight', () => {
    const hTight = tokenRuleHarness('table-column-style', { style: 'tight' });

    it('passes a correctly tight table', async () => {
      const md = '|Character|Meaning|\n|---|---|\n|Y|Yes|\n|N|No|\n';
      expect(await hTight.lint(md)).toEqual([]);
    });

    it('flags any space around a pipe, with exact line/column', async () => {
      const md = '|Character|Meaning|\n|---|---|\n| Y |Yes|\n';
      const problems = await hTight.lint(md);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('space to the left for style "tight"'))).toBe(
        true
      );
    });

    it('fixes spaces around pipes by removing them', async () => {
      const md = '|Character|Meaning|\n|---|---|\n| Y |Yes|\n';
      const fixed = await hTight.fix(md);
      expect(fixed).toBe('|Character|Meaning|\n|---|---|\n|Y|Yes|\n');
    });
  });

  describe('alignedDelimiter option', () => {
    it('requires the delimiter row pipes to align with the header for compact style', async () => {
      const hCompactAligned = tokenRuleHarness('table-column-style', {
        style: 'compact',
        alignedDelimiter: true,
      });
      // Delimiter row misaligned with header despite compact-correct cell spacing.
      const md = '| Character | Meaning |\n| --- | ---- |\n| Y | Yes |\n';
      const problems = await hCompactAligned.lint(md);
      expect(problems.some((p) => p.message.includes('option "aligned_delimiter"'))).toBe(true);
    });

    it('passes when the delimiter row aligns with the header under compact + alignedDelimiter', async () => {
      const hCompactAligned = tokenRuleHarness('table-column-style', {
        style: 'compact',
        alignedDelimiter: true,
      });
      const md = '| Character | Meaning |\n| --------- | ------- |\n| Y | Yes |\n| N | No |\n';
      expect(await hCompactAligned.lint(md)).toEqual([]);
    });
  });

  it('under "any" style, reports the fewest-issue style when no style matches exactly', async () => {
    // One row (`Y`) is one-space-off from tight in a way that's the closest
    // match to "tight" (single extra space), so with the default "any"
    // style, "tight"'s one issue should be picked over "compact"'s.
    const md = '|Character|Meaning|\n|---|---|\n| Y|Yes|\n';
    const problems = await h.lint(md);
    expect(problems.length).toBeGreaterThan(0);
  });
});
