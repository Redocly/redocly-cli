import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('line-length (MD013)', () => {
  const h = tokenRuleHarness('line-length');

  it('passes a clean line under the default 80-character limit', async () => {
    expect(await h.lint('This is a short line.\n')).toEqual([]);
  });

  it('flags a violation with exact line/column (column is maxLength+1)', async () => {
    const hShort = tokenRuleHarness('line-length', { lineLength: 20 });
    // 25 non-whitespace-terminated chars -> exempted (last run replaced with
    // '#' before length check) unless it also has internal whitespace.
    const problems = await hShort.lint('This line has spaces beyond the limit\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(21); // maxLength (20) + 1
    expect(problems[0].message).toContain('Expected: 20; Actual: 37');
  });

  it('codeBlocks: true (default) flags long lines inside fenced code; false exempts them', async () => {
    const md = '```text\nthis is a long code line that goes past the limit for sure\n```\n';
    const hStrictLen = tokenRuleHarness('line-length', { lineLength: 20, strict: true });
    const flagged = await hStrictLen.lint(md);
    expect(flagged.some((p) => p.line === 2)).toBe(true);

    const hNoCode = tokenRuleHarness('line-length', {
      lineLength: 20,
      strict: true,
      codeBlocks: false,
    });
    const exempted = await hNoCode.lint(md);
    expect(exempted.some((p) => p.line === 2)).toBe(false);
  });

  it('tables: true (default) flags long lines inside tables; false exempts them', async () => {
    const md =
      '| Column A long header | Column B long header |\n| --- | --- |\n| value | value |\n';
    const hStrictLen = tokenRuleHarness('line-length', { lineLength: 20, strict: true });
    const flagged = await hStrictLen.lint(md);
    expect(flagged.some((p) => p.line === 1)).toBe(true);

    const hNoTables = tokenRuleHarness('line-length', {
      lineLength: 20,
      strict: true,
      tables: false,
    });
    const exempted = await hNoTables.lint(md);
    expect(exempted.some((p) => p.line === 1)).toBe(false);
  });

  it('headings: true (default) flags long headings; false exempts them', async () => {
    const md = '# This is a rather long heading that goes past the limit\n';
    const hStrictLen = tokenRuleHarness('line-length', { lineLength: 20, strict: true });
    const flagged = await hStrictLen.lint(md);
    expect(flagged.some((p) => p.line === 1)).toBe(true);

    const hNoHeadings = tokenRuleHarness('line-length', {
      lineLength: 20,
      strict: true,
      headings: false,
    });
    const exempted = await hNoHeadings.lint(md);
    expect(exempted.some((p) => p.line === 1)).toBe(false);
  });

  it('normal vs strict vs stern semantics (doc/md013.md worked example, lineLength 34)', async () => {
    const md = [
      'IF THIS LINE IS THE MAXIMUM LENGTH',
      'This line is okay because there are-no-spaces-beyond-that-length',
      'This line is a violation because there are spaces beyond that length',
      'This-line-is-okay-because-there-are-no-spaces-anywhere-within',
      '',
    ].join('\n');

    const hNormal = tokenRuleHarness('line-length', { lineLength: 34 });
    const normalProblems = await hNormal.lint(md);
    expect(normalProblems.map((p) => p.line)).toEqual([3]);

    const hStrict = tokenRuleHarness('line-length', { lineLength: 34, strict: true });
    const strictProblems = await hStrict.lint(md);
    expect(strictProblems.map((p) => p.line)).toEqual([2, 3, 4]);

    const hStern = tokenRuleHarness('line-length', { lineLength: 34, stern: true });
    const sternProblems = await hStern.lint(md);
    expect(sternProblems.map((p) => p.line)).toEqual([2, 3]);
  });

  it('exempts standalone link-only lines in normal mode, and reference-definition lines even in strict mode', async () => {
    const md = [
      '# Heading',
      '',
      '[a very long link text that goes well past the configured limit](https://example.com/long/path)',
      '',
      '[ref]: https://example.com/another/very/long/path/that/exceeds/the/limit/for/sure',
      '',
    ].join('\n');
    // Normal mode: the link-only line is exempted (per doc/md013.md).
    const hNormal = tokenRuleHarness('line-length', { lineLength: 20 });
    const normalProblems = await hNormal.lint(md);
    expect(normalProblems.some((p) => p.line === 3)).toBe(false);
    expect(normalProblems.some((p) => p.line === 5)).toBe(false);

    // Strict mode: per md013.mjs's actual gate (`strict || (... &&
    // !linkOnlyLineNumbers...)`), `strict` short-circuits the link-only
    // exemption -- only the (unconditional) definition-line exemption
    // still applies. This is a documented upstream doc/code discrepancy;
    // the code (source of truth for this port) always flags link-only
    // lines under `strict`.
    const hStrict = tokenRuleHarness('line-length', { lineLength: 20, strict: true });
    const strictProblems = await hStrict.lint(md);
    expect(strictProblems.some((p) => p.line === 3)).toBe(true);
    expect(strictProblems.some((p) => p.line === 5)).toBe(false);
  });

  it('honors independent headingLineLength and codeBlockLineLength', async () => {
    const md =
      '# short heading\n\n' + 'a'.repeat(30) + '\n\n```text\n' + 'b'.repeat(30) + '\n```\n';
    const hCustom = tokenRuleHarness('line-length', {
      lineLength: 10,
      headingLineLength: 100,
      codeBlockLineLength: 100,
      strict: true,
    });
    const problems = await hCustom.lint(md);
    // Heading and code-block lines exempted by their own higher limits; the
    // body line is still flagged by the base lineLength.
    expect(problems.map((p) => p.line)).toEqual([3]);
  });

  it('does not flag long YAML frontmatter lines (regression)', async () => {
    // Upstream markdownlint slices frontmatter out of the content entirely
    // before any rule sees `params.lines` (see markdownlint's
    // removeFrontMatter) -- a long `description:` value in frontmatter is
    // structurally invisible to MD013, no matter how long. Recheck's
    // parser keeps frontmatter as real lines in `ctx.lines` instead, so a
    // long frontmatter value line was wrongly flagged as a line-length
    // violation even though upstream would never see it.
    const hShort = tokenRuleHarness('line-length', { lineLength: 20 });
    const longDescription = Array(10).fill('word').join(' '); // has internal spaces, so not exempted by the trailing-run rule
    const md = `---\ndescription: ${longDescription}\n---\n# Heading\n\nShort line.\n`;
    expect(await hShort.lint(md)).toEqual([]);
  });

  it('still flags a long body line immediately after frontmatter', async () => {
    const hShort = tokenRuleHarness('line-length', { lineLength: 20 });
    const longLine = Array(10).fill('word').join(' ');
    const md = `---\ndescription: short\n---\n${longLine}\n`;
    const problems = await hShort.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(4);
  });
});
