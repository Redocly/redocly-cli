import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('proper-names (MD044)', () => {
  const h = tokenRuleHarness('proper-names', { names: ['JavaScript', 'GitHub'] });

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
    const hNoCode = tokenRuleHarness('proper-names', { names: ['JavaScript'], codeBlocks: false });
    expect(await hNoCode.lint('```\njavascript\n```\n')).toEqual([]);
  });

  it('flags names inside a code block by default (codeBlocks: true)', async () => {
    const problems = await h.lint('```\njavascript\n```\n');
    expect(problems).toHaveLength(1);
  });

  it('honors htmlElements: false by not flagging a name inside an HTML tag/attribute (e.g. an href)', async () => {
    // htmlElements gates the htmlFlowData/htmlTextData scanned types (the
    // tag markup itself, e.g. a path in href="..."), not the tag's visible
    // text content (which is always plain `data` and always scanned).
    const hNoHtml = tokenRuleHarness('proper-names', { names: ['GitHub'], htmlElements: false });
    expect(await hNoHtml.lint('<a href="https://github.com">a link</a>\n')).toEqual([]);
  });

  it('flags a name inside an HTML tag/attribute by default (htmlElements: true)', async () => {
    const problems = await h.lint('<a href="https://github.com">a link</a>\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag a name that appears inside an autolink', async () => {
    expect(await h.lint('<https://github.com>\n')).toEqual([]);
  });

  it('does nothing when names is empty (default)', async () => {
    const hEmpty = tokenRuleHarness('proper-names');
    expect(await hEmpty.lint('javascript github\n')).toEqual([]);
  });

  it('passes a document with no configured names present', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
