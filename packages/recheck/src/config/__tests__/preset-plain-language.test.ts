import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import { presets } from '../presets/index.js';

// Same namespace-check reasoning as preset-google.test.ts/
// preset-microsoft.test.ts/preset-inclusive-language.test.ts.
describe('recheck/plain-language preset namespace', () => {
  it('every rule key in the preset is namespaced plain-language/<rule>, not recheck/<rule>', () => {
    const keys = Object.keys(presets['recheck/plain-language']);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(
        key.startsWith('plain-language/'),
        `expected "${key}" to start with "plain-language/"`
      ).toBe(true);
    }
  });
});

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

describe('recheck/plain-language preset fixtures', () => {
  it('reports every rule the preset ships', async () => {
    const violations = await readFile(fixture('plain-language-violations.md'), 'utf8');
    const problems = await lintContent(violations, { extends: ['recheck/plain-language'] });
    const reported = new Set(problems.map((p) => p.ruleName));
    const shipped = new Set(Object.keys(presets['recheck/plain-language']));
    expect([...shipped].filter((r) => !reported.has(r))).toEqual([]);
  });

  it('reports nothing on compliant prose', async () => {
    const md = await readFile(fixture('plain-language-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/plain-language'] });
    expect(problems).toEqual([]);
  });
});

// `metric` completeness guard (Task 11 controller resolutions §4): this
// preset ships NO `metric` rule (no live federal page states a grade level
// or readability score -- see plain-language.ts's file header and
// PROVENANCE.md's "THE NUMBER" section), so `metric` stays a documented
// opt-in and DOCUMENTED_OPT_IN_ASSERTIONS/the README's "Opt-in prose
// assertions" section are UNCHANGED by this preset. This is a sanity check
// that the preset itself doesn't quietly reintroduce a `metric` assertion,
// which would silently violate the completeness guard's XOR invariant in
// presets.test.ts.
describe('recheck/plain-language does not ship a metric rule', () => {
  it('no rule in the preset carries a metric assertion', () => {
    const preset = presets['recheck/plain-language'];
    const withMetric = Object.entries(preset).filter(
      ([, rule]) => 'metric' in (rule.assertions ?? {})
    );
    expect(withMetric).toEqual([]);
  });
});
