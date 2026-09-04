import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('ul-style (MD004)', () => {
  const h = tokenRuleHarness('ul-style');

  it('passes a list whose markers are all consistent', async () => {
    expect(await h.lint('* Item 1\n* Item 2\n* Item 3\n')).toEqual([]);
  });

  it('flags a marker that differs from the first (consistent, default) with exact line/column', async () => {
    const problems = await h.lint('* Item 1\n+ Item 2\n* Item 3\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Expected: asterisk; Actual: plus');
  });

  it('style: asterisk flags dash/plus markers', async () => {
    const asterisk = tokenRuleHarness('ul-style', { style: 'asterisk' });
    const problems = await asterisk.lint('- Item 1\n- Item 2\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Expected: asterisk; Actual: dash');
  });

  it('style: plus flags non-plus markers', async () => {
    const plus = tokenRuleHarness('ul-style', { style: 'plus' });
    const problems = await plus.lint('* Item 1\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: plus; Actual: asterisk');
  });

  it('style: dash flags non-dash markers', async () => {
    const dash = tokenRuleHarness('ul-style', { style: 'dash' });
    const problems = await dash.lint('* Item 1\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: dash; Actual: asterisk');
  });

  it('style: sublist requires each nesting level to use a distinct marker from its parent', async () => {
    const sublist = tokenRuleHarness('ul-style', { style: 'sublist' });
    const valid = '* Item 1\n  + Item 2\n    - Item 3\n  + Item 4\n* Item 5\n  + Item 6\n';
    expect(await sublist.lint(valid)).toEqual([]);
  });

  it('style: sublist flags a nested marker matching its parent', async () => {
    const sublist = tokenRuleHarness('ul-style', { style: 'sublist' });
    const problems = await sublist.lint('* Item 1\n  * Nested\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('fixes an inconsistent marker to match the expected style', async () => {
    const fixed = await h.fix('* Item 1\n+ Item 2\n- Item 3\n');
    expect(fixed).toBe('* Item 1\n* Item 2\n* Item 3\n');
  });

  it('fixes sublist style by inserting the derived per-depth marker', async () => {
    // differentItemStyle('asterisk') is 'dash' (upstream: dash unless the
    // parent is dash/plus), so a nested level matching its 'asterisk'
    // parent is fixed to 'dash', not 'plus'.
    const sublist = tokenRuleHarness('ul-style', { style: 'sublist' });
    const fixed = await sublist.fix('* Item 1\n  * Nested\n');
    expect(fixed).toBe('* Item 1\n  - Nested\n');
  });
});
