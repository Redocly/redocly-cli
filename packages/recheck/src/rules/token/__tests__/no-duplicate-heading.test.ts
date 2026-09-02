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
    const siblingsOnly = tokenRuleHarness('no-duplicate-heading', { siblingsOnly: true });
    const md = '# Change log\n\n## 1.0.0\n\n### Features\n\n## 2.0.0\n\n### Features\n';
    expect(await siblingsOnly.lint(md)).toEqual([]);
  });

  it('without siblingsOnly, repeated nested heading text is flagged', async () => {
    const md = '# Change log\n\n## 1.0.0\n\n### Features\n\n## 2.0.0\n\n### Features\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
  });

  it('respectSections allows same text in different sections by full path', async () => {
    const respectSections = tokenRuleHarness('no-duplicate-heading', { respectSections: true });
    const md = '# A\n\n## Common\n\n# B\n\n## Common\n';
    expect(await respectSections.lint(md)).toEqual([]);
  });

  it('respectSections still flags true duplicates within the same section', async () => {
    const respectSections = tokenRuleHarness('no-duplicate-heading', { respectSections: true });
    const md = '# A\n\n## Common\n\n## Common\n';
    const problems = await respectSections.lint(md);
    expect(problems).toHaveLength(1);
  });

  it('scales to thousands of headings with exact first-occurrence-wins counts', async () => {
    // Guards the Set-based dedup buckets (previously O(N^2) array
    // `.includes()` scans) against semantic drift at scale: 2,000 headings,
    // every 4th drawn from a 7-value duplicate pool, the rest unique.
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const level = (i % 3) + 1;
      const text = i % 4 === 0 ? `Duplicate pool ${i % 7}` : `Unique heading number ${i}`;
      lines.push(`${'#'.repeat(level)} ${text}`, '');
    }
    const md = lines.join('\n') + '\n';

    // Default mode: one global bucket — 500 pool headings, 7 distinct pool
    // texts, so all but the first occurrence of each are flagged.
    const problems = await h.lint(md);
    expect(problems).toHaveLength(500 - 7);

    // Every flagged line is a pool heading (never a unique one).
    expect(problems.every((p) => p.match.startsWith('Duplicate pool '))).toBe(true);
  });
});
