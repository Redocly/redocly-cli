import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('required-headings (MD043)', () => {
  it('does nothing when headings option is not configured', async () => {
    const h = tokenRuleHarness('required-headings');
    expect(await h.lint('# Anything\n\n## Goes\n')).toEqual([]);
  });

  it('passes when the exact required heading structure matches', async () => {
    const h = tokenRuleHarness('required-headings', {
      headings: ['# Heading', '## Item', '### Detail'],
    });
    expect(await h.lint('# Heading\n\n## Item\n\n### Detail\n')).toEqual([]);
  });

  it('flags the first heading that deviates from the required structure', async () => {
    const h = tokenRuleHarness('required-headings', {
      headings: ['# Heading', '## Item'],
    });
    const problems = await h.lint('# Heading\n\n## Different\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain('Expected: ## Item; Actual: ## Different');
  });

  it('allows a "?" entry to match exactly one unspecified heading', async () => {
    const h = tokenRuleHarness('required-headings', {
      headings: ['?', '## Description', '## Examples'],
    });
    expect(await h.lint('# Project Name\n\n## Description\n\n## Examples\n')).toEqual([]);
    expect(await h.lint('# Another Name\n\n## Description\n\n## Examples\n')).toEqual([]);
  });

  it('allows "*" to match zero or more unspecified headings', async () => {
    const h = tokenRuleHarness('required-headings', {
      headings: ['# Heading', '## Item', '*', '## Foot', '*'],
    });
    expect(await h.lint('# Heading\n\n## Item\n\n### Detail\n\n## Foot\n\n### Notes\n')).toEqual(
      []
    );
    expect(await h.lint('# Heading\n\n## Item\n\n## Foot\n')).toEqual([]);
  });

  it('flags a required heading missing from the end of the document, at the last line', async () => {
    const h = tokenRuleHarness('required-headings', {
      headings: ['# A', '## B'],
    });
    const problems = await h.lint('# A\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].match).toBe('## B');
  });

  it('reports the first missing required heading when several are missing', async () => {
    const h = tokenRuleHarness('required-headings', { headings: ['# A', '## B', '## C'] });
    const problems = await h.lint('# A\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('## B');
  });

  it('"+" requires at least one heading, so a "+" with nothing to absorb reports the next required heading missing', async () => {
    const h = tokenRuleHarness('required-headings', {
      headings: ['# A', '+', '## Z'],
    });
    expect(await h.lint('# A\n\n## x\n\n## y\n\n## Z\n')).toEqual([]);
    const problems = await h.lint('# A\n\n## Z\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('## Z');
  });

  it('an explicit empty headings list means "no headings allowed"', async () => {
    const h = tokenRuleHarness('required-headings', { headings: [] });
    const problems = await h.lint('# A\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('Expected: [None]; Actual: # A');
  });

  it('matches case-insensitively by default and honors matchCase', async () => {
    const insensitive = tokenRuleHarness('required-headings', {
      headings: ['# heading'],
    });
    expect(await insensitive.lint('# HEADING\n')).toEqual([]);

    const strict = tokenRuleHarness('required-headings', {
      headings: ['# heading'],
      matchCase: true,
    });
    expect(await strict.lint('# HEADING\n')).toHaveLength(1);
  });
});
