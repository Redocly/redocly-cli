import { beforeEach, describe, expect, it } from 'vitest';

import { registerTokenRules, clearTokenRulesForTests } from '../../rules/registry.js';
import type { TokenRule } from '../../rules/types.js';
import type { NormalizedRule } from '../../types/index.js';
import { runRules, runRulesUntilStable } from '../runner.js';

const testTokenRule: TokenRule = {
  name: 'test-flag-headings',
  tags: ['test'],
  fixable: true,
  defaults: { marker: 'X' },
  check(ctx) {
    for (const token of ctx.tree.flat) {
      if (token.type !== 'atxHeading') continue;
      ctx.onError({
        line: token.startLine,
        column: token.startColumn,
        detail: `marker=${String(ctx.config.marker)}`,
        fixInfo: {
          lineNumber: token.startLine,
          editColumn: 1,
          deleteCount: 1,
          insertText: String(ctx.config.marker),
        },
      });
    }
  },
};

const rule = (overrides: Partial<NormalizedRule> = {}): NormalizedRule => ({
  name: 'recheck/test-flag-headings',
  shortName: 'test-flag-headings',
  severity: 'error',
  message: 'Heading flagged.',
  assertions: { 'test-flag-headings': {} },
  ...overrides,
});

describe('runner token-rule dispatch', () => {
  beforeEach(() => {
    clearTokenRulesForTests();
    registerTokenRules([testTokenRule]);
  });

  it('dispatches token rules and reports problems with file positions', async () => {
    const md = '# One\n\ntext\n\n## Two\n';
    const { problems } = await runRules([{ path: 'a.md', content: md }], [rule()]);
    expect(problems.map((p) => p.line)).toEqual([1, 5]);
    expect(problems[0].severity).toBe('error');
    expect(problems[0].ruleName).toBe('recheck/test-flag-headings');
  });

  it('merges defaults with user assertion config', async () => {
    const custom = rule({ assertions: { 'test-flag-headings': { marker: 'Y' } } });
    const { problems } = await runRules([{ path: 'a.md', content: '# H\n' }], [custom]);
    expect(problems[0].message).toContain('marker=Y');
  });

  it('collects fixInfo into fixes and fixedFiles', async () => {
    const { fixedFiles } = await runRules([{ path: 'a.md', content: '# H\n' }], [rule()], {
      fix: true,
    });
    expect(fixedFiles.get('a.md')).toBe('X H\n');
  });

  it('applies exceptions.lines to token-rule problems and fixes', async () => {
    const withException = rule({ exceptions: { lines: ['skip-me'] } });
    const md = '# skip-me\n\n# keep\n';
    const { problems, fixedFiles } = await runRules(
      [{ path: 'a.md', content: md }],
      [withException],
      { fix: true }
    );
    expect(problems.map((p) => p.line)).toEqual([3]);
    expect(fixedFiles.get('a.md')).toBe('# skip-me\n\nX keep\n');
  });

  it('honors fix: false for token rules', async () => {
    const noFix = rule({ fix: false });
    const { fixedFiles } = await runRules([{ path: 'a.md', content: '# H\n' }], [noFix], {
      fix: true,
    });
    expect(fixedFiles.size).toBe(0);
  });

  it('gives token rules comment-cleared ctx.lines, not the raw file', async () => {
    // Upstream markdownlint clears HTML comment content out of
    // `params.lines` globally, once, before ANY rule scans it (see
    // rules/token/helpers.ts's `clearHtmlCommentText` doc comment) --
    // matches core/runner.ts's `commentClearedLines` wiring. A synthetic
    // rule that echoes back ctx.lines[0] should see the cleared text, not
    // the original trailing-whitespace-bearing comment line.
    registerTokenRules([
      {
        ...testTokenRule,
        name: 'test-echo-line',
        check(ctx) {
          ctx.onError({ line: 1, column: 1, detail: `line0=${JSON.stringify(ctx.lines[0])}` });
        },
      },
    ]);
    const echoRule = rule({
      name: 'recheck/test-echo-line',
      shortName: 'test-echo-line',
      assertions: { 'test-echo-line': {} },
    });
    const md = '<!--   \nstuff\n-->\n';
    const { problems } = await runRules([{ path: 'a.md', content: md }], [echoRule]);
    // The raw first line has 3 trailing spaces after "<!--"; the cleared
    // version replaces them (trailing-space-before-newline is cleared to
    // the safe character too), so no trailing whitespace survives.
    expect(problems[0].message).not.toContain('<!--   "');
    expect(problems[0].message).toContain('<!--...');
  });

  it('returns only genuinely applied fixes in `fixes` and surfaces the rest as `skippedFixes`', async () => {
    // Two overlapping fixInfos in one pass: only one can land; the runner
    // must not report the dropped one as applied.
    registerTokenRules([
      {
        ...testTokenRule,
        name: 'test-overlapping-fixes',
        check(ctx) {
          ctx.onError({
            line: 1,
            fixInfo: { lineNumber: 1, editColumn: 2, deleteCount: 3, insertText: 'OVERLAP' },
          });
          ctx.onError({
            line: 1,
            fixInfo: { lineNumber: 1, editColumn: 1, deleteCount: 3, insertText: 'XYZ' },
          });
        },
      },
    ]);
    const overlapping = rule({
      name: 'recheck/test-overlapping-fixes',
      shortName: 'test-overlapping-fixes',
      assertions: { 'test-overlapping-fixes': {} },
    });
    const { fixes, skippedFixes, fixedFiles } = await runRules(
      [{ path: 'a.md', content: 'abcdef\n' }],
      [overlapping],
      { fix: true }
    );
    expect(fixedFiles.get('a.md')).toBe('aOVERLAPef\n');
    expect(fixes).toHaveLength(1);
    expect(fixes[0].insertText).toBe('OVERLAP');
    expect(skippedFixes).toHaveLength(1);
    expect(skippedFixes[0].insertText).toBe('XYZ');
  });

  it('runRulesUntilStable leaves skippedFixes pending only when passes are capped', async () => {
    // A pathological rule that always proposes two same-position inserts:
    // each pass applies one and skips the other, forever — so the
    // convergence loop exhausts MAX_FIX_PASSES (5) and the final pass's
    // skipped fix is still genuinely pending.
    registerTokenRules([
      {
        ...testTokenRule,
        name: 'test-never-stable',
        check(ctx) {
          ctx.onError({
            line: 1,
            fixInfo: { lineNumber: 1, editColumn: 1, deleteCount: 0, insertText: 'a' },
          });
          ctx.onError({
            line: 1,
            fixInfo: { lineNumber: 1, editColumn: 1, deleteCount: 0, insertText: 'b' },
          });
        },
      },
    ]);
    const neverStable = rule({
      name: 'recheck/test-never-stable',
      shortName: 'test-never-stable',
      assertions: { 'test-never-stable': {} },
    });
    const { fixes, skippedFixes } = await runRulesUntilStable(
      [{ path: 'a.md', content: 'x\n' }],
      [neverStable]
    );
    // One fix applied per pass, five passes; the last pass's loser is
    // still unapplied after the cap.
    expect(fixes).toHaveLength(5);
    expect(skippedFixes).toHaveLength(1);
  });

  it('a per-report severity override lands even though the rule is configured at a different severity', async () => {
    // markdoc-attributes relies on this: its "unknown attribute" reports must
    // stay `warn` even when the rule itself is configured at `severity: error`.
    registerTokenRules([
      {
        ...testTokenRule,
        name: 'test-severity-override',
        check(ctx) {
          for (const token of ctx.tree.flat) {
            if (token.type !== 'atxHeading') continue;
            ctx.onError({ line: token.startLine, column: token.startColumn, severity: 'warn' });
          }
        },
      },
    ]);
    const overrideRule = rule({
      name: 'recheck/test-severity-override',
      shortName: 'test-severity-override',
      severity: 'error',
      assertions: { 'test-severity-override': {} },
    });
    const { problems } = await runRules([{ path: 'a.md', content: '# H\n' }], [overrideRule]);
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('warn');
  });

  it("a report with no severity override falls back to the rule's own configured severity", async () => {
    registerTokenRules([
      {
        ...testTokenRule,
        name: 'test-no-severity-override',
        check(ctx) {
          for (const token of ctx.tree.flat) {
            if (token.type !== 'atxHeading') continue;
            ctx.onError({ line: token.startLine, column: token.startColumn });
          }
        },
      },
    ]);
    const noOverrideRule = rule({
      name: 'recheck/test-no-severity-override',
      shortName: 'test-no-severity-override',
      severity: 'error',
      assertions: { 'test-no-severity-override': {} },
    });
    const { problems } = await runRules([{ path: 'a.md', content: '# H\n' }], [noOverrideRule]);
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('error');
  });

  it('reports a crashing token rule as internal-error and continues', async () => {
    registerTokenRules([
      {
        ...testTokenRule,
        name: 'test-crash',
        check() {
          throw new Error('boom');
        },
      },
    ]);
    const crashing = rule({
      name: 'recheck/test-crash',
      shortName: 'test-crash',
      assertions: { 'test-crash': {} },
    });
    const { problems } = await runRules([{ path: 'a.md', content: '# H\n' }], [crashing]);
    expect(problems[0].ruleName).toBe('recheck/internal-error');
    expect(problems[0].message).toContain('boom');
  });
});
