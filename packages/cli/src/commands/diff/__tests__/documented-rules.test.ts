import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { async3Rules } from '../engine/classify/async3.js';
import { oas3Rules } from '../engine/classify/oas3.js';
import type { DiffRule } from '../engine/types.js';

const docs = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../../../docs/@v2/commands/diff.md'),
  'utf8'
);

// A rule reaches a registry under every node type it applies to, and a rule shared by
// two specifications appears in both, so the same rule is listed more than once.
const rulesById = new Map<string, DiffRule>();
for (const rule of [...Object.values(oas3Rules), ...Object.values(async3Rules)].flat()) {
  rulesById.set(rule.id, rule);
}

/** A row of the rule table: `| \`rule-id\` | description |`, however the formatter pads it. */
const RULE_TABLE_ROW = /^\| `([a-z0-9-]+)`\s*\|\s*(.+?)\s*\|$/gm;

const documented = new Map(
  [...docs.matchAll(RULE_TABLE_ROW)].map(([, ruleId, description]) => [ruleId, description])
);

// The catalog is what users decide to trust the command on, so a rule that ships
// without a row — or a row left behind by a renamed rule — is a documentation bug.
describe('the documented rule catalog', () => {
  it('lists every rule the command runs', () => {
    const undocumented = [...rulesById.keys()].filter((ruleId) => !documented.has(ruleId));

    expect(undocumented.sort()).toEqual([]);
  });

  it('lists no rule the command no longer has', () => {
    const stale = [...documented.keys()].filter((ruleId) => !rulesById.has(ruleId));

    expect(stale.sort()).toEqual([]);
  });

  it.each([...rulesById.values()].map((rule) => [rule.id, rule.description]))(
    'describes `%s` with the description it carries in code',
    (ruleId, description) => {
      expect(documented.get(ruleId)).toBe(description);
    }
  );
});
