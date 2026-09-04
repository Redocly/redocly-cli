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

  it('matches case-insensitively by default and honors matchCase', async () => {
    const insensitive = tokenRuleHarness('required-headings', { headings: ['# heading'] });
    expect(await insensitive.lint('# HEADING\n')).toEqual([]);

    const strict = tokenRuleHarness('required-headings', {
      headings: ['# heading'],
      matchCase: true,
    });
    expect(await strict.lint('# HEADING\n')).toHaveLength(1);
  });
});
