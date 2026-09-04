import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('fenced-code-language (MD040)', () => {
  const h = tokenRuleHarness('fenced-code-language');
  const hAllowed = tokenRuleHarness('fenced-code-language', { allowedLanguages: ['js', 'text'] });
  const hLanguageOnly = tokenRuleHarness('fenced-code-language', { languageOnly: true });

  it('passes when a language is specified', async () => {
    expect(await h.lint('```js\ncode\n```\n')).toEqual([]);
  });

  it('flags a fence with no language, exact line/column', async () => {
    const problems = await h.lint('```\ncode\n```\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
  });

  it('honors allowedLanguages: flags a language not on the list', async () => {
    const problems = await hAllowed.lint('```ruby\ncode\n```\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('"ruby" is not allowed');
  });

  it('honors allowedLanguages: passes a language on the list', async () => {
    expect(await hAllowed.lint('```js\ncode\n```\n')).toEqual([]);
  });

  it('honors languageOnly: flags extra info-string content beyond the language', async () => {
    const problems = await hLanguageOnly.lint('```js extra stuff\ncode\n```\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('Info string contains more than language');
  });

  it('honors languageOnly: passes a fence with just a language', async () => {
    expect(await hLanguageOnly.lint('```js\ncode\n```\n')).toEqual([]);
  });

  it('passes a document with no fenced code blocks', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
