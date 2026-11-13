import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('descriptive-link-text (MD059)', () => {
  const h = tokenRuleHarness('descriptive-link-text');

  it('passes a link with descriptive text', async () => {
    expect(
      await h.lint('[Download the budget document](https://example.com/budget.pdf)\n')
    ).toEqual([]);
  });

  it('flags a link with generic text ("click here"), exact line/column', async () => {
    const problems = await h.lint('[click here](https://example.com)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // The column points at the label text, and `match` is the label token `[click here]`,
    // not the whole link.
    expect(problems[0].column).toBe(2);
    expect(problems[0].match).toBe('[click here]');
  });

  it('flags each of the other default prohibited texts', async () => {
    expect(await h.lint('[here](https://example.com)\n')).toHaveLength(1);
    expect(await h.lint('[link](https://example.com)\n')).toHaveLength(1);
    expect(await h.lint('[more](https://example.com)\n')).toHaveLength(1);
  });

  it('is case-insensitive and ignores surrounding punctuation/whitespace', async () => {
    const problems = await h.lint('[Click Here!](https://example.com)\n');
    expect(problems).toHaveLength(1);
  });

  it('honors a custom prohibitedTexts list', async () => {
    const hCustom = tokenRuleHarness('descriptive-link-text', {
      prohibitedTexts: ['read more'],
    });
    expect(await hCustom.lint('[click here](https://example.com)\n')).toEqual([]);
    expect(await hCustom.lint('[read more](https://example.com)\n')).toHaveLength(1);
  });

  it('does not flag prohibited text that contains a code span', async () => {
    expect(await h.lint('[`click here`](https://example.com)\n')).toEqual([]);
  });

  it('ignores HTML links entirely (only Markdown links are checked)', async () => {
    expect(await h.lint('<a href="https://example.com">click here</a>\n')).toEqual([]);
  });

  it('disables the rule when prohibitedTexts is explicitly an empty array (matches upstream `config.prohibited_texts || defaults` falling through to an empty Set, not the defaults)', async () => {
    const hDisabled = tokenRuleHarness('descriptive-link-text', { prohibitedTexts: [] });
    expect(await hDisabled.lint('[click here](url)\n')).toEqual([]);
  });
});
