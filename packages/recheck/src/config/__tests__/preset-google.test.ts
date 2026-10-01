import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import type { ConsistencyAssertion, SwapAssertion } from '../../types/index.js';
import { presets } from '../presets/index.js';

// The rule keys here are `google/<rule>`, not `recheck/<rule>`, so `shortName` equals the full key
// and rule names can be compared directly.
describe('recheck/google preset namespace', () => {
  it('every rule key in the preset is namespaced google/<rule>, not recheck/<rule>', () => {
    const keys = Object.keys(presets['recheck/google']);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.startsWith('google/'), `expected "${key}" to start with "google/"`).toBe(true);
    }
  });
});

// No rule may be fixable. This reads the live preset, so a new rule cannot bring fixing back.
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
  // A rule that ships but can never fire would go unnoticed otherwise. Two fixtures are needed:
  // `single-h1` and `first-line-h1` check opposite things about the first heading, so no single
  // document can trigger both.
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

  // Compliant prose must produce no findings.
  it('reports nothing on compliant prose', async () => {
    const md = await readFile(fixture('google-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/google'] });
    expect(problems).toEqual([]);
  });
});

// Checks every swap pair, not only every rule. The trigger document is built from the live preset,
// so added or removed pairs are covered without editing a fixture.

// Regex keys (`keysAreRegex`) need literal trigger text, for example `vs.` for `\bvs\.`. Every regex
// key needs an entry here, by rule name and regex source, or the test fails and names the key.
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

// Some keys of a `keysAreRegex` rule are plain text. Only keys with regex syntax need an entry above.
const RAW_REGEX_SYNTAX = /[\\()?!^$|{}[\]]/;

interface CoverageCase {
  ruleName: string;
  /** The raw config key, as shown in failure messages. */
  configKey: string;
  /** The literal text to put in the document and find in the reported `match`. */
  example: string;
  /** `consistency` only: a variant placed earlier in the document, so `example` is the one reported. */
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
            // A plain literal key, or a regex key with no regex syntax: use it as is.
            cases.push({ ruleName, configKey: key, example: key });
          }
        }
      }

      // No rule in this preset uses `consistency` yet, so this adds no cases. It becomes a real check
      // when one is added.
      const consistencyOptions = rule.assertions?.['consistency'] as
        | ConsistencyAssertion
        | undefined;
      if (consistencyOptions?.either) {
        for (const [key, value] of Object.entries(consistencyOptions.either)) {
          cases.push({ ruleName, configKey: key, example: key, preamble: String(value) });
        }
      }
    }

    // A regex key without an example fails here, with the key named.
    expect(missingExamples).toEqual([]);
    expect(cases.length).toBeGreaterThan(50);

    // One paragraph per case, so trigger texts cannot overlap or hide each other.
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
