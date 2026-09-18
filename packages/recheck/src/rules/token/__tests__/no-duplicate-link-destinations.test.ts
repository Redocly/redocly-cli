import { describe, it, expect } from 'vitest';

import { tokenRuleHarness } from './harness.js';

const h = tokenRuleHarness('no-duplicate-link-destinations');

describe('no-duplicate-link-destinations', () => {
  it('flags the second link to the same destination with different text', async () => {
    const problems = await h.lint('See [the guide](/a) and [our guide](/a).\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toBe('Link destination "/a" is already linked by different text');
  });

  it('does not flag repeated links that share both destination and text', async () => {
    expect(await h.lint('See [guide](/a) and [guide](/a).\n')).toEqual([]);
  });

  it('does not flag distinct destinations', async () => {
    expect(await h.lint('[a](/a) and [b](/b)\n')).toEqual([]);
  });

  it('reports every later mismatching occurrence, not just the second', async () => {
    const problems = await h.lint('[one](/a)\n\n[two](/a)\n\n[three](/a)\n');
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.line)).toEqual([3, 5]);
  });

  it('compares against the FIRST text, so a later repeat of it is still flagged', async () => {
    // 'one' is first; 'two' mismatches (flagged); 'one' again matches the
    // first text and is not flagged.
    const problems = await h.lint('[one](/a)\n\n[two](/a)\n\n[one](/a)\n');
    expect(problems.map((p) => p.line)).toEqual([3]);
  });

  it('resolves reference links through their definition', async () => {
    const md = 'See [the guide][g] and [our guide][g].\n\n[g]: /a\n';
    expect(await h.lint(md)).toHaveLength(1);
  });

  it('treats an inline link and a reference link to one destination as duplicates', async () => {
    const md = 'See [the guide](/a) and [our guide][g].\n\n[g]: /a\n';
    expect(await h.lint(md)).toHaveLength(1);
  });

  it('ignores images, which are not links', async () => {
    expect(await h.lint('![alt one](/i.png) and ![alt two](/i.png)\n')).toEqual([]);
  });

  it('resolves pure shortcut references through their definition', async () => {
    const md = 'See [the guide] and [our guide].\n\n[the guide]: /a\n[our guide]: /a\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('does not flag the same shortcut label repeated', async () => {
    const md = 'See [the guide] and [the guide] again.\n\n[the guide]: /a\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('resolves collapsed references through their definition', async () => {
    const md = 'See [the guide][] and [our guide](/a).\n\n[the guide]: /a\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });
});
