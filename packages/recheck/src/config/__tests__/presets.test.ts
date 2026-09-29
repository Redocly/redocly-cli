import { createConfig } from '@redocly/openapi-core';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { presetConfig } from '../../__tests__/preset-block.js';
import { runRules } from '../../core/runner.js';
import { TECHNICAL_PROPER_NOUNS } from '../../data/proper-nouns.js';
import { lintContent } from '../../index.js';
import { recheckPresetsPlugin } from '../../presets.js';
import { scopeRules } from '../../rules/registry.js';
import { allTokenRules } from '../../rules/token/index.js';
import { presets, DOCUMENTED_OPT_IN_ASSERTIONS } from '../presets/index.js';
import { resolveRecheckConfig } from '../resolve.js';
import { validate } from '../validate.js';

describe('extends presets', () => {
  // Binds the `recheck/markdown` preset to the token-rule registry, so a new or renamed token rule
  // without a matching preset entry (or the reverse) fails. Both the number and the names are compared.
  // Rules that Recheck added itself have no markdownlint equivalent, so they are not in
  // `recheck/markdown`. They are listed here instead. A token rule in neither place fails the test.
  const RECHECK_ORIGINAL_TOKEN_RULES = [
    'front-matter',
    'no-duplicate-link-destinations',
    'no-empty-headings',
    'list-length',
    'markdoc-syntax',
    'markdoc-pairing',
    'markdoc-unknown-tag',
    'markdoc-attributes',
  ];

  it('markdown preset contains exactly one entry per registered token rule (no rule can be forgotten)', () => {
    const markdown = presets['recheck/markdown'];
    const presetShortNames = Object.keys(markdown)
      .map((name) => name.replace(/^recheck\//, ''))
      .sort();
    const registeredTokenRuleNames = allTokenRules.map((rule) => rule.name).sort();
    const accountedFor = [...presetShortNames, ...RECHECK_ORIGINAL_TOKEN_RULES].sort();

    expect(accountedFor).toHaveLength(registeredTokenRuleNames.length);
    expect(new Set(accountedFor)).toEqual(new Set(registeredTokenRuleNames));
  });

  it('no Recheck-original token rule is also shipped in the parity preset', () => {
    const presetShortNames = new Set(
      Object.keys(presets['recheck/markdown']).map((name) => name.replace(/^recheck\//, ''))
    );
    for (const original of RECHECK_ORIGINAL_TOKEN_RULES) {
      expect(presetShortNames.has(original), `${original} must not be in recheck/markdown`).toBe(
        false
      );
    }
  });

  it('user entries override preset entries by rule key', async () => {
    const result = await validate(
      await presetConfig(['recheck/minimal'], {
        'recheck/no-trailing-spaces': { severity: 'off' },
      })
    );
    // `validate()` keeps rules with severity `off` and only changes their severity. Filtering them out
    // happens later, at lint time.
    expect(result.isValid).toBe(true);
    const rule = result.rules.find((r) => r.shortName === 'no-trailing-spaces');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('off');
  });

  it('user assertion option overrides preset option while preserving other preset options', async () => {
    const result = await validate(
      await presetConfig(['recheck/minimal'], {
        'recheck/no-hard-tabs': {
          severity: 'error',
          message: 'Custom tabs message.',
          assertions: { 'no-hard-tabs': { spacesPerTab: 4 } },
        },
      })
    );
    expect(result.isValid).toBe(true);
    const rule = result.rules.find((r) => r.shortName === 'no-hard-tabs');
    expect(rule).toBeDefined();
    if (!rule) throw new Error('expected rule to be defined');
    expect(rule.message).toBe('Custom tabs message.');
    expect((rule.assertions['no-hard-tabs'] as any).spacesPerTab).toBe(4);
  });

  it('registers all eleven presets', () => {
    expect(Object.keys(presets).sort()).toEqual([
      'recheck/api-descriptions',
      'recheck/google',
      'recheck/inclusive-language',
      'recheck/markdoc',
      'recheck/markdown',
      'recheck/markdown-relaxed',
      'recheck/microsoft',
      'recheck/minimal',
      'recheck/plain-language',
      'recheck/prose',
      'recheck/technical-english',
    ]);
  });

  it('markdown-relaxed is recheck/markdown with exactly the markdownlint relaxed-style rules turned off', () => {
    const relaxedOff = new Set(
      [
        'no-trailing-spaces',
        'no-hard-tabs',
        'no-multiple-blanks',
        'no-multiple-space-blockquote',
        'no-blanks-blockquote',
        'line-length',
        'ul-indent',
        'no-inline-html',
        'no-bare-urls',
        'fenced-code-language',
        'first-line-h1',
      ].map((name) => `recheck/${name}`)
    );
    const markdown = presets['recheck/markdown'];
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(Object.keys(relaxed).sort()).toEqual(Object.keys(markdown).sort());
    for (const [key, rule] of Object.entries(markdown)) {
      expect(relaxed[key], key).toEqual(relaxedOff.has(key) ? { ...rule, severity: 'off' } : rule);
    }
  });

  it('recheck/minimal expands to its five rules', async () => {
    const result = await validate(await presetConfig(['recheck/minimal']));
    expect(result.isValid).toBe(true);
    expect(result.rules.map((rule) => rule.shortName).sort()).toEqual([
      'no-empty-links',
      'no-hard-tabs',
      'no-reversed-links',
      'no-trailing-spaces',
      'single-trailing-newline',
    ]);
  });
});

describe('recheck/prose preset', () => {
  // The preset contents are exact: `repetition`, `consistency` (four US/UK spelling pairs) and
  // `capitalization` (`$sentence`, headings only), all at severity `warn`. `occurrence`, `conditional`,
  // `metric` and `spelling` are left out on purpose and documented as opt-in, see the "registry <->
  // preset completeness" tests below.
  it('contains exactly repetition, consistency, and capitalization — nothing else', () => {
    const prose = presets['recheck/prose'];
    expect(Object.keys(prose).sort()).toEqual(
      ['repetition', 'consistency', 'capitalization'].map((name) => `recheck/${name}`).sort()
    );
  });

  // `consistency.ts` only auto-fixes a pair when both variants have the same word count. All four
  // pairs here are one-word spelling variants, so the guard changes nothing. This is checked on the
  // pairs themselves and with a real `--fix` run.
  it("consistency's engine guard does not affect recheck/prose: all four pairs are same-word-count", () => {
    const rule = presets['recheck/prose']['recheck/consistency'];
    const either = (rule.assertions.consistency as { either: Record<string, string> }).either;
    for (const [key, value] of Object.entries(either)) {
      expect(key.trim().split(/\s+/), `"${key}" should be a single word`).toHaveLength(1);
      expect(value.trim().split(/\s+/), `"${value}" should be a single word`).toHaveLength(1);
    }
  });

  it('recheck/prose consistency still auto-fixes a genuine same-word-count conflict end-to-end', async () => {
    const content = 'The color palette is set.\n\nUse the same colour again.\n';
    const { rules } = await validate(await presetConfig(['recheck/prose']));
    const { fixedFiles } = await runRules([{ path: 'x.md', content }], rules, { fix: true });
    expect(fixedFiles.get('x.md')).toBe('The color palette is set.\n\nUse the same color again.\n');
  });

  // Without `ignoreCase: true`, a capitalized variant at the start of a sentence ("Colour") would
  // match neither the key nor the value, and the rule would miss it.
  it('consistency flags a capitalized, sentence-initial variant against a later lowercase one (ignoreCase)', async () => {
    const problems = await lintContent(
      'Colour is used here.\n\nlater color appears.\n',
      await presetConfig(['recheck/prose'], {})
    );
    const consistencyProblems = problems.filter((p) => p.ruleName === 'recheck/consistency');
    expect(consistencyProblems).toHaveLength(1);
  });

  // A fix must keep the casing of the text it replaces, so "Behavior" at the start of a sentence
  // becomes "Behaviour", not "behaviour". Run twice to check the result is stable.
  it('CLI --fix repro: a sentence-initial capitalized losing match is fixed to the capitalized winner, not lowercased (idempotent)', async () => {
    const content =
      'We spell it colour and behaviour throughout this document.\n\n' +
      'Behavior of the parser matters. Color is fine.\n';
    const { rules } = await validate(await presetConfig(['recheck/prose']));

    const { fixedFiles: firstPass } = await runRules([{ path: 'x.md', content }], rules, {
      fix: true,
    });
    const fixedOnce = firstPass.get('x.md') ?? content;
    expect(fixedOnce).toBe(
      'We spell it colour and behaviour throughout this document.\n\n' +
        'Behaviour of the parser matters. Colour is fine.\n'
    );

    const { fixedFiles: secondPass } = await runRules(
      [{ path: 'x.md', content: fixedOnce }],
      rules,
      {
        fix: true,
      }
    );
    expect(secondPass.get('x.md') ?? fixedOnce).toBe(fixedOnce);
  });

  // The preset has no `exceptions`, so this pins the vocabulary that `capitalization` falls back on.
  // These words must stay protected, or `$sentence` headings would flag every proper noun. The length
  // is a minimum, not a target.
  it('the built-in technical proper-noun vocabulary is non-empty and protects the carried-over required words', () => {
    expect(Array.isArray(TECHNICAL_PROPER_NOUNS)).toBe(true);
    expect(TECHNICAL_PROPER_NOUNS.length).toBeGreaterThanOrEqual(15);
    for (const word of ['OpenAPI', 'AsyncAPI', 'GraphQL', 'macOS', 'iOS', 'npm', 'Redocly']) {
      expect(TECHNICAL_PROPER_NOUNS, `vocabulary should protect "${word}"`).toContain(word);
    }
    // Sorted case-insensitively, like the other word lists in this package.
    const sorted = [...TECHNICAL_PROPER_NOUNS].sort((a, b) =>
      a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
    );
    expect(TECHNICAL_PROPER_NOUNS).toEqual(sorted);
    expect(new Set(TECHNICAL_PROPER_NOUNS.map((w) => w.toLowerCase())).size).toBe(
      TECHNICAL_PROPER_NOUNS.length
    );
  });

  // Matching handles phrases, so multi-word entries work. This is tested through the real preset, not
  // only by checking the list.
  it('permits multi-token vocabulary entries (whitespace and dotted) and both actually survive the $sentence round trip', async () => {
    const whitespaceEntry = TECHNICAL_PROPER_NOUNS.find((n) => /\s/.test(n) && !n.includes('.'));
    const dottedEntry = TECHNICAL_PROPER_NOUNS.find((n) => n.includes('.'));
    expect(
      whitespaceEntry,
      'vocabulary should contain at least one whitespace (multi-word) entry'
    ).toBeDefined();
    expect(dottedEntry, 'vocabulary should contain at least one dotted entry').toBeDefined();

    for (const entry of [whitespaceEntry, dottedEntry] as string[]) {
      const problems = await lintContent(
        `# Deploy with ${entry} today\n`,
        await presetConfig(['recheck/prose'], {})
      );
      expect(
        problems.filter((p) => p.ruleName === 'recheck/capitalization'),
        `"${entry}" should survive the $sentence round trip unmodified`
      ).toEqual([]);
    }
  });

  // A phrase at the start of a heading used to be flagged wrongly, because phrase masking removed it
  // before the first word was found. Every multi-word entry is tested in first position. The entries
  // come from TECHNICAL_PROPER_NOUNS, so a new phrase is covered automatically.
  it('permits EVERY multi-token vocabulary entry in leading position under recheck/prose (#25610)', async () => {
    const phraseEntries = TECHNICAL_PROPER_NOUNS.filter((n) => /[\s.]/.test(n));
    expect(
      phraseEntries.length,
      'vocabulary should ship at least one multi-token entry'
    ).toBeGreaterThan(0);

    for (const entry of phraseEntries) {
      const content = `# ${entry} configuration for teams\n`;
      const problems = await lintContent(content, await presetConfig(['recheck/prose']));
      expect(
        problems.filter((p) => p.ruleName === 'recheck/capitalization'),
        `"${entry}" in leading position should produce no capitalization finding`
      ).toEqual([]);
    }
  });

  it('an exception-protected heading ("Use OpenAPI descriptions") produces no capitalization finding', async () => {
    const problems = await lintContent(
      '## Use OpenAPI descriptions\n',
      await presetConfig(['recheck/prose'], {})
    );
    expect(problems.filter((p) => p.ruleName === 'recheck/capitalization')).toEqual([]);
  });

  it('a title-cased heading ("Use The API Now") IS flagged as a sentence-case violation', async () => {
    const problems = await lintContent(
      '## Use The API Now\n',
      await presetConfig(['recheck/prose'])
    );
    const capitalizationProblems = problems.filter((p) => p.ruleName === 'recheck/capitalization');
    expect(capitalizationProblems).toHaveLength(1);
    expect(capitalizationProblems[0].message).toContain('$sentence');
    expect(capitalizationProblems[0].severity).toBe('warn');
  });

  // ALL-CAPS words (2+ letters) are kept by sentenceCase, so a heading of acronyms stays clean.
  it('an ALL-CAPS acronym heading is unaffected', async () => {
    const problems = await lintContent(
      '## Configure CORS for the API and CDN\n',
      await presetConfig(['recheck/prose'], {})
    );
    expect(problems.filter((p) => p.ruleName === 'recheck/capitalization')).toEqual([]);
  });

  // A `--fix` run over a heading the rule flags must produce no fix and leave the file unchanged.
  it('emits no fix for a flagged heading under --fix, despite the rule being inherently fixable', async () => {
    const content = '## Use The API Now\n';
    const result = await validate(await presetConfig(['recheck/prose']));
    expect(result.isValid).toBe(true);
    const capitalizationRule = result.rules.filter((r) => r.shortName === 'capitalization');
    expect(capitalizationRule).toHaveLength(1);

    const run = await runRules([{ path: 'headings.md', content }], capitalizationRule, {
      fix: true,
    });
    expect(run.problems).toHaveLength(1);
    expect(run.fixes).toEqual([]);
    expect(run.fixedFiles.size).toBe(0);

    // The same rule without `fix: false` does produce a fix, so the empty result comes from the opt-out.
    const fixable = await runRules(
      [{ path: 'headings.md', content }],
      [{ ...capitalizationRule[0], fix: undefined }],
      { fix: true }
    );
    expect(fixable.fixes).toHaveLength(1);
  });

  it('expands via extends into normalized rules with the right severities', async () => {
    const result = await validate(await presetConfig(['recheck/prose']));
    expect(result.isValid).toBe(true);
    const byShortName = new Map(result.rules.map((r) => [r.shortName, r]));
    expect(byShortName.get('repetition')?.severity).toBe('warn');
    expect(byShortName.get('consistency')?.severity).toBe('warn');
    expect(byShortName.get('capitalization')?.severity).toBe('warn');
    expect(byShortName.get('capitalization')?.scope).toBe('heading');
    expect(byShortName.get('repetition')?.scope).toBe('summary');
    expect(byShortName.get('consistency')?.scope).toBe('summary');
  });

  it('repetition/consistency never touch code blocks or frontmatter, but still flag prose', async () => {
    const md =
      '---\ntitle: the the colour and color here\n---\n\n' +
      '# Heading\n\n' +
      '```\nthe the\ncolour then color\n```\n\n' +
      'Prose with the the repeat.\n';
    const problems = await lintContent(md, await presetConfig(['recheck/prose']));

    const repetitionProblems = problems.filter((p) => p.ruleName === 'recheck/repetition');
    const consistencyProblems = problems.filter((p) => p.ruleName === 'recheck/consistency');

    // The code fence and frontmatter (lines 2, 8, 9) are not scanned...
    expect(repetitionProblems.every((p) => p.line === 12)).toBe(true);
    expect(consistencyProblems).toEqual([]);
    // ...but the repeated paragraph on line 12 is still reported.
    expect(repetitionProblems.length).toBeGreaterThan(0);
  });

  // AJV's `useDefaults` changes the object it validates (for example it adds `scope: 'all'`).
  // Core's merge keeps references to the shared preset rules, so resolving must not change them.
  it('resolving a config never mutates the shared presets, so a later config does not see an earlier one', async () => {
    const before = JSON.stringify(presets);

    const config = await createConfig(
      {
        extends: Object.keys(presets),
        recheck: { rules: { 'recheck/capitalization': { severity: 'error' } } },
      },
      { plugins: [recheckPresetsPlugin] }
    );
    await resolveRecheckConfig({ block: config.recheck, configDir: process.cwd() });
    expect(JSON.stringify(presets)).toBe(before);

    const later = await validate(await presetConfig(['recheck/prose']));
    expect(later.rules.find((rule) => rule.shortName === 'capitalization')?.severity).toBe('warn');
  });
});

describe('registry <-> preset completeness (native scope-rule assertions)', () => {
  // Every assertion in the live `scopeRules` registry must either ship in a preset or be exported as
  // a documented opt-in (`DOCUMENTED_OPT_IN_ASSERTIONS`) with a README snippet. The list comes from
  // the registry, so a new assertion without a decision fails here. This covers scope rules only,
  // not token rules (`allTokenRules`).
  const PRE_EXISTING_GENERIC_ASSERTIONS = [
    'swap',
    'pattern',
    'semantic-line-breaks',
    'max-image-size',
  ] as const;

  it('every non-generic scope-rule assertion is either shipped in a preset or a documented opt-in, never neither and never both', () => {
    const shippedIds = new Set(
      Object.values(presets).flatMap((preset) =>
        Object.values(preset).flatMap((rule) => Object.keys(rule.assertions))
      )
    );
    const optInIds = new Set<string>(DOCUMENTED_OPT_IN_ASSERTIONS);
    const candidates = Object.keys(scopeRules).filter(
      (id) => !(PRE_EXISTING_GENERIC_ASSERTIONS as readonly string[]).includes(id)
    );
    const undecided = candidates.filter((id) => shippedIds.has(id) === optInIds.has(id));
    expect(undecided).toEqual([]);
  });
});

describe('preset data', () => {
  it('validates every preset alone, with a message on every rule', async () => {
    for (const id of Object.keys(presets)) {
      const result = await validate(await presetConfig([id]));
      expect(result.errors, id).toEqual([]);
      for (const rule of result.rules) {
        expect(rule.message, `${id} ${rule.name}`).toBeTruthy();
      }
    }
  });
});

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function readFixture(name: string): Promise<string> {
  return readFile(path.join(fixturesDir, name), 'utf8');
}

// The preset namespace is part of the public rule key (`google/<rule>`), and these presets only detect:
// a style guide must not rewrite prose. `single-h1` and `first-line-h1` in the Google preset check
// opposite things about the first heading, so it needs two violation fixtures.
const STYLE_PRESETS = [
  {
    id: 'recheck/google',
    namespace: 'google',
    violations: ['google-violations.md', 'google-violations-single-h1.md'],
    clean: 'google-clean.md',
  },
  {
    id: 'recheck/microsoft',
    namespace: 'microsoft',
    violations: ['microsoft-violations.md'],
    clean: 'microsoft-clean.md',
  },
  {
    id: 'recheck/inclusive-language',
    namespace: 'inclusive-language',
    violations: ['inclusive-language-violations.md'],
    clean: 'inclusive-language-clean.md',
  },
  {
    id: 'recheck/plain-language',
    namespace: 'plain-language',
    violations: ['plain-language-violations.md'],
    clean: 'plain-language-clean.md',
  },
  {
    id: 'recheck/technical-english',
    namespace: 'technical-english',
    violations: ['technical-english-violations.md'],
    clean: 'technical-english-clean.md',
  },
] as const;

describe.each(STYLE_PRESETS)('$id', ({ id, namespace, violations, clean }) => {
  it('namespaces every rule key as <namespace>/<rule>', () => {
    for (const key of Object.keys(presets[id])) {
      expect(key.startsWith(`${namespace}/`), key).toBe(true);
    }
  });

  it('is detection-only: no rule is fixable and --fix rewrites nothing', async () => {
    expect(
      Object.entries(presets[id])
        .filter(([, rule]) => rule.fix !== false)
        .map(([key]) => key)
    ).toEqual([]);

    const { rules } = await validate(await presetConfig([id]));
    const files = await Promise.all(
      violations.map(async (name) => ({ path: name, content: await readFixture(name) }))
    );
    const run = await runRules(files, rules, { fix: true });
    expect(run.fixes).toEqual([]);
    expect(run.skippedFixes).toEqual([]);
    expect(run.fixedFiles.size).toBe(0);
  });

  // A rule that ships but can never fire would go unnoticed otherwise.
  it('reports every rule it ships on its violations fixtures', async () => {
    const reported = new Set<string>();
    for (const name of violations) {
      for (const problem of await lintContent(await readFixture(name), await presetConfig([id]))) {
        reported.add(problem.ruleName);
      }
    }
    expect(Object.keys(presets[id]).filter((key) => !reported.has(key))).toEqual([]);
  });

  it('reports nothing on compliant prose', async () => {
    expect(await lintContent(await readFixture(clean), await presetConfig([id]))).toEqual([]);
  });
});

describe('recheck/markdoc preset', () => {
  it('is detection-only', () => {
    for (const rule of Object.values(presets['recheck/markdoc'])) {
      expect(rule.fix).toBe(false);
    }
  });
});

// Stacked presets merge by rule key, so each preset namespaces its keys. Composing them must not lose
// or merge any key, and every rule must keep its own options and severity.
describe('stacking presets', () => {
  it.each([
    [['recheck/markdown', 'recheck/google', 'recheck/inclusive-language']],
    [['recheck/markdown', 'recheck/prose']],
    [['recheck/markdown', 'recheck/markdoc']],
    [['recheck/microsoft', 'recheck/plain-language']],
  ])('%j keeps every rule of every preset unchanged', async (ids) => {
    const config: Record<string, unknown> = await presetConfig(ids);

    const ruleCount = ids.reduce((count, id) => count + Object.keys(presets[id]).length, 0);
    expect(Object.keys(config)).toHaveLength(ruleCount);
    for (const id of ids) {
      for (const [key, rule] of Object.entries(presets[id])) {
        expect(config[key], `${id} ${key}`).toEqual(rule);
      }
    }
  });
});

// Stacked presets can report the same span twice. The counts are exact, so a change that adds or
// removes a duplicate is noticed. Each fixture is the violations fixture of the second preset.
function duplicatePositions(
  problems: { file: string; line: number; column: number; ruleName: string }[]
) {
  const byPosition = new Map<string, Set<string>>();
  for (const problem of problems) {
    const key = `${problem.file}:${problem.line}:${problem.column}`;
    byPosition.set(key, (byPosition.get(key) ?? new Set()).add(problem.ruleName));
  }
  return [...byPosition.values()].filter((rules) => rules.size > 1);
}

describe('duplicate findings across stacked presets', () => {
  it('markdown + google + inclusive-language: 11, each pairing a google rule with an inclusive-language rule', async () => {
    const problems = await lintContent(
      await readFixture('inclusive-language-violations.md'),
      await presetConfig(['recheck/markdown', 'recheck/google', 'recheck/inclusive-language'], {})
    );
    const dupes = duplicatePositions(problems);
    expect(dupes).toHaveLength(11);
    for (const rules of dupes) {
      const names = [...rules];
      expect(names.some((name) => name.startsWith('google/'))).toBe(true);
      expect(names.some((name) => name.startsWith('inclusive-language/'))).toBe(true);
    }
  });

  it.each([
    ['recheck/microsoft', 'inclusive-language-violations.md', 'recheck/inclusive-language', 8],
    ['recheck/google', 'plain-language-violations.md', 'recheck/plain-language', 3],
    ['recheck/microsoft', 'plain-language-violations.md', 'recheck/plain-language', 3],
  ])('%s + %s fixture with %s: %i duplicate positions', async (first, fixture, second, count) => {
    const problems = await lintContent(
      await readFixture(fixture),
      await presetConfig([first, second])
    );
    expect(duplicatePositions(problems)).toHaveLength(count);
  });

  // `in order to` and `utilize`/`utilization` are already covered by both google and microsoft.
  it('plain-language does not re-ship "in order to" or "utilize"/"utilization"', () => {
    const swapKeys = Object.values(presets['recheck/plain-language']).flatMap((rule) =>
      Object.keys((rule.assertions['swap'] as { pairs?: Record<string, string> })?.pairs ?? {})
    );
    const lowercased = new Set(swapKeys.map((key) => key.toLowerCase()));
    for (const covered of ['in order to', 'utilize', 'utilization']) {
      expect(lowercased.has(covered), covered).toBe(false);
    }
  });
});
