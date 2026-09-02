import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import type { ConsistencyAssertion, SwapAssertion } from '../../types/index.js';
import { presets } from '../presets/index.js';

// `resolvePreset()` (as named in the task brief) does not exist --
// `lintContent()` does, and the live registry of a preset's rules is just
// the preset object itself (`presets['recheck/google']`), the same way
// presets.test.ts reads `presets['recheck/markdown']` directly. See
// task-9-10-resolutions.md §1.
//
// NAMESPACE CHECK (resolutions §1): this preset's rule keys are written as
// `google/<rule>` (e.g. `google/no-latinisms`), not `recheck/<rule>`. A
// config rule's key becomes BOTH `NormalizedRule.name` (verbatim, see
// config/validate.ts's `const name = key`) and `Problem.ruleName` (see
// core/runner.ts, which copies `rule.name`). `NormalizedRule.shortName`
// only strips a LEADING `recheck/` prefix (`key.replace(/^recheck\//, '')`)
// -- since every key here starts with `google/`, not `recheck/`, that
// regex never matches, so `shortName === name === the raw config key` for
// every rule in this preset. That means `Object.keys(presets['recheck/google'])`
// and `problems.map((p) => p.ruleName)` are directly comparable, in the
// SAME string form, with no normalization needed -- verified here rather
// than assumed, since a silent mismatch would make the "no silently-dead
// rule" test below compare two disjoint sets and pass while proving
// nothing.
describe('recheck/google preset namespace', () => {
  it('every rule key in the preset is namespaced google/<rule>, not recheck/<rule>', () => {
    const keys = Object.keys(presets['recheck/google']);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.startsWith('google/'), `expected "${key}" to start with "google/"`).toBe(true);
    }
  });
});

// =============================================================================
// Detection-only by design (2026-07-30): five adversarial probes of this
// preset's (and recheck/microsoft's) previously-fixable pairs, across three
// rounds of narrowing the fix-safety criterion, found a RISING corruption
// rate on genuinely correct prose (the last round: 18 of 29 probed pairs,
// 62%) spanning every category once believed safe -- including spelling and
// hyphenation. The project decision: remove auto-fix from this preset
// entirely, not narrow the criterion again. See google.ts's own
// "DETECTION-ONLY BY DESIGN" header note and
// `presets/google/PROVENANCE.md`'s "Detection-only" section for the full
// history.
//
// This is the PERMANENT GUARANTEE the brief asks for: derived from the LIVE
// preset object (`presets['recheck/google']`), not a hand-maintained list of
// rule names -- the same inversion the per-pair coverage gate already uses
// (see that gate's own comment above for why a hand-maintained list rots).
// A future contributor adding a new rule, or a new pair to an existing
// rule, and omitting `fix: false` cannot silently reintroduce fixing here:
// `buildGooglePreset()`'s own blanket override (google.ts) already prevents
// that at the source, and this test proves the RETURNED object reflects it.
// =============================================================================
describe('recheck/google preset is detection-only (Step 1 permanent guarantee)', () => {
  it('no rule in the live preset is fixable', () => {
    const preset = presets['recheck/google'];
    const stillFixable = Object.entries(preset)
      .filter(([, rule]) => rule.fix !== false)
      .map(([name]) => name);
    expect(stillFixable).toEqual([]);
  });

  it('sanity: the preset has more than a handful of rules, so the guarantee above is non-trivial', () => {
    expect(Object.keys(presets['recheck/google']).length).toBeGreaterThan(50);
  });
});

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

describe('recheck/google preset fixtures', () => {
  // This is the test that catches the Vale failure mode: a rule that ships
  // but can never fire. Every rule key the preset registers must appear at
  // least once in the reported rule-name set when linting documents that
  // deliberately violate every one of them.
  //
  // Two fixtures, not one: `google/single-h1` and `google/first-line-h1`
  // both derive from Google's single "only use a level-1 heading once on a
  // page" statement, but the underlying markdownlint-ported token rules
  // (MD025/MD041) check OPPOSITE preconditions of the same "document's
  // first heading" state -- `single-h1` only reports a second h1 when
  // nothing but comments/frontmatter precede the FIRST h1; `first-line-h1`
  // only fires when that first real content is NOT a correct h1. A single
  // document can satisfy at most one precondition, so `google-violations.md`
  // (which starts with a level-2 heading, to trigger `first-line-h1`)
  // structurally cannot also trigger `single-h1` -- verified empirically,
  // not assumed; see that fixture's own note. `google-violations-single-h1.md`
  // isolates `single-h1` in its own tiny, cleanly-started document instead.
  it('reports every rule the preset ships', async () => {
    const violations = await readFile(fixture('google-violations.md'), 'utf8');
    const singleH1 = await readFile(fixture('google-violations-single-h1.md'), 'utf8');
    const [problemsA, problemsB] = await Promise.all([
      lintContent(violations, { extends: ['recheck/google'] }),
      lintContent(singleH1, { extends: ['recheck/google'] }),
    ]);
    const reported = new Set([...problemsA, ...problemsB].map((p) => p.ruleName));
    const shipped = new Set(Object.keys(presets['recheck/google']));
    expect([...shipped].filter((r) => !reported.has(r))).toEqual([]);
  });

  // The other half of the acceptance gate: compliant prose must produce
  // zero findings. A false positive here means either the fixture
  // secretly violates the guide (fix the fixture) or the rule is noisier
  // than judged (move it out of the preset) -- see task-9-report.md for
  // every case that came up and how it was resolved.
  it('reports nothing on compliant prose', async () => {
    const md = await readFile(fixture('google-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/google'] });
    expect(problems).toEqual([]);
  });
});

// =============================================================================
// Fix wave A / Step 1 — the per-PAIR coverage gate.
//
// The "reports every rule the preset ships" test above is per-RULE: one
// firing pair (e.g. `data store` for `google/compound-forms`'s 65+ pairs, or
// `IPSec` for `google/acronym-forms`'s dozen+) marks the WHOLE rule "alive"
// even though every one of its OTHER pairs has never been exercised by any
// fixture, ever. That gap is the exact reason four demonstrably
// prose-corrupting pairs (`aka`, `OAuth 2`, `c/o`/`w/`, `in line`, ...)
// shipped behind an all-green suite: nothing ever asked THEM to fire.
//
// This test closes the gap at the PAIR level, and generates its trigger
// document from the LIVE preset object (`presets['recheck/google']`)
// rather than a hand-maintained static fixture, per the task brief's own
// preference ("generate the fixture content from the pair lists so it
// cannot drift" -- a hand-maintained fixture covering 80+ pairs would rot
// the same way the rule-level one already had). Any pair added to (or
// removed from) any `swap`/`consistency` rule in the preset is
// automatically picked up here with no fixture file to remember to touch.
// =============================================================================

// `keysAreRegex: true` pairs (see google.ts's `no-latinisms`,
// `no-slash-abbrev`, `acronym-forms`, `sha1-form`) store a regex SOURCE as
// their key, not literal text -- e.g. `\bvs\.` requires embedding the text
// "vs.", not the four characters "\bvs\." themselves. That translation
// can't be derived mechanically from the regex source in general, so every
// `keysAreRegex` pair MUST have a literal trigger string registered here,
// keyed by [ruleName][regex source]. A future regex pair added without a
// matching entry fails the test below LOUDLY, naming the exact missing
// key -- it does not silently fall through untested.
const REGEX_KEY_EXAMPLES: Record<string, Record<string, string>> = {
  'google/no-latinisms': {
    '\\bi\\.e\\.': 'i.e.',
    '\\be\\.g\\.': 'e.g.',
  },
  'google/vs-versus': {
    '\\bvs\\.': 'vs.',
  },
  'google/no-slash-abbrev': {
    '\\bc/o(?![A-Za-z])': 'c/o',
    '\\bw/(?![A-Za-z])': 'w/',
  },
  'google/acronym-forms': {
    'OAuth 2(?!\\.0)': 'OAuth 2',
  },
  'google/sha1-form': {
    '(?<!-)\\bSHA1\\b': 'SHA1',
  },
  'google/product-names': {
    '(?<![Gg][Oo][Oo][Gg][Ll][Ee]\\s+)Cloud console': 'Cloud console',
  },
};

// A `keysAreRegex: true` rule can still carry keys that are plain literal
// text under the hood (see `google/acronym-forms`: only its `OAuth 2`
// entry actually needs regex syntax; every other key -- `UNICODE`,
// `IPSec`, `micro-services`, etc. -- is ordinary alphanumeric/hyphen/space
// text that happens to double as a valid, unescaped regex source). Only
// keys containing characters that signal deliberate regex syntax need a
// registered translation; anything else is safe to embed directly.
const RAW_REGEX_SYNTAX = /[\\()?!^$|{}[\]]/;

interface CoverageCase {
  ruleName: string;
  /** The raw config key, exactly as it appears under `pairs`/`either` — what's reported in a failure message. */
  configKey: string;
  /** The literal text to embed in the generated document and look for in the reported `match`. */
  example: string;
  /**
   * `consistency` only: a variant that must appear EARLIER in the document
   * than `example` so `example` (the config key's own variant) is the one
   * consistency.ts reports as "losing" -- see rules/scope/consistency.ts's
   * `collectMatches`, which flags every occurrence of whichever variant
   * did NOT appear first, file-wide.
   */
  preamble?: string;
}

describe('recheck/google preset per-pair coverage (Fix wave A / Step 1)', () => {
  it('every swap/consistency pair key in the preset fires at least once', async () => {
    const preset = presets['recheck/google'];
    const cases: CoverageCase[] = [];
    const missingExamples: string[] = [];

    for (const [ruleName, rule] of Object.entries(preset)) {
      const swapOptions = rule.assertions?.['swap'] as SwapAssertion | undefined;
      if (swapOptions?.pairs) {
        for (const key of Object.keys(swapOptions.pairs)) {
          const registeredExample = REGEX_KEY_EXAMPLES[ruleName]?.[key];
          if (registeredExample !== undefined) {
            cases.push({ ruleName, configKey: key, example: registeredExample });
          } else if (swapOptions.keysAreRegex && RAW_REGEX_SYNTAX.test(key)) {
            missingExamples.push(
              `${ruleName}: no REGEX_KEY_EXAMPLES trigger text registered for regex key ${JSON.stringify(key)}`
            );
          } else {
            // Either an ordinary literal-key rule, or a keysAreRegex rule
            // whose key happens to be plain text with no regex syntax --
            // safe to embed and match against directly.
            cases.push({ ruleName, configKey: key, example: key });
          }
        }
      }

      // No `consistency` rule ships in this preset today, but the brief
      // (and this preset's own future) asks for coverage "across every
      // swap/consistency rule", so this is exercised structurally even
      // though it's currently a no-op loop body.
      //
      // Fix wave C / Item 5: spelled out explicitly, because a passing
      // gate is easy to misread as evidence it doesn't provide. This
      // branch runs on every test invocation and adds zero `cases` (the
      // `if (consistencyOptions?.either)` guard never enters, since no
      // rule in `presets['recheck/google']` carries a `consistency`
      // assertion) -- so its "pass" here proves the loop doesn't throw,
      // NOT that a `consistency` pair's coverage-case generation, its
      // `preamble` ordering, or its `notReported` check actually work.
      // That only gets exercised (and only then is its passing real
      // evidence) once the first `consistency` rule ships in this preset.
      const consistencyOptions = rule.assertions?.['consistency'] as
        | ConsistencyAssertion
        | undefined;
      if (consistencyOptions?.either) {
        for (const [key, value] of Object.entries(consistencyOptions.either)) {
          cases.push({ ruleName, configKey: key, example: key, preamble: String(value) });
        }
      }
    }

    // A missing regex-example entry is itself a coverage failure -- fail
    // here, with the exact key named, rather than silently skipping it.
    expect(missingExamples).toEqual([]);
    expect(cases.length).toBeGreaterThan(50); // sanity: this preset ships 80+ pairs

    // One paragraph per case (plus an earlier preamble paragraph for
    // `consistency` cases) -- paragraphs never merge across a blank line,
    // so no two cases' trigger text can overlap or shadow each other via
    // swap.ts's dropOverlappedShorterMatches / consistency.ts's
    // first-in-source-order winner logic.
    const paragraphs: string[] = [];
    cases.forEach((c, i) => {
      if (c.preamble !== undefined) {
        paragraphs.push(`Coverage preamble ${i}: sample text with ${c.preamble} inside it.`);
      }
      paragraphs.push(`Coverage case ${i}: sample text with ${c.example} inside it.`);
    });
    const doc = ['# Per-pair coverage', '', paragraphs.join('\n\n')].join('\n');

    const problems = await lintContent(doc, { extends: ['recheck/google'] });
    const reportedByRule = new Map<string, Set<string>>();
    for (const p of problems) {
      let matchedTexts = reportedByRule.get(p.ruleName);
      if (!matchedTexts) {
        matchedTexts = new Set();
        reportedByRule.set(p.ruleName, matchedTexts);
      }
      matchedTexts.add(p.match.toLowerCase());
    }

    const notReported: string[] = [];
    for (const { ruleName, configKey, example } of cases) {
      const matches = reportedByRule.get(ruleName);
      if (!matches || !matches.has(example.toLowerCase())) {
        notReported.push(
          `${ruleName}: pair ${JSON.stringify(configKey)} (trigger text ${JSON.stringify(example)}) was never reported`
        );
      }
    }
    expect(notReported).toEqual([]);
  });
});
