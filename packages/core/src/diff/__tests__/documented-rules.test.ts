import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diffRuleIds } from '../rules/index.js';

const docs = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../../docs/@v2/commands/diff.md'),
  'utf8'
);

/** A row of the rule table: `| \`rule-id\` | description |`, however the formatter pads it. */
const RULE_TABLE_ROW = /^\| `([a-z0-9-]+)`\s*\|\s*(.+?)\s*\|$/gm;

const documented = new Set([...docs.matchAll(RULE_TABLE_ROW)].map(([, ruleId]) => ruleId));

describe('the documented rule catalog', () => {
  it('lists every rule the command runs', () => {
    expect(diffRuleIds.filter((ruleId) => !documented.has(ruleId)).sort()).toEqual([]);
  });

  it('lists no rule the command no longer has', () => {
    expect([...documented].filter((ruleId) => !diffRuleIds.includes(ruleId)).sort()).toEqual([]);
  });
});
