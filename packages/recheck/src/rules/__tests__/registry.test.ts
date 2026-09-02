import { describe, expect, it } from 'vitest';

import { tokenRules } from '../registry.js';
import { RECHECK_ORIGINAL_TOKEN_RULE_NAMES } from '../token/index.js';

describe('registry', () => {
  // Counts the PARITY set specifically: Recheck-original token rules (no
  // markdownlint counterpart) are excluded via the registry barrel's own
  // list, the same source the preset drift guard and the parity rule-map
  // guard use, so all three agree by construction.
  it('registers all 53 markdownlint-parity rules', () => {
    const originals = new Set<string>(RECHECK_ORIGINAL_TOKEN_RULE_NAMES);
    expect(tokenRules.filter((rule) => !originals.has(rule.name))).toHaveLength(53);
  });

  it('registers every Recheck-original token rule', () => {
    const registered = new Set(tokenRules.map((rule) => rule.name));
    for (const name of RECHECK_ORIGINAL_TOKEN_RULE_NAMES) {
      expect(registered.has(name), `${name} is not registered`).toBe(true);
    }
  });
});
