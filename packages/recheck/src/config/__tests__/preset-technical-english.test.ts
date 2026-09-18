import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import { presets } from '../presets/index.js';

describe('recheck/technical-english preset namespace', () => {
  it('every rule key is namespaced technical-english/<rule>', () => {
    const keys = Object.keys(presets['recheck/technical-english']);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(
        key.startsWith('technical-english/'),
        `expected "${key}" to start with "technical-english/"`
      ).toBe(true);
    }
  });
});

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

describe('recheck/technical-english is detection-only', () => {
  it('no rule in the preset is fixable', () => {
    for (const [name, rule] of Object.entries(presets['recheck/technical-english'])) {
      expect((rule as { fix?: boolean }).fix, `${name} must set fix: false`).toBe(false);
    }
  });
});

describe('recheck/technical-english preset fixtures', () => {
  it('reports every rule the preset ships', async () => {
    const violations = await readFile(fixture('technical-english-violations.md'), 'utf8');
    const problems = await lintContent(violations, {
      extends: ['recheck/technical-english'],
    });
    const reported = new Set(problems.map((p) => p.ruleName));
    const shipped = new Set(Object.keys(presets['recheck/technical-english']));
    expect([...shipped].filter((rule) => !reported.has(rule))).toEqual([]);
  });

  it('reports nothing on compliant prose', async () => {
    const md = await readFile(fixture('technical-english-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/technical-english'] });
    expect(problems).toEqual([]);
  });
});
