import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('list-marker-space (MD030)', () => {
  const h = tokenRuleHarness('list-marker-space');

  it('passes single-line list items with exactly one space after the marker', async () => {
    expect(await h.lint('* Foo\n* Bar\n* Baz\n')).toEqual([]);
  });

  it('flags a marker followed by extra spaces, with exact line/column', async () => {
    const problems = await h.lint('*   Foo\n* Bar\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(2);
    expect(problems[0].message).toContain('Expected: 1; Actual: 3');
  });

  it('fixes marker spacing back to the expected width', async () => {
    const fixed = await h.fix('*   Foo\n*  Bar\n');
    expect(fixed).toBe('* Foo\n* Bar\n');
  });

  it('option ulSingle: applies to single-paragraph unordered items', async () => {
    const custom = tokenRuleHarness('list-marker-space', { ulSingle: 3 });
    expect(await custom.lint('*   Foo\n*   Bar\n')).toEqual([]);
    const problems = await custom.lint('* Foo\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: 3; Actual: 1');
  });

  it('option olSingle: applies to single-paragraph ordered items independently of ulSingle', async () => {
    const custom = tokenRuleHarness('list-marker-space', { olSingle: 2 });
    expect(await custom.lint('1.  Foo\n2.  Bar\n')).toEqual([]);
    expect(await custom.lint('* Foo\n')).toEqual([]);
  });

  it('option ulMulti: applies to multi-paragraph unordered items (more list lines than item markers)', async () => {
    const custom = tokenRuleHarness('list-marker-space', { ulMulti: 3 });
    const md = '*   Foo\n\n    Second paragraph\n\n*   Bar\n';
    expect(await custom.lint(md)).toEqual([]);
  });

  it('option olMulti: applies to multi-paragraph ordered items', async () => {
    const custom = tokenRuleHarness('list-marker-space', { olMulti: 2 });
    const md = '1.  Foo\n\n    Second paragraph\n\n1.  Bar\n';
    expect(await custom.lint(md)).toEqual([]);
  });
});
