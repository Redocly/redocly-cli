import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('heading-increment (MD001)', () => {
  const h = tokenRuleHarness('heading-increment');

  it('passes sequential heading levels', async () => {
    expect(await h.lint('# 1\n\n## 2\n\n### 3\n')).toEqual([]);
  });
  it('flags a skipped level with position and detail', async () => {
    const problems = await h.lint('# 1\n\n### 3\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain('Expected: h2; Actual: h3');
  });
  it('treats a frontmatter title as h1', async () => {
    const problems = await h.lint('---\ntitle: T\n---\n\n### deep\n');
    expect(problems).toHaveLength(1);
  });
  it('allows any first heading level without frontmatter title', async () => {
    expect(await h.lint('### start\n\n#### next\n')).toEqual([]);
  });
});
