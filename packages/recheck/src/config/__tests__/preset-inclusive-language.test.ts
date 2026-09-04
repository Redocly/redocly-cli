import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import { presets } from '../presets/index.js';

// Same namespace-check reasoning as preset-google.test.ts/
// preset-microsoft.test.ts: this preset's rule keys are `inclusive-
// language/<rule>`, not `recheck/<rule>`, so `NormalizedRule.shortName`
// (which only strips a LEADING `recheck/` prefix) never touches them --
// `shortName === name === the raw config key` for every rule here.
describe('recheck/inclusive-language preset namespace', () => {
  it('every rule key in the preset is namespaced inclusive-language/<rule>, not recheck/<rule>', () => {
    const keys = Object.keys(presets['recheck/inclusive-language']);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(
        key.startsWith('inclusive-language/'),
        `expected "${key}" to start with "inclusive-language/"`
      ).toBe(true);
    }
  });
});

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

describe('recheck/inclusive-language preset fixtures', () => {
  // Catches the Vale failure mode: a rule that ships but can never fire.
  it('reports every rule the preset ships', async () => {
    const violations = await readFile(fixture('inclusive-language-violations.md'), 'utf8');
    const problems = await lintContent(violations, { extends: ['recheck/inclusive-language'] });
    const reported = new Set(problems.map((p) => p.ruleName));
    const shipped = new Set(Object.keys(presets['recheck/inclusive-language']));
    expect([...shipped].filter((r) => !reported.has(r))).toEqual([]);
  });

  it('reports nothing on compliant prose', async () => {
    const md = await readFile(fixture('inclusive-language-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/inclusive-language'] });
    expect(problems).toEqual([]);
  });
});
