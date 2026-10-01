import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-duplicate-heading (MD024)', () => {
  const h = tokenRuleHarness('no-duplicate-heading');

  it('passes headings with distinct text', async () => {
    expect(await h.lint('# Some text\n\n## Some more text\n')).toEqual([]);
  });

  it('flags a repeated heading with position', async () => {
    const problems = await h.lint('# Some text\n\n## Some text\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('siblingsOnly allows the same text under different parents', async () => {
    const siblingsOnly = tokenRuleHarness('no-duplicate-heading', {
      siblingsOnly: true,
    });
    const md = '# Change log\n\n## 1.0.0\n\n### Features\n\n## 2.0.0\n\n### Features\n';
    expect(await siblingsOnly.lint(md)).toEqual([]);
  });

  it('without siblingsOnly, repeated nested heading text is flagged', async () => {
    const md = '# Change log\n\n## 1.0.0\n\n### Features\n\n## 2.0.0\n\n### Features\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
  });

  it('respectSections allows same text in different sections by full path', async () => {
    const respectSections = tokenRuleHarness('no-duplicate-heading', {
      respectSections: true,
    });
    const md = '# A\n\n## Common\n\n# B\n\n## Common\n';
    expect(await respectSections.lint(md)).toEqual([]);
  });

  it('respectSections still flags true duplicates within the same section', async () => {
    const respectSections = tokenRuleHarness('no-duplicate-heading', {
      respectSections: true,
    });
    const md = '# A\n\n## Common\n\n## Common\n';
    const problems = await respectSections.lint(md);
    expect(problems).toHaveLength(1);
  });

  it('caseSensitive: false treats headings differing only in case as duplicates', async () => {
    const md = '# Foo\n\n## foo\n';
    expect(await h.lint(md)).toEqual([]);
    const insensitive = tokenRuleHarness('no-duplicate-heading', {
      caseSensitive: false,
    });
    const problems = await insensitive.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('ignoreCommonHeadings skips boilerplate headings (listed names match case-insensitively) but still flags others', async () => {
    const md =
      '# Doc\n\n## Examples\n\n## Examples\n\n## Getting Started\n\n## Getting Started\n\n## Other\n\n## Other\n';
    expect((await h.lint(md)).map((p) => p.line)).toEqual([5, 9, 13]);
    const ignoreCommon = tokenRuleHarness('no-duplicate-heading', {
      ignoreCommonHeadings: true,
    });
    expect((await ignoreCommon.lint(md)).map((p) => p.line)).toEqual([13]);
  });
});
