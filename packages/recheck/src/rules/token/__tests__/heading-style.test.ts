import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('heading-style (MD003)', () => {
  const h = tokenRuleHarness('heading-style');

  it('passes when all headings share the same (first-seen) style', async () => {
    expect(await h.lint('# ATX H1\n\n## ATX H2\n')).toEqual([]);
  });

  it('flags a style switch with position and detail', async () => {
    const problems = await h.lint('# ATX style H1\n\n## Closed ATX style H2 ##\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain('Expected: atx; Actual: atx_closed');
  });

  it('honors an explicit style option', async () => {
    const explicit = tokenRuleHarness('heading-style', { style: 'atx_closed' });
    const problems = await explicit.lint('# ATX H1\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: atx_closed; Actual: atx');
  });

  it('setext_with_atx allows atx for h3+ alongside setext h1/h2', async () => {
    const setextWithAtx = tokenRuleHarness('heading-style', { style: 'setext_with_atx' });
    const problems = await setextWithAtx.lint(
      'Setext H1\n=========\n\nSetext H2\n---------\n\n### ATX H3\n'
    );
    expect(problems).toEqual([]);
  });
});
