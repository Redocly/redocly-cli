import { describe, it, expect } from 'vitest';

import { applyFixesToContent } from '../../../core/auto-fix.js';
import { runRules } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';
import { semanticLineBreaks as semanticLineBreaksAssertion } from '../semantic-line-breaks.js';
import { buildWholeFileContext } from './helpers.js';

const id = 'semantic-line-breaks';

describe('semantic-line-breaks assertion', () => {
  function createTestRule(options: { [key: string]: any }): NormalizedRule {
    return {
      name: `recheck/${id}`,
      shortName: id,
      severity: 'error',
      message: 'Test message',
      link: '',
      scope: 'all',
      assertions: {
        [id]: options,
      },
    };
  }

  describe('semantic-line-breaks assertion', () => {
    it('should detect multiple sentences on the same line in sentence mode', async () => {
      const content = 'First sentence. Second sentence.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('should ignore headings', async () => {
      const content = '# First. Second.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('flags a bullet item with two sentences', async () => {
      const content = '* First sentence. Second sentence.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('does not flag a bullet item with one sentence', async () => {
      const content = '- One sentence only, nothing to split here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('flags a dash bullet with two sentences and inline code', async () => {
      const content =
        '- Consumes: optional `aws-access-key-id` and `aws-secret-access-key`. Ambient AWS env from the caller when those inputs are empty.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('flags a numbered list item with two sentences', async () => {
      const content = '1. First sentence. Second sentence.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('does not flag a numbered item whose only extra "sentence" is its own marker', async () => {
      const content = '1. One sentence only.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('still skips a top-level lettered pseudo-list line', async () => {
      const content = 'a. Lettered item text. It stays skipped.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    // Add all other tests from the original file here, refactored to use the new structure
    it('should not flag lines with markdown links containing periods', async () => {
      const content = 'Check out [this link](http://example.com).';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('should detect sentences followed by markdown links', async () => {
      const content =
        'Configure their values in the envVariables field. [Learn more about environment variables](../customization/configure-request-values.md).';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('should detect multiple sentences with markdown links in between', async () => {
      const content = 'First sentence. [Some link](http://example.com) Second sentence.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('should detect sentences followed by code spans', async () => {
      const content =
        'When user change file, he should be navigated on that page in portal. `Editor sends message to portal`.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('should detect sentences followed by double quotes', async () => {
      const content = 'First sentence. "Here is a quote with content." Second sentence follows.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('should detect sentences followed by single quotes', async () => {
      const content = "First sentence. 'Here is another quote.' Second sentence follows.";
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('should NOT split on abbreviations like e.g.', async () => {
      const content =
        'There is no way to use some existing components (e.g. `OpenApiTryIt`) in markdown files.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('should NOT split on other common abbreviations', async () => {
      const content =
        'Compare this vs. that option and see i.e. the difference between them etc. in the docs.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    // Regression for the old countActualSentences regex: its sentence-end
    // pattern (`/[.!?]+(\s+[A-Z\[`"']|$)/g`) counted BOUNDARIES, not
    // sentences, and its `$` alternative gave lines ending in `.!?` a free
    // extra "boundary" that lines ending in other punctuation (or no
    // punctuation) never got. A line ending in ':' with exactly one real
    // sentence-break (two real sentences) landed on a boundary count of 1,
    // which the old `sentenceCount > 1` check silently let through --
    // requiring a THIRD sentence to ever flag. splitSentences counts
    // sentences directly, so two real sentences flags correctly regardless
    // of trailing punctuation. See the parity report for the full
    // docs/-corpus evidence (454 previously-missed real violations).
    it('flags two real sentences even when the line does not end in terminal punctuation', async () => {
      const content =
        'Each operation specifies the applicable requirement. Typical responses include:';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });
  });

  describe('AST-derived code-block and table exclusion', () => {
    // The old detector toggled on any line literally starting with
    // "```", so it never recognized tilde fences or indented code blocks.
    // Deriving codeBlockLines from `filterByTypes(ctx.tree, ['codeFenced',
    // 'codeIndented'])` (the same whole-file-derivation pattern
    // line-length.ts uses) catches every code-block form.
    it('excludes a tilde-fenced code block when ignoreCodeBlocks is set', async () => {
      const content = '~~~\nFirst sentence. Second sentence.\n~~~\n';
      const rule = createTestRule({ mode: 'sentence', ignoreCodeBlocks: true });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('excludes an indented code block when ignoreCodeBlocks is set', async () => {
      const content = '    First sentence. Second sentence.\n';
      const rule = createTestRule({ mode: 'sentence', ignoreCodeBlocks: true });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    // The old detector treated ANY line containing a literal '|' as a
    // table row, a false positive for prose or code spans that merely
    // mention a pipe character. Deriving tableLines from
    // `filterByTypes(ctx.tree, ['table'])` only excludes real GFM tables.
    it('does not skip a non-table line that merely contains a literal pipe character', async () => {
      const content = 'Use the `true|false` flag to toggle logging. Then restart.';
      const rule = createTestRule({ mode: 'sentence', ignoreTables: true });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
    });

    it('still excludes a real GFM table when ignoreTables is set', async () => {
      const content = '| A sentence. | Another. |\n| --- | --- |\n| One. Two. | x |\n';
      const rule = createTestRule({ mode: 'sentence', ignoreTables: true });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });
  });

  // Regression: isSkippableLine had a bullet+LETTERED-list heuristic
  // (`- a. Text`) but no bullet+NUMBERED-list analog, so a nested sub-list
  // item like `  - 1. Rework permissions` reads its "1." as an abbreviated
  // sentence end (`splitSentences` sees digit-then-period-then-space-then-
  // capital and, since the char after isn't also a digit, doesn't treat it
  // as a decimal) and gets flagged as two sentences. --fix then severs the
  // marker from its own text. See docs/intranet/archive/roadmap/workflows/
  // 2021-04/permissions-sso.md and .../2021-06/project-level-access-and-
  // teams.md for the real-corpus instances this was firing on.
  describe('nested numbered sub-list markers', () => {
    const content = '  - 1. Rework permissions\n  - 3. [SCIM](https://docs.github.com/x)\n';

    it('does not flag `- 1. Text` / `- 3. [Link](url)` single-sentence nested lines', async () => {
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);
    });

    it('--fix on single-sentence nested lines is a no-op (byte-identical output)', async () => {
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe(content);
    });

    it('flags a nested numbered item that really holds two sentences', async () => {
      const twoSentences = '  - 1. First one here. Second one here.\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(twoSentences);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(applyFixesToContent(twoSentences, fixes).content).toBe(
        '  - 1. First one here.\n       Second one here.\n'
      );
    });

    it('scoped and whole-file runs agree on nested numbered lines', async () => {
      const flagging = '- 1. First one here. Second one here.\n';
      const silent = '- 1. Rework permissions\n';
      for (const scope of [undefined, 'summary'] as const) {
        const rule: NormalizedRule = {
          name: `recheck/${id}`,
          shortName: id,
          severity: 'error',
          message: 'Use semantic line breaks (%s mode).',
          link: '',
          scope,
          assertions: { [id]: { mode: 'sentence' } },
        };
        const flaggingRun = await runRules([{ path: 't.md', content: flagging }], [rule], {});
        expect(flaggingRun.problems.length, `scope=${scope}`).toBe(1);
        const silentRun = await runRules([{ path: 't.md', content: silent }], [rule], {});
        expect(silentRun.problems.length, `scope=${scope}`).toBe(0);
      }
    });

    it('still skips a lettered nested line even with two sentences', async () => {
      const lettered = '- a. Lettered text here. More lettered text.\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(lettered);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(0);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(applyFixesToContent(lettered, fixes).content).toBe(lettered);
    });
  });

  // Regression: fix() only skipped blank lines and '#' headings, a weaker
  // gate than execute()'s (codeBlockLines/tableLines derived from the tree,
  // plus isSkippableLine). That let --fix rewrite lines lint never flagged
  // as problems in the first place -- e.g. an indented code-block line or a
  // table row containing what looks like two sentences, even with
  // ignoreCodeBlocks/ignoreTables on. fix() must use the exact same
  // skip-decision as execute().
  describe('fix() gating matches execute() gating', () => {
    it('does not rewrite a two-sentence line inside an indented code block when ignoreCodeBlocks is set', async () => {
      const content = '    First sentence. Second sentence.\n';
      const rule = createTestRule({ mode: 'sentence', ignoreCodeBlocks: true });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe(content);
    });

    it('does not rewrite a table row with two sentences when ignoreTables is set', async () => {
      const content = '| A sentence. | Another. |\n| --- | --- |\n| One. Two. | x |\n';
      const rule = createTestRule({ mode: 'sentence', ignoreTables: true });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe(content);
    });
  });

  describe('list-item auto-fix', () => {
    it('reflows a bullet item and indents continuation under the content', async () => {
      const content = '- First sentence. Second sentence.\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('- First sentence.\n  Second sentence.\n');
    });

    it('reflows a numbered item without severing its own marker', async () => {
      const content = '1. First sentence. Second sentence.\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('1. First sentence.\n   Second sentence.\n');
    });

    it('reflows an indented nested bullet, keeping its indent', async () => {
      const content = '  - First sentence. Second sentence.\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('  - First sentence.\n    Second sentence.\n');
    });

    it('flags and reflows a bullet inside an admonition tag', async () => {
      const content =
        '{% admonition type="warning" %}\n- Inside first. Inside second.\n{% /admonition %}\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(applyFixesToContent(content, fixes).content).toBe(
        '{% admonition type="warning" %}\n- Inside first.\n  Inside second.\n{% /admonition %}\n'
      );
    });

    it('flags and reflows a Markdoc table cell with two sentences', async () => {
      const content =
        '{% table %}\n\n- Option\n\n---\n\n- Cell first. Cell second.\n\n{% /table %}\n';
      const rule = createTestRule({ mode: 'sentence', ignoreTables: true });
      const ctx = buildWholeFileContext(content);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(applyFixesToContent(content, fixes).content).toBe(
        '{% table %}\n\n- Option\n\n---\n\n- Cell first.\n  Cell second.\n\n{% /table %}\n'
      );
    });
  });

  describe('semantic-line-breaks auto-fix', () => {
    it('should fix simple paragraphs with multiple sentences', async () => {
      const content = 'First sentence. Second sentence.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe('First sentence.\nSecond sentence.');
    });

    it('should fix sentences followed by markdown links', async () => {
      const content =
        'Configure their values in the envVariables field. [Learn more about environment variables](../customization/configure-request-values.md).';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe(
        'Configure their values in the envVariables field.\n[Learn more about environment variables](../customization/configure-request-values.md).'
      );
    });

    it('should fix multiple sentences with markdown links in between', async () => {
      const content = 'First sentence. [Some link](http://example.com) Second sentence.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe(
        'First sentence.\n[Some link](http://example.com) Second sentence.'
      );
    });

    it('should fix sentences followed by code spans', async () => {
      const content =
        'When user change file, he should be navigated on that page in portal. `Editor sends message to portal`.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe(
        'When user change file, he should be navigated on that page in portal.\n`Editor sends message to portal`.'
      );
    });

    it('should fix sentences followed by double quotes', async () => {
      const content = 'First sentence. "Here is a quote with content." Second sentence follows.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe(
        'First sentence.\n"Here is a quote with content."\nSecond sentence follows.'
      );
    });

    it('should fix sentences followed by single quotes', async () => {
      const content = "First sentence. 'Here is another quote.' Second sentence follows.";
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe(
        "First sentence.\n'Here is another quote.'\nSecond sentence follows."
      );
    });

    // Add all other fix tests from the original file here, refactored to use the new structure

    it('is idempotent: re-fixing already-fixed content produces no further fixes or problems', async () => {
      const content = 'First sentence. Second sentence. Third sentence.';
      const rule = createTestRule({ mode: 'sentence' });

      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes.length).toBeGreaterThan(0);
      const fixedContent = applyFixesToContent(content, fixes).content;

      const fixedCtx = buildWholeFileContext(fixedContent);
      const fixesAgain = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', fixedCtx)) ?? [];
      expect(fixesAgain).toHaveLength(0);

      const problemsAfter = await semanticLineBreaksAssertion.execute(rule, 'test.md', fixedCtx);
      expect(problemsAfter).toHaveLength(0);
    });
  });

  // Regression (Cursor finding 3): fix() rebuilt the first sentence line from
  // splitSentences' TRIMMED text (`sentence.text`), which drops any leading
  // prefix on the original line that trim() strips as whitespace -- losing an
  // indented line's leading indentation entirely (the prefix has nowhere to
  // go: unlike a blockquote's '>' marker, which is non-whitespace and so
  // survives String.prototype.trim regardless, pure leading whitespace before
  // the first sentence is trimmed away by splitSentences and never
  // reattached). Fix: reconstruct the first line as
  // `lineText.slice(0, firstSentence.start) + firstSentence.text` -- the true
  // original prefix -- instead of the trimmed sentence text alone.
  describe('fix() preserves the original line prefix on the first sentence', () => {
    it('preserves a blockquote marker on the first sentence line', async () => {
      const content = '> First sentence here. Second sentence here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent.split('\n')[0]).toBe('> First sentence here.');
    });

    it('preserves leading indentation before a blockquote marker on the first sentence line', async () => {
      // Two spaces of indentation before '>' ARE plain whitespace, so
      // splitSentences' trim() strips them -- this is the case that actually
      // demonstrates the bug (the '>' marker itself can never be trimmed
      // away, since trim() only removes whitespace and stops at the first
      // non-whitespace character).
      const content = '  > First sentence here. Second sentence here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent.split('\n')[0]).toBe('  > First sentence here.');
    });

    it('preserves leading indentation on an indented two-sentence line', async () => {
      const content = '   First. Second.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent.split('\n')[0]).toBe('   First.');
    });
  });

  // Regression: fix() built continuation lines from
  // calculateContinuationIndent, which only understood list markers and
  // plain indentation -- it never re-added blockquote '>' markers. So
  // '  > First. Second.' fixed to '  > First.\n  Second.': Markdown lazy
  // continuation still renders the second line inside the blockquote, but
  // the semantic-line-breaks convention (and any human reader) wants every
  // split line to carry the same blockquote prefix. Continuation lines must
  // repeat the line's blockquote prefix (leading whitespace plus '>'
  // markers) VERBATIM, with any trailing list marker replaced by spaces of
  // equal visual width -- and plain non-blockquote lines must keep today's
  // continuation behavior byte-for-byte.
  describe('fix() re-adds blockquote markers on continuation lines', () => {
    it('repeats "> " on the continuation line', async () => {
      const content = '> First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('> First one here.\n> Second one here.');
    });

    it('repeats an indented "  > " prefix on the continuation line', async () => {
      const content = '  > First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('  > First one here.\n  > Second one here.');
    });

    it('repeats a nested "> > " prefix on the continuation line', async () => {
      const content = '> > First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('> > First one here.\n> > Second one here.');
    });

    // A blockquoted bullet ('> - Text') is NOT skipped by isSkippableLine
    // (the raw line starts with '>', not '-', and none of the list-marker
    // regexes match through a blockquote prefix), so execute() flags it and
    // fix() must keep the '> ' verbatim while replacing the '- ' marker
    // with spaces so the continuation aligns under the list content.
    it('flags a blockquoted bullet and aligns its continuation under the list content', async () => {
      const content = '> - First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('> - First one here.\n>   Second one here.');
    });

    it('is idempotent for blockquoted lines: re-fixing fixed output is byte-identical', async () => {
      const content = '  > First one here. Second one here. Third one here.';
      const rule = createTestRule({ mode: 'sentence' });

      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('  > First one here.\n  > Second one here.\n  > Third one here.');

      const fixedCtx = buildWholeFileContext(fixedContent);
      const fixesAgain = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', fixedCtx)) ?? [];
      const refixedContent = applyFixesToContent(fixedContent, fixesAgain).content;
      expect(refixedContent).toBe(fixedContent);

      const problemsAfter = await semanticLineBreaksAssertion.execute(rule, 'test.md', fixedCtx);
      expect(problemsAfter).toHaveLength(0);
    });

    // Locks today's plain-indent continuation behavior: with no blockquote
    // marker anywhere, continuation lines get plain leading whitespace
    // exactly as before -- the blockquote handling must not change this.
    it('regression: plain-indent continuation lines keep plain whitespace', async () => {
      const content = '   First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe('   First one here.\n   Second one here.');
    });
  });

  // Regression (Cursor finding 4): execute() only ever flags a line when
  // `options.mode === 'sentence'` (see the `if (options.mode === 'sentence')`
  // gate above), but fix() split every multi-sentence line unconditionally,
  // regardless of `mode`. That let --fix rewrite lines under e.g.
  // `mode: 'phrase'` that lint never flagged as problems in the first place.
  // fix() must use the exact same mode gate as execute().
  describe('fix() respects the configured mode like execute() does', () => {
    it('is a byte-identical no-op under mode: phrase for a two-sentence line', async () => {
      const content = 'First sentence. Second sentence.';
      const rule = createTestRule({ mode: 'phrase' });
      const ctx = buildWholeFileContext(content);

      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(0);

      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(fixes).toHaveLength(0);
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe(content);
    });
  });

  // CRLF content: execute() must flag multi-sentence CRLF lines exactly
  // like their LF twins (no '\r' confusing the line split or the sentence
  // splitter), and --fix output must come back with the file's own CRLF
  // endings preserved (the applier writes insertText '\n's using the
  // file's preferred line ending).
  describe('CRLF content', () => {
    it('flags a multi-sentence CRLF line just like the LF twin', async () => {
      const content = 'First sentence here. Second sentence here.\r\nAnother line of text.\r\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(1);
    });

    it('--fix splits the line and preserves CRLF endings byte-for-byte', async () => {
      const content = 'First sentence here. Second sentence here.\r\nAnother line of text.\r\n';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      const fixedContent = applyFixesToContent(content, fixes).content;
      expect(fixedContent).toBe(
        'First sentence here.\r\nSecond sentence here.\r\nAnother line of text.\r\n'
      );
    });
  });

  // Regression (Bugbot): isSkippableLine treated ANY line starting with '*'
  // or '-' as a list line, with no marker-spacing requirement (unlike the
  // neighboring numbered/lettered-list checks, which all require '. ' after
  // the marker). Multi-sentence prose that merely STARTS with an emphasis
  // marker ('*text* ...'), strong ('**text** ...'), or a non-list dash
  // ('-3 degrees ...') was silently neither reported nor fixed. A bullet
  // line is CommonMark's optional-indent + [-*+] + space/tab -- anything
  // else starting with those characters is ordinary prose.
  describe('marker spacing required for the bullet-line skip', () => {
    const proseCases: [string, string, string][] = [
      [
        'emphasis start',
        '*emphasis* prose here. Second sentence here.',
        '*emphasis* prose here.\nSecond sentence here.',
      ],
      [
        'strong start',
        '**strong** opening here. Second sentence here.',
        '**strong** opening here.\nSecond sentence here.',
      ],
      [
        'negative-number start',
        '-3 degrees here. Second sentence here.',
        '-3 degrees here.\nSecond sentence here.',
      ],
    ];

    for (const [label, content, expected] of proseCases) {
      it(`flags multi-sentence prose with a ${label} under whole-file scope`, async () => {
        const rule = createTestRule({ mode: 'sentence' });
        const ctx = buildWholeFileContext(content);
        const problems = await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx);
        expect(problems).toHaveLength(1);
        expect(problems[0].line).toBe(1);
      });

      it(`fixes the ${label} line preserving the marker-like text as content`, async () => {
        const rule = createTestRule({ mode: 'sentence' });
        const ctx = buildWholeFileContext(content);
        const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
        const fixedContent = applyFixesToContent(content, fixes).content;
        expect(fixedContent).toBe(expected);

        // Idempotent: the fixed output produces no further problems/fixes.
        const fixedCtx = buildWholeFileContext(fixedContent);
        expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', fixedCtx)).toHaveLength(
          0
        );
        expect(
          (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', fixedCtx)) ?? []
        ).toHaveLength(0);
      });
    }

    // Real list lines must STAY skipped under whole-file scope: CommonMark
    // bullets are '-', '*', AND '+' (the '+' marker was previously missing
    // from isSkippableLine, so '+' items were flagged -- inconsistent with
    // their '-'/'*' twins -- and "fixed" with an unaligned continuation
    // line that fell out of the list item).
    for (const marker of ['-', '*', '+']) {
      it(`flags and reflows a real '${marker}' bullet line under whole-file scope`, async () => {
        const content = `${marker} First one here. Second one here.`;
        const rule = createTestRule({ mode: 'sentence' });
        const ctx = buildWholeFileContext(content);
        expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
        const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
        expect(applyFixesToContent(content, fixes).content).toBe(
          `${marker} First one here.\n  Second one here.`
        );
      });
    }

    it('flags and reflows a numbered list line without severing its marker', async () => {
      const content = '1. First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
      const fixes = (await semanticLineBreaksAssertion.fix?.(rule, 'test.md', ctx)) ?? [];
      expect(applyFixesToContent(content, fixes).content).toBe(
        '1. First one here.\n   Second one here.'
      );
    });

    it('flags an indented bullet line under whole-file scope', async () => {
      const content = '  - First one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
    });

    it('flags a bullet whose marker is followed by a tab', async () => {
      const content = '-\tFirst one here. Second one here.';
      const rule = createTestRule({ mode: 'sentence' });
      const ctx = buildWholeFileContext(content);
      expect(await semanticLineBreaksAssertion.execute(rule, 'test.md', ctx)).toHaveLength(1);
    });

    // '+' consistency in calculateContinuationIndent: under a scoped run
    // the raw line keeps its marker and the continuation must align under
    // the list CONTENT ('+ ' -> two spaces), exactly like '-'/'*' bullets.
    it("aligns the continuation under a '+' bullet's content when fixing under scope: summary", async () => {
      const doc = '+ First one here. Second one here.\n';
      const scopedRule: NormalizedRule = {
        name: `recheck/${id}`,
        shortName: id,
        severity: 'error',
        message: 'Use semantic line breaks (%s mode).',
        link: '',
        scope: 'summary',
        assertions: { [id]: { mode: 'sentence', ignoreCodeBlocks: true, ignoreTables: true } },
      };
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: doc }],
        [scopedRule],
        {
          fix: true,
        }
      );
      expect(problems.map((problem) => problem.line)).toEqual([1]);
      expect(fixedFiles.get('t.md')).toBe('+ First one here.\n  Second one here.\n');
    });
  });

  // Regression (Bugbot): under a scoped run (scope: summary / list-item /
  // default) a list item's segment content is the SEMANTIC text with the
  // list marker stripped by the token boundaries — the item's `content`
  // token starts after the `- ` prefix. fix() used to rebuild replacement
  // lines from that marker-less segment text and apply them with
  // deleteCount: -1 (whole-line replace), so --fix turned
  // `- First. Second.` into marker-less `First.\nSecond.`, corrupting the
  // list. fix() must reconstruct from the RAW source line (ctx.content):
  // the first line keeps everything in the raw line before the first
  // sentence (indentation + blockquote markers + list marker) and
  // continuation lines get calculateContinuationIndent(rawLine). These
  // tests run through runRules end-to-end so the scope selector, summary
  // aliasing, and the fix applier are exercised exactly as a real scoped
  // config hits them.
  describe('scoped runs preserve raw-line prefixes in --fix', () => {
    const scopedRule = (scope?: string): NormalizedRule => ({
      name: `recheck/${id}`,
      shortName: id,
      severity: 'error',
      message: 'Use semantic line breaks (%s mode).',
      link: '',
      ...(scope === undefined ? {} : { scope }),
      assertions: { [id]: { mode: 'sentence', ignoreCodeBlocks: true, ignoreTables: true } },
    });
    const listDoc = '- First one here. Second one here.\n';

    // 'default' is the permanent alias of 'summary' (see selector ALIASES)
    // and must behave identically to it.
    for (const scope of ['summary', 'list-item', 'default']) {
      it(`keeps the list marker when fixing a multi-sentence bullet under scope: ${scope}`, async () => {
        const { problems, fixedFiles } = await runRules(
          [{ path: 't.md', content: listDoc }],
          [scopedRule(scope)],
          { fix: true }
        );
        expect(problems.map((problem) => problem.line)).toEqual([1]);
        expect(fixedFiles.get('t.md')).toBe('- First one here.\n  Second one here.\n');
      });
    }

    it('keeps blockquote + list markers when fixing "> - ..." under scope: summary', async () => {
      const doc = '> - First one here. Second one here.\n';
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: doc }],
        [scopedRule('summary')],
        { fix: true }
      );
      // Both the blockquote segment and the nested list-item segment cover
      // this line, and both flag the same position — what matters here is
      // that every produced fix reconstructs the same raw-prefixed
      // replacement (matching the whole-file expectation for '> - ...'
      // lines), so the applier collapses them instead of letting a
      // marker-less rewrite win.
      expect(new Set(problems.map((problem) => `${problem.line}:${problem.column}`)).size).toBe(1);
      expect(fixedFiles.get('t.md')).toBe('> - First one here.\n>   Second one here.\n');
    });

    it('is idempotent under a scoped fix: re-running on fixed output is a no-op', async () => {
      const doc = '- First one here. Second one here. Third one here.\n';
      const first = await runRules([{ path: 't.md', content: doc }], [scopedRule('summary')], {
        fix: true,
      });
      const fixed = first.fixedFiles.get('t.md') ?? '';
      expect(fixed).toBe('- First one here.\n  Second one here.\n  Third one here.\n');

      const second = await runRules([{ path: 't.md', content: fixed }], [scopedRule('summary')], {
        fix: true,
      });
      expect(second.problems).toHaveLength(0);
      expect(second.fixedFiles.size).toBe(0);
    });

    // Locks the whole-file path: with no scope configured (what the
    // real-world configs use), the rule sees raw lines, isSkippableLine
    // skips marker-prefixed lines entirely, and plain paragraphs split
    // exactly as before — byte-identical to the pre-raw-line behavior.
    it('whole-file runs (no scope) reflow bullet lines the same way scoped runs do', async () => {
      const doc = '- Bullet first. Bullet second.\n\nPara first. Para second.\n';
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: doc }],
        [scopedRule(undefined)],
        { fix: true }
      );
      expect(problems.map((problem) => problem.line)).toEqual([1, 3]);
      expect(fixedFiles.get('t.md')).toBe(
        '- Bullet first.\n  Bullet second.\n\nPara first.\nPara second.\n'
      );
    });
  });
});
