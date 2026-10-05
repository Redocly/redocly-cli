import { describe, expect, it } from 'vitest';

import { allTokenRules } from '../index.js';
import { tokenRuleHarness } from './harness.js';

// A bare paragraph gives these rules nothing to check. `first-line-h1` is the exception: a
// document that opens with a paragraph is what it reports. Markdoc rules do nothing unless
// the harness turns Markdoc on.
describe('token rules on a bare paragraph', () => {
  const rules = allTokenRules.filter(
    (rule) => rule.name !== 'first-line-h1' && !rule.tags.includes('markdoc')
  );

  it.each(rules.map((rule) => rule.name))('%s reports nothing', async (name) => {
    expect(await tokenRuleHarness(name).lint('Just a paragraph.\n')).toEqual([]);
  });
});
