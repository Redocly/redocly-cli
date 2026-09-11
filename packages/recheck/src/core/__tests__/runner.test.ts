import { describe, expect, it } from 'vitest';

import { scopeRules } from '../../rules/registry.js';
import type { NormalizedRule, Problem } from '../../types/index.js';
import { runRules, runRulesUntilStable } from '../runner.js';

// Test-only assertion: flags every matching segment; fix uppercases line 1.
scopeRules['test-flag-segments'] = {
  id: 'test-flag-segments',
  fixable: true,
  async execute(rule, file, ctx) {
    return ctx.segments.map((segment) => ({
      file,
      line: segment.startLine,
      column: segment.startColumn,
      text: segment.content,
      match: segment.content,
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.message ?? '',
    }));
  },
  async fix(rule, file) {
    return [
      { file, ruleName: rule.name, lineNumber: 1, editColumn: 1, deleteCount: 1, insertText: 'X' },
    ];
  },
};

// Test-only assertion: flags one problem per line of each segment's content.
scopeRules['test-flag-lines'] = {
  id: 'test-flag-lines',
  fixable: false,
  async execute(rule, file, ctx) {
    const problems: Problem[] = [];
    for (const segment of ctx.segments) {
      const lines = segment.content.split('\n');
      // Drop a trailing empty element caused by a final newline; it's not a real line.
      if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
      lines.forEach((lineText, index) => {
        problems.push({
          file,
          line: segment.startLine + index,
          column: 1,
          text: lineText,
          match: lineText,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message ?? '',
        });
      });
    }
    return problems;
  },
};

const rule = (overrides: Partial<NormalizedRule>): NormalizedRule => ({
  name: 'recheck/test',
  shortName: 'test',
  severity: 'error',
  message: 'flagged',
  assertions: { 'test-flag-segments': {} },
  ...overrides,
});

describe('runRules', () => {
  it('passes all matching segments to a scope rule in one call, with file line numbers', async () => {
    const md = '# One\n\npara\n\n## Two\n';
    const { problems } = await runRules(
      [{ path: 'a.md', content: md }],
      [rule({ scope: 'heading' })]
    );
    expect(problems.map((p) => p.line)).toEqual([1, 5]);
  });

  it('gives unscoped rules a single whole-file segment', async () => {
    const md = '# One\n\npara\n';
    const { problems } = await runRules([{ path: 'a.md', content: md }], [rule({})]);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('respects appliesTo/excludes file filters', async () => {
    const files = [
      { path: 'docs/a.md', content: '# A\n' },
      { path: 'other/b.md', content: '# B\n' },
    ];
    const { problems } = await runRules(files, [
      rule({ scope: 'heading', appliesTo: ['docs/**'] }),
    ]);
    expect(problems.map((p) => p.file)).toEqual(['docs/a.md']);
  });

  it('skips segments matching exceptions.lines', async () => {
    const md = '# keep\n\n# skip-me\n';
    const withException = rule({ scope: 'heading', exceptions: { lines: ['skip-me'] } });
    const { problems } = await runRules([{ path: 'a.md', content: md }], [withException]);
    expect(problems.map((p) => p.line)).toEqual([1]);
  });

  it('collects fixes into fixedFiles when fix option is set', async () => {
    const { fixedFiles } = await runRules(
      [{ path: 'a.md', content: 'abc\n' }],
      [rule({ scope: 'paragraph' })],
      { fix: true }
    );
    expect(fixedFiles.get('a.md')).toBe('Xbc\n');
  });

  it('applies exceptions.lines per line, not per segment, for unscoped rules', async () => {
    const md = 'ok one\nskip-me here\nok two\n';
    const withException = rule({
      assertions: { 'test-flag-lines': {} },
      exceptions: { lines: ['skip-me'] },
    });
    const { problems } = await runRules([{ path: 'a.md', content: md }], [withException]);
    expect(problems.map((p) => p.line)).toEqual([1, 3]);
  });

  it('drops fixes that target an excepted line', async () => {
    const withException = rule({ scope: 'paragraph', exceptions: { lines: ['abc'] } });
    const { fixedFiles } = await runRules([{ path: 'a.md', content: 'abc\n' }], [withException], {
      fix: true,
    });
    expect(fixedFiles.size).toBe(0);
  });

  it('reports a rule crash as an internal-error problem and continues', async () => {
    scopeRules['test-crash'] = {
      id: 'test-crash',
      fixable: false,
      async execute() {
        throw new Error('boom');
      },
    };
    const crashing = rule({ assertions: { 'test-crash': {} } });
    const { problems } = await runRules([{ path: 'a.md', content: 'x\n' }], [crashing]);
    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toBe('recheck/internal-error');
    expect(problems[0].message).toContain('boom');
  });
});

// Regression (Bugbot): extractScopes emits OVERLAPPING segments over the
// same source text (paragraph + its summary copy + its sentence spans), so
// a selector matching several of those kinds — a negation like `~code`
// (which matches every non-excluded segment) or a plain array mixing
// overlapping kinds like `[paragraph, sentence]` — handed a scope rule the
// same text several times and reported one underlying match once per
// segment. The runner now collapses exact duplicate SCOPE-rule findings
// (same ruleName, file, line, column, and message), keeping the first
// occurrence so ordering stays stable. Token-rule findings are exempt:
// upstream markdownlint legitimately reports same-position duplicates
// (see the MD032 test below) and parity totals count them. Fix proposals
// were never affected — applyFixesToContent already drops duplicate edits.
describe('runRules finding deduplication', () => {
  // paragraph + summary + 2 sentence segments over line 1; a fenced code
  // block (lines 3-5) that `~code` must keep excluding.
  const proseDoc = 'Alpha beta gamma. Delta epsilon zeta.\n\n```\nbeta\n```\n';
  const patternRule = (scope: string | string[], tokens: string[]) =>
    rule({ scope, message: "Found '%s'.", assertions: { pattern: { tokens } } });

  it('reports a negation-scope (~code) match exactly once despite overlapping segments', async () => {
    const { problems } = await runRules(
      [{ path: 'd.md', content: proseDoc }],
      [patternRule(['~code'], ['beta'])]
    );
    // One finding for the prose occurrence (previously three: paragraph,
    // summary, sentence), and none for the code-block occurrence on line 4.
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ line: 1, column: 7, message: "Found 'beta'." });
    // Keep-first: the surviving finding is the paragraph segment's — its
    // `text` is the full source line, not the trimmed sentence span.
    expect(problems[0].text).toBe('Alpha beta gamma. Delta epsilon zeta.');
  });

  it('reports a match once when plain array scopes overlap (paragraph + sentence)', async () => {
    const { problems } = await runRules(
      [{ path: 'd.md', content: proseDoc }],
      [patternRule(['paragraph', 'sentence'], ['beta'])]
    );
    expect(problems).toHaveLength(1);
  });

  it('keeps same-position findings whose messages differ', async () => {
    // A greedy token matches MORE text in the paragraph segment than in its
    // sentence sub-segment, so the two findings share a position but embed
    // different match text in their messages — those are genuinely distinct
    // reports and both must survive, in stable order.
    const { problems } = await runRules(
      [{ path: 'd.md', content: proseDoc }],
      [patternRule(['paragraph', 'sentence'], ['Alpha[^\\n]*'])]
    );
    expect(problems.map((problem) => problem.message)).toEqual([
      "Found 'Alpha beta gamma. Delta epsilon zeta.'.",
      "Found 'Alpha beta gamma.'.",
    ]);
  });

  it('deduplicates across assertion kinds only when findings are truly identical', async () => {
    // Same rule, two files: identical text/positions in different files
    // must NOT collapse — file is part of the identity key.
    const { problems } = await runRules(
      [
        { path: 'a.md', content: 'Alpha beta.\n' },
        { path: 'b.md', content: 'Alpha beta.\n' },
      ],
      [patternRule(['paragraph', 'sentence'], ['beta'])]
    );
    expect(problems.map((problem) => problem.file)).toEqual(['a.md', 'b.md']);
  });

  it('keeps token-rule same-position duplicates (MD032 parity)', async () => {
    // A single-line list with non-blank neighbors on BOTH sides: upstream
    // MD032/blanks-around-lists reports its blank-above error and its
    // blank-below error both AT the list's only line, with identical
    // context — two genuinely separate findings at one position. The
    // markdownlint parity harness counts both, so token-rule findings must
    // bypass the scope-finding dedup (a blanket dedup lost 51 MD032
    // findings over the monorepo-docs corpus). The line below the list is
    // a code fence because a plain paragraph line would lazily continue
    // the list item instead of ending the list.
    const doc = 'Text above\n- item\n~~~\ncode\n~~~\n';
    const { problems } = await runRules(
      [{ path: 'a.md', content: doc }],
      [rule({ assertions: { 'blanks-around-lists': {} } })]
    );
    expect(problems.map((problem) => problem.line)).toEqual([2, 2]);
  });
});

// Tracks which files a rule actually executed against, so cap tests can
// assert that files past the cap were never linted at all (memory for their
// problems is never allocated), not merely that their problems got dropped.
const executedFiles: string[] = [];
scopeRules['test-track-files'] = {
  id: 'test-track-files',
  fixable: false,
  async execute(rule, file, ctx) {
    executedFiles.push(file);
    const lines = ctx.segments[0].content.split('\n').filter((line) => line !== '');
    return lines.map((lineText, index) => ({
      file,
      line: index + 1,
      column: 1,
      text: lineText,
      match: lineText,
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.message ?? '',
    }));
  },
};

describe('runRules — maxProblems cap', () => {
  const trackingRule = () => rule({ assertions: { 'test-track-files': {} } });
  const fileWithLines = (path: string, count: number) => ({
    path,
    content: Array.from({ length: count }, (_, i) => `line ${i + 1}`).join('\n') + '\n',
  });

  it('stops linting further files at the cap, truncates overflow, and reports truncated', async () => {
    executedFiles.length = 0;
    const files = [fileWithLines('a.md', 7), fileWithLines('b.md', 7), fileWithLines('c.md', 7)];
    const { problems, truncated } = await runRules(files, [trackingRule()], { maxProblems: 10 });

    expect(problems).toHaveLength(10);
    expect(truncated).toBe(true);
    // a.md contributes all 7 problems, b.md only the 3 that fit the cap.
    expect(problems.filter((p) => p.file === 'a.md')).toHaveLength(7);
    expect(problems.filter((p) => p.file === 'b.md')).toHaveLength(3);
    // c.md was never linted at all — not just filtered out afterwards.
    expect(executedFiles).toEqual(['a.md', 'b.md']);
  });

  it('does not report truncated when the cap lands exactly on the final problem', async () => {
    executedFiles.length = 0;
    const files = [fileWithLines('a.md', 5), fileWithLines('b.md', 5)];
    const { problems, truncated } = await runRules(files, [trackingRule()], { maxProblems: 10 });

    expect(problems).toHaveLength(10);
    expect(truncated).toBe(false);
    expect(executedFiles).toEqual(['a.md', 'b.md']);
  });

  it('leaves uncapped runs untouched (truncated: false, all problems kept)', async () => {
    executedFiles.length = 0;
    const files = [fileWithLines('a.md', 7), fileWithLines('b.md', 7)];
    const { problems, truncated } = await runRules(files, [trackingRule()]);

    expect(problems).toHaveLength(14);
    expect(truncated).toBe(false);
    expect(executedFiles).toEqual(['a.md', 'b.md']);
  });

  it('runRulesUntilStable honors maxProblems the same way', async () => {
    executedFiles.length = 0;
    const files = [fileWithLines('a.md', 7), fileWithLines('b.md', 7), fileWithLines('c.md', 7)];
    const { problems, truncated } = await runRulesUntilStable(files, [trackingRule()], {
      maxProblems: 10,
    });

    expect(problems).toHaveLength(10);
    expect(truncated).toBe(true);
    expect(executedFiles).not.toContain('c.md');
  });
});

// Task 1 (Phase 3): inline `<!-- recheck-disable* -->` HTML-comment
// directives (core/directives.ts), wired into runRules at every
// `lineExcepted` filter site so a directive suppresses a rule's findings
// (and, under --fix, its fixes) exactly like an `exceptions.lines` match
// does. See directives.test.ts for parseDirectives' own unit coverage;
// these tests only check the runner wiring itself.
describe('runRules — inline directives', () => {
  // A real fixable token rule (no-trailing-spaces) named `oxford-comma` so a
  // directive's short name ('oxford-comma') matches it.
  const oxfordComma = () =>
    rule({
      name: 'recheck/oxford-comma',
      shortName: 'oxford-comma',
      assertions: { 'no-trailing-spaces': {} },
    });

  it('disable-next-line suppresses a problem AND its fix under --fix, leaving other lines untouched', async () => {
    // Line 3 is targeted by the disable-next-line on line 2; line 4 has the
    // same defect and must still be flagged and fixed.
    const md =
      'keep me\n' +
      '<!-- recheck-disable-next-line oxford-comma -->\n' +
      'trailing space here   \n' +
      'also trailing   \n';
    const { problems, fixedFiles } = await runRules(
      [{ path: 'a.md', content: md }],
      [oxfordComma()],
      { fix: true }
    );

    expect(problems.map((p) => p.line)).toEqual([4]);
    expect(fixedFiles.get('a.md')).toBe(
      'keep me\n' +
        '<!-- recheck-disable-next-line oxford-comma -->\n' +
        'trailing space here   \n' +
        'also trailing\n'
    );
  });

  // The SCOPE-rule fix filter site (runner.ts's scope branch of
  // `problemAllowed`) — the token-rule test above can't reach it, since
  // token fixes flow through a different filter site. `swap` is a real
  // fixable scope rule, so a directive must suppress both its problem AND
  // its proposed fix for the targeted line, while another line's identical
  // defect is still flagged and fixed.
  it('disable-next-line suppresses a fixable SCOPE rule problem AND its fix, other lines still fixed', async () => {
    const usSpelling: NormalizedRule = {
      name: 'recheck/us-spelling',
      shortName: 'us-spelling',
      severity: 'error',
      message: 'Use "%s" instead of "%s".',
      scope: 'all',
      assertions: { swap: { wordBoundary: true, pairs: { colour: 'color' } } },
    };
    const md =
      '<!-- recheck-disable-next-line us-spelling -->\n' +
      'keep this colour as written\n' +
      'but fix this colour here\n';
    const { problems, fixedFiles, fixes } = await runRules(
      [{ path: 'a.md', content: md }],
      [usSpelling],
      { fix: true }
    );

    expect(problems.map((p) => p.line)).toEqual([3]);
    expect(fixes.map((f) => f.lineNumber)).toEqual([3]);
    expect(fixedFiles.get('a.md')).toBe(
      '<!-- recheck-disable-next-line us-spelling -->\n' +
        'keep this colour as written\n' +
        'but fix this color here\n'
    );
  });

  it('disable-file yields only the directive warnings, suppressing every rule finding for that file', async () => {
    const md =
      'trailing space here   \n' +
      '<!-- recheck-disable no-such-rule -->\n' +
      '<!-- recheck-disable-file -->\n';
    const { problems } = await runRules([{ path: 'a.md', content: md }], [oxfordComma()]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      line: 2,
      severity: 'warn',
      ruleName: 'recheck-directive',
    });
    expect(problems[0].message).toContain('no-such-rule');
  });

  it('surfaces an unknown-rule-name directive warning in runRules().problems', async () => {
    const md = 'text\n<!-- recheck-disable no-such-rule -->\n';
    const { problems } = await runRules([{ path: 'a.md', content: md }], [oxfordComma()]);

    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toBe('recheck-directive');
    expect(problems[0].message).toContain('no-such-rule');
  });

  describe('knownRuleNames option', () => {
    // Callers (the CLI, lintContent/lintFiles) filter severity:off rules
    // out of the run list BEFORE runRules, so a directive naming an
    // off-rule would read as "unknown rule" if the default (names derived
    // from the run list) were the only source of truth. Passing the full
    // configured name set keeps those directives silently fine --
    // suppressing an off rule is a no-op, not a typo.
    it('does not warn for a directive naming a rule in knownRuleNames but absent from the run list', async () => {
      const md = 'text\n<!-- recheck-disable muted-rule -->\n';
      const { problems } = await runRules([{ path: 'a.md', content: md }], [oxfordComma()], {
        knownRuleNames: new Set(['recheck/oxford-comma', 'recheck/muted-rule']),
      });

      expect(problems).toEqual([]);
    });

    it('still warns for a directive name outside knownRuleNames', async () => {
      const md = 'text\n<!-- recheck-disable no-such-rule -->\n';
      const { problems } = await runRules([{ path: 'a.md', content: md }], [oxfordComma()], {
        knownRuleNames: new Set(['recheck/oxford-comma', 'recheck/muted-rule']),
      });

      expect(problems).toHaveLength(1);
      expect(problems[0].ruleName).toBe('recheck-directive');
      expect(problems[0].message).toContain('no-such-rule');
    });
  });
});
