import { describe, expect, it } from 'vitest';

import { presets } from '../../config/presets/index.js';
import { validate } from '../../config/validate.js';
import { parseMarkdown, filterByTypes } from '../../parser/index.js';
import type { NormalizedRule } from '../../types/index.js';
import { runRules } from '../runner.js';

async function normalizedRules(config: Record<string, unknown>): Promise<NormalizedRule[]> {
  const result = await validate(config);
  if (!result.isValid) throw new Error(JSON.stringify(result.errors));
  return result.rules;
}

describe('embedded mode', () => {
  it('parses a leading --- block as content, not front matter', () => {
    const md = '---\ntitle: not front matter\n---\n\nProse.\n';
    const whole = parseMarkdown(md);
    const embedded = parseMarkdown(md, { embedded: true });
    expect(filterByTypes(whole, ['yaml'])).toHaveLength(1);
    expect(filterByTypes(embedded, ['yaml'])).toHaveLength(0);
  });

  it('hard-disables document-shape rules even when the config names them', async () => {
    const rules = await normalizedRules({
      extends: ['recheck/markdown'],
      'recheck/single-h1': { severity: 'error' },
    });
    // Two h1s, no leading h1, no trailing newline — and one trailing space.
    const md = 'Intro text. \n# One\n# Two';
    const { problems } = await runRules([{ path: 'frag.md', content: md }], rules, {
      embedded: true,
    });
    const names = [...new Set(problems.map((problem) => problem.ruleName))];
    expect(names).toContain('recheck/no-trailing-spaces');
    for (const gone of [
      'recheck/single-h1',
      'recheck/first-line-h1',
      'recheck/single-trailing-newline',
    ]) {
      expect(names).not.toContain(gone);
    }
  });

  it('keeps those rules active without the flag', async () => {
    const rules = await normalizedRules({ extends: ['recheck/markdown'] });
    const md = '# One\n\n# Two\n';
    const { problems } = await runRules([{ path: 'doc.md', content: md }], rules, {});
    expect(problems.map((problem) => problem.ruleName)).toContain('recheck/single-h1');
  });
});

describe('recheck/api-descriptions preset', () => {
  const preset = presets['recheck/api-descriptions'];

  it('is registered', () => {
    expect(preset).toBeDefined();
  });

  it('carries no rule embedded markdown cannot support, and none the corpus measurements excluded', () => {
    const excluded = [
      'recheck/single-h1',
      'recheck/first-line-h1',
      'recheck/front-matter',
      'recheck/single-trailing-newline',
      'recheck/link-fragments',
      'recheck/line-length',
      'recheck/ul-indent',
    ];
    for (const name of excluded) {
      expect(preset[name]).toBeUndefined();
    }
  });

  it('still carries the markdown rules embedded content supports', () => {
    for (const name of ['recheck/no-trailing-spaces', 'recheck/blanks-around-lists']) {
      expect(preset[name]).toBeDefined();
    }
  });

  it('lints a realistic description cleanly end to end', async () => {
    const result = await validate({ extends: ['recheck/api-descriptions'] });
    if (!result.isValid) throw new Error(JSON.stringify(result.errors));
    const md =
      'Filters the collection items.\n\nFor more information, see [Rate limits](#section/Rate-limits).\n';
    const { problems } = await runRules([{ path: 'frag.md', content: md }], result.rules, {
      embedded: true,
    });
    expect(problems).toEqual([]);
  });

  it('still reports real findings in embedded markdown', async () => {
    const result = await validate({ extends: ['recheck/api-descriptions'] });
    if (!result.isValid) throw new Error(JSON.stringify(result.errors));
    const md = 'Trailing space here. \nAnd a second line.\n';
    const { problems } = await runRules([{ path: 'frag.md', content: md }], result.rules, {
      embedded: true,
    });
    expect(problems.map((problem) => problem.ruleName)).toContain('recheck/no-trailing-spaces');
  });
});
