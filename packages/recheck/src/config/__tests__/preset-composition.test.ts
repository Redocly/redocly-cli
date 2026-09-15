import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import type { LengthAssertion } from '../../types/index.js';
import { presets, resolveExtends } from '../presets/index.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

/**
 * Returns every (file, line, column) position hit by 2+ distinct rule names --
 * a literal "this exact span was reported more than once" finding.
 */
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

// `preset-google.test.ts` and `preset-microsoft.test.ts` each carry their own
// single-preset copy of this guarantee. This block is the shared, list-driven
// version, so a new detection-only preset joins the array below instead of
// getting a whole new describe block.
//
// The non-triviality floor is per-preset because one shared bound cannot fit
// both the large word-list presets and `recheck/markdoc`, which has exactly
// four rules: a bound low enough for markdoc would let a word-list preset
// shrink to a couple of rules and still pass.
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

// `extends` must resolve without id collisions and must preserve each preset's
// own severities through the merge; a preset whose warnings silently become
// errors via composition is a real defect. Stacked presets merge by rule key,
// so namespacing every composable preset's keys (`google/...`,
// `inclusive-language/...`) is what makes stacking safe.
describe('composition: extends [recheck/markdown, recheck/google, recheck/inclusive-language]', () => {
  it('resolves without id collisions: every rule key from all three presets is present, with no key stolen from another', () => {
    const { config, errors } = resolveExtends({
      extends: ['recheck/markdown', 'recheck/google', 'recheck/inclusive-language'],
    });
    expect(errors).toEqual([]);

    const markdownKeys = Object.keys(presets['recheck/markdown']);
    const googleKeys = Object.keys(presets['recheck/google']);
    const inclusiveKeys = Object.keys(presets['recheck/inclusive-language']);

    // No overlap between any two of the three presets' own key sets --
    // this is the namespacing guarantee itself, checked directly rather
    // than assumed.
    const allKeySets = [markdownKeys, googleKeys, inclusiveKeys];
    for (let i = 0; i < allKeySets.length; i++) {
      for (let j = i + 1; j < allKeySets.length; j++) {
        const overlap = allKeySets[i].filter((k) => allKeySets[j].includes(k));
        expect(overlap).toEqual([]);
      }
    }

    // Every key from every preset survives into the merged config -- a
    // real collision would mean one preset's rule count silently shrinks.
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

    // Every single rule from every preset, not just a spot sample: the
    // merged severity must equal the preset's own configured severity for
    // every rule key, since none of these three presets' rule keys
    // collide (proven above) -- so `resolveExtends` never even reaches its
    // per-key merge logic for any of them; this asserts the (structurally
    // guaranteed, but worth proving directly) outcome.
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

// Stacking `plain-language` onto `recheck/microsoft` is the interesting case
// because both ship `length` on the paragraph scope: `microsoft/paragraph-
// length` in sentences against `plain-language/paragraph-max-words` in words
// and `plain-language/paragraph-sentence-count` in sentences. Every rule key is
// distinct, so the per-key merge never runs and all three keep their own
// options instead of one clobbering another.
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

    // Each retains its OWN preset's original options -- proving the merge
    // didn't average, overwrite, or otherwise cross-contaminate the three
    // independently-keyed `length` rules.
    expect(microsoftParagraph.scope).toBe('paragraph');
    expect((microsoftParagraph.assertions.length as LengthAssertion).unit).toBe('sentences');
    expect((microsoftParagraph.assertions.length as LengthAssertion).max).toBe(7);
    expect(microsoftParagraph).toEqual(presets['recheck/microsoft']['microsoft/paragraph-length']);

    expect(plainMaxWords.scope).toBe('paragraph');
    expect((plainMaxWords.assertions.length as LengthAssertion).unit).toBe('words');
    expect((plainMaxWords.assertions.length as LengthAssertion).max).toBe(250);
    expect(plainMaxWords).toEqual(
      presets['recheck/plain-language']['plain-language/paragraph-max-words']
    );

    expect(plainSentenceCount.scope).toBe('paragraph');
    expect((plainSentenceCount.assertions.length as LengthAssertion).unit).toBe('sentences');
    expect((plainSentenceCount.assertions.length as LengthAssertion).max).toBe(8);
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

// "Same file, same line, same span, flagged by more than one rule" is real
// noise a user stacking a composable preset onto a flagship can hit, so it is
// counted rather than assumed small. Each fixture below is a preset's own
// "every rule fires" violations fixture, linted under a stacked config.
//
// The counts are asserted exactly so a future rule addition that reintroduces a
// removed duplicate, or drops a currently-accepted one, is caught here.
describe('duplicate findings across stacked presets (measured, not assumed)', () => {
  it("markdown+google+inclusive-language: 11 duplicate positions, all from inclusive-language rules already covered by google (by construction -- see inclusive-language.ts's COMPOSITION note)", async () => {
    const content = await readFile(fixture('inclusive-language-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/markdown', 'recheck/google', 'recheck/inclusive-language'],
    });
    const dupes = duplicatePositions(problems);
    expect(dupes).toHaveLength(11);
    // Every duplicate pairs a `google/*` rule with an `inclusive-language/*`
    // rule (never two `google/*` rules with each other, and `recheck/markdown`
    // contributes none) -- confirms the source of the overlap is exactly the
    // intersection design, not an unrelated collision.
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
    // Each remaining duplicate is either the accepted paragraph-length
    // overlap (both plain-language rules on the same paragraph) or a
    // coincidental "has not"/"is not" substring collision with
    // google/use-contractions -- documented, not silently reintroduced
    // flagship-equivalent content.
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

  // Regression guard for the two removed pairs themselves: `in order to`
  // and `utilize`/`utilization` must not be reintroduced into
  // plain-language's shipped rules, since both are already identically
  // covered by BOTH flagships (google/in-order-to + microsoft/simple-words;
  // google/utilize + microsoft/simple-words).
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
