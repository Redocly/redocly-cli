import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import { presets } from '../presets/index.js';

// The rule keys here are `plain-language/<rule>`, not `recheck/<rule>`, so `shortName` equals the full key.
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

// This preset ships no `metric` rule, so `metric` stays an opt-in assertion documented in the README.
describe('recheck/plain-language does not ship a metric rule', () => {
  it('no rule in the preset carries a metric assertion', () => {
    const preset = presets['recheck/plain-language'];
    const withMetric = Object.entries(preset).filter(
      ([, rule]) => 'metric' in (rule.assertions ?? {})
    );
    expect(withMetric).toEqual([]);
  });
});
