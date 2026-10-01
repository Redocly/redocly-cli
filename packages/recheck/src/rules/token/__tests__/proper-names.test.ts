import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('proper-names (MD044)', () => {
  const h = tokenRuleHarness('proper-names', {
    names: ['JavaScript', 'GitHub'],
  });

  it('passes correctly-capitalized proper names', async () => {
    expect(await h.lint('I love JavaScript and GitHub.\n')).toEqual([]);
  });

  it('flags an incorrectly-capitalized name, exact line/column', async () => {
    const problems = await h.lint('I love javascript.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(8);
    expect(problems[0].message).toContain('Expected: JavaScript; Actual: javascript');
  });

  it('fixes an incorrectly-capitalized name, exact output', async () => {
    const fixed = await h.fix('I love javascript.\n');
    expect(fixed).toBe('I love JavaScript.\n');
  });

  it('honors codeBlocks: false by not flagging names inside a code block', async () => {
    const hNoCode = tokenRuleHarness('proper-names', {
      names: ['JavaScript'],
      codeBlocks: false,
    });
    expect(await hNoCode.lint('```\njavascript\n```\n')).toEqual([]);
  });

  it('flags names inside a code block by default (codeBlocks: true)', async () => {
    const problems = await h.lint('```\njavascript\n```\n');
    expect(problems).toHaveLength(1);
  });

  it('honors htmlElements: false by not flagging a name inside an HTML tag/attribute (e.g. an href)', async () => {
    // `htmlElements` controls whether tag markup (e.g. an href) is scanned, not the visible text.
    const hNoHtml = tokenRuleHarness('proper-names', {
      names: ['GitHub'],
      htmlElements: false,
    });
    expect(await hNoHtml.lint('<a href="https://github.com">a link</a>\n')).toEqual([]);
  });

  it('flags a name inside an HTML tag/attribute by default (htmlElements: true)', async () => {
    const problems = await h.lint('<a href="https://github.com">a link</a>\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag a name that appears inside an autolink', async () => {
    expect(await h.lint('<https://github.com>\n')).toEqual([]);
  });

  it('matches names containing regex metacharacters literally', async () => {
    const hMeta = tokenRuleHarness('proper-names', { names: ['Node.js', '.NET', 'C++'] });
    expect(await hMeta.fix('Use node.js and .net and c++ here.\n')).toBe(
      'Use Node.js and .NET and C++ here.\n'
    );
    expect(await hMeta.lint('Use nodexjs here.\n')).toEqual([]);
  });

  it('prefers the longest name when one configured name contains another', async () => {
    const hOverlap = tokenRuleHarness('proper-names', { names: ['GitHub', 'GitHub Actions'] });
    expect(await hOverlap.fix('Use github actions.\n')).toBe('Use GitHub Actions.\n');
  });

  it('does nothing when names is empty (default)', async () => {
    const hEmpty = tokenRuleHarness('proper-names');
    expect(await hEmpty.lint('javascript github\n')).toEqual([]);
  });
});
