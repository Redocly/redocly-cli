import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import { presets } from '../presets/index.js';
import { resolveExtends } from '../validate.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

/** Finds positions (file, line, column) that two or more different rules report. */
function duplicatePositions(
  problems: { file: string; line: number; column: number; ruleName: string }[]
) {
  const byPosition = new Map<string, Set<string>>();
  for (const p of problems) {
    const key = `${p.file}:${p.line}:${p.column}`;
    let rules = byPosition.get(key);
    if (!rules) {
      rules = new Set();
      byPosition.set(key, rules);
    }
    rules.add(p.ruleName);
  }
  return [...byPosition.entries()].filter(([, rules]) => rules.size > 1);
}

// The single-preset test files each repeat this check. This list-driven version covers every
// detection-only preset. The minimum rule count is per preset because `recheck/markdoc` has only four rules.
const DETECTION_ONLY_PRESET_NAMES = [
  'recheck/google',
  'recheck/microsoft',
  'recheck/inclusive-language',
  'recheck/plain-language',
  'recheck/markdoc',
] as const;

const NON_TRIVIALITY_FLOOR: Record<(typeof DETECTION_ONLY_PRESET_NAMES)[number], number> = {
  'recheck/google': 6,
  'recheck/microsoft': 6,
  'recheck/inclusive-language': 6,
  'recheck/plain-language': 6,
  'recheck/markdoc': 4,
};

describe('word-list/style-guide presets are detection-only by design', () => {
  it.each(DETECTION_ONLY_PRESET_NAMES)('no rule in %s is fixable', (name) => {
    const preset = presets[name];
    const stillFixable = Object.entries(preset)
      .filter(([, rule]) => rule.fix !== false)
      .map(([ruleName]) => ruleName);
    expect(stillFixable).toEqual([]);
  });

  it.each(DETECTION_ONLY_PRESET_NAMES)(
    '%s has at least its own non-triviality floor of rules, so the guarantee is non-trivial',
    (name) => {
      expect(Object.keys(presets[name]).length).toBeGreaterThanOrEqual(NON_TRIVIALITY_FLOOR[name]);
    }
  );
});

// Stacked presets merge by rule key, so each preset's keys are namespaced. Composing them must not lose
// keys or change any severity.
describe('composition: extends [recheck/markdown, recheck/google, recheck/inclusive-language]', () => {
  it('resolves without id collisions: every rule key from all three presets is present, with no key stolen from another', () => {
    const { config, errors } = resolveExtends({
      extends: ['recheck/markdown', 'recheck/google', 'recheck/inclusive-language'],
    });
    expect(errors).toEqual([]);

    const markdownKeys = Object.keys(presets['recheck/markdown']);
    const googleKeys = Object.keys(presets['recheck/google']);
    const inclusiveKeys = Object.keys(presets['recheck/inclusive-language']);

    // The key sets of the three presets must not overlap.
    const allKeySets = [markdownKeys, googleKeys, inclusiveKeys];
    for (let i = 0; i < allKeySets.length; i++) {
      for (let j = i + 1; j < allKeySets.length; j++) {
        const overlap = allKeySets[i].filter((k) => allKeySets[j].includes(k));
        expect(overlap).toEqual([]);
      }
    }

    // Every key survives the merge.
    const mergedKeys = new Set(Object.keys(config));
    for (const key of [...markdownKeys, ...googleKeys, ...inclusiveKeys]) {
      expect(mergedKeys.has(key), `expected merged config to contain "${key}"`).toBe(true);
    }
    expect(Object.keys(config).length).toBe(
      markdownKeys.length + googleKeys.length + inclusiveKeys.length
    );
  });

  it("preserves each preset's own severities through the merge -- a sample from each of the three presets", () => {
    const { config } = resolveExtends({
      extends: ['recheck/markdown', 'recheck/google', 'recheck/inclusive-language'],
    });

    // Every rule keeps its preset's severity. No keys overlap, so nothing is merged per key.
    for (const [presetName, preset] of Object.entries({
      'recheck/markdown': presets['recheck/markdown'],
      'recheck/google': presets['recheck/google'],
      'recheck/inclusive-language': presets['recheck/inclusive-language'],
    })) {
      for (const [key, rule] of Object.entries(preset)) {
        expect(
          config[key]?.severity,
          `${presetName}'s "${key}" severity should survive the merge`
        ).toBe(rule.severity);
      }
    }
  });
});

// Both presets ship `length` on the paragraph scope, but with different keys. Each keeps its own options.
describe('composition: extends [recheck/microsoft, recheck/plain-language] (both ship length)', () => {
  it("both presets' length-backed rules survive independently, each with its own unit/max intact", () => {
    const { config, errors } = resolveExtends({
      extends: ['recheck/microsoft', 'recheck/plain-language'],
    });
    expect(errors).toEqual([]);

    const microsoftParagraph = config['microsoft/paragraph-length'];
    const plainMaxWords = config['plain-language/paragraph-max-words'];
    const plainSentenceCount = config['plain-language/paragraph-sentence-count'];

    expect(microsoftParagraph).toBeDefined();
    expect(plainMaxWords).toBeDefined();
    expect(plainSentenceCount).toBeDefined();

    // Each rule keeps the options of its own preset.
    expect(microsoftParagraph).toMatchObject({
      scope: 'paragraph',
      assertions: { length: { unit: 'sentences', max: 7 } },
    });
    expect(microsoftParagraph).toEqual(presets['recheck/microsoft']['microsoft/paragraph-length']);

    expect(plainMaxWords).toMatchObject({
      scope: 'paragraph',
      assertions: { length: { unit: 'words', max: 250 } },
    });
    expect(plainMaxWords).toEqual(
      presets['recheck/plain-language']['plain-language/paragraph-max-words']
    );

    expect(plainSentenceCount).toMatchObject({
      scope: 'paragraph',
      assertions: { length: { unit: 'sentences', max: 8 } },
    });
    expect(plainSentenceCount).toEqual(
      presets['recheck/plain-language']['plain-language/paragraph-sentence-count']
    );
  });

  it('severities survive this merge too (microsoft/paragraph-length is warn; plain-language/paragraph-max-words is error)', () => {
    const { config } = resolveExtends({ extends: ['recheck/microsoft', 'recheck/plain-language'] });
    expect(config['microsoft/paragraph-length'].severity).toBe(
      presets['recheck/microsoft']['microsoft/paragraph-length'].severity
    );
    expect(config['plain-language/paragraph-max-words'].severity).toBe(
      presets['recheck/plain-language']['plain-language/paragraph-max-words'].severity
    );
    expect(config['plain-language/paragraph-sentence-count'].severity).toBe(
      presets['recheck/plain-language']['plain-language/paragraph-sentence-count'].severity
    );
  });
});

// Stacked presets can report the same span twice. The counts are exact, so a change that adds or
// removes a duplicate is noticed. Each fixture is the preset's violations fixture.
describe('duplicate findings across stacked presets (measured, not assumed)', () => {
  it("markdown+google+inclusive-language: 11 duplicate positions, all from inclusive-language rules already covered by google (by construction -- see inclusive-language.ts's COMPOSITION note)", async () => {
    const content = await readFile(fixture('inclusive-language-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/markdown', 'recheck/google', 'recheck/inclusive-language'],
    });
    const dupes = duplicatePositions(problems);
    expect(dupes).toHaveLength(11);
    // Every duplicate pairs a `google/*` rule with an `inclusive-language/*` rule.
    for (const [, rules] of dupes) {
      const names = [...rules];
      expect(names.some((n) => n.startsWith('google/'))).toBe(true);
      expect(names.some((n) => n.startsWith('inclusive-language/'))).toBe(true);
    }
  });

  it('google+inclusive-language alone reproduces the identical 11 (recheck/markdown contributes nothing to the count)', async () => {
    const content = await readFile(fixture('inclusive-language-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/google', 'recheck/inclusive-language'],
    });
    expect(duplicatePositions(problems)).toHaveLength(11);
  });

  it("microsoft+inclusive-language: 8 duplicate positions (a different 6-of-11 rules than google's 7-of-11 -- the union of both is all 11, per the file header's measured audit)", async () => {
    const content = await readFile(fixture('inclusive-language-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/microsoft', 'recheck/inclusive-language'],
    });
    expect(duplicatePositions(problems)).toHaveLength(8);
  });

  it("google+plain-language: 3 duplicate positions (down from 6 before `in order to`/`utilize` were removed as pure flagship duplicates -- see plain-language.ts's COMPOSITION note)", async () => {
    const content = await readFile(fixture('plain-language-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/google', 'recheck/plain-language'],
    });
    const dupes = duplicatePositions(problems);
    expect(dupes).toHaveLength(3);
    // Each duplicate is a paragraph-length overlap or a "has not"/"is not" match for google/use-contractions.
    const flattened = dupes.flatMap(([, rules]) => [...rules]);
    expect(flattened.filter((n) => n === 'plain-language/paragraph-max-words')).toHaveLength(1);
    expect(flattened.filter((n) => n === 'plain-language/paragraph-sentence-count')).toHaveLength(
      1
    );
    expect(flattened.filter((n) => n === 'google/use-contractions')).toHaveLength(2);
  });

  it('microsoft+plain-language: 3 duplicate positions (down from 5 before the same removal), including the accepted microsoft/paragraph-length overlap', async () => {
    const content = await readFile(fixture('plain-language-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/microsoft', 'recheck/plain-language'],
    });
    const dupes = duplicatePositions(problems);
    expect(dupes).toHaveLength(3);
    const paragraphDupe = dupes.find(([, rules]) => rules.has('microsoft/paragraph-length'));
    expect(paragraphDupe).toBeDefined();
    const [, paragraphDupeRules] = paragraphDupe ?? [undefined, new Set<string>()];
    expect([...paragraphDupeRules].sort()).toEqual(
      [
        'microsoft/paragraph-length',
        'plain-language/paragraph-max-words',
        'plain-language/paragraph-sentence-count',
      ].sort()
    );
  });

  // `in order to` and `utilize`/`utilization` are already covered by both google and microsoft.
  it('plain-language does not re-ship "in order to" or "utilize"/"utilization" (already covered by both flagships)', () => {
    const preset = presets['recheck/plain-language'];
    const allPairKeys = new Set<string>();
    for (const rule of Object.values(preset)) {
      const swap = rule.assertions?.['swap'] as { pairs?: Record<string, string> } | undefined;
      if (swap?.pairs)
        for (const key of Object.keys(swap.pairs)) allPairKeys.add(key.toLowerCase());
    }
    expect(allPairKeys.has('in order to')).toBe(false);
    expect(allPairKeys.has('utilize')).toBe(false);
    expect(allPairKeys.has('utilization')).toBe(false);
  });
});
