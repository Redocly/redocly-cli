import { describe, expect, it } from 'vitest';

import { runRules } from '../../core/runner.js';
import { TECHNICAL_PROPER_NOUNS } from '../../data/proper-nouns.js';
import { lintContent } from '../../index.js';
import { scopeRules } from '../../rules/registry.js';
import { allTokenRules, RECHECK_ORIGINAL_TOKEN_RULE_NAMES } from '../../rules/token/index.js';
import type { ScopeRule } from '../../rules/types.js';
import { presets, DOCUMENTED_OPT_IN_ASSERTIONS } from '../presets/index.js';
import { registerPresetRules } from '../presets/markdown.js';
import { PROSE_PRESET_ASSERTIONS, buildProsePreset } from '../presets/prose.js';
import { validate } from '../validate.js';

describe('extends presets', () => {
  // Binds the `recheck/markdown` preset to the token-rule registry, so a new or renamed token rule
  // without a matching preset entry (or the reverse) fails. Both the number and the names are compared.
  // Rules that Recheck added itself have no markdownlint equivalent, so they are not in
  // `recheck/markdown`. They are listed here instead. A token rule in neither place fails the test.
  const RECHECK_ORIGINAL_TOKEN_RULES = RECHECK_ORIGINAL_TOKEN_RULE_NAMES;

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

  it('expands recheck/minimal into normalized rules', async () => {
    const result = await validate({ extends: ['recheck/minimal'] });
    expect(result.isValid).toBe(true);
    expect(result.rules.map((r) => r.shortName)).toContain('no-trailing-spaces');
  });

  it('user entries override preset entries by rule key', async () => {
    const result = await validate({
      extends: ['recheck/minimal'],
      'recheck/no-trailing-spaces': { severity: 'off' },
    });
    // `validate()` keeps rules with severity `off` and only changes their severity. Filtering them out
    // happens later, at lint time.
    expect(result.isValid).toBe(true);
    const rule = result.rules.find((r) => r.shortName === 'no-trailing-spaces');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('off');
  });

  it('user assertion option overrides preset option while preserving other preset options', async () => {
    const result = await validate({
      extends: ['recheck/minimal'],
      'recheck/no-hard-tabs': {
        severity: 'error',
        message: 'Custom tabs message.',
        assertions: { 'no-hard-tabs': { spacesPerTab: 4 } },
      },
    });
    expect(result.isValid).toBe(true);
    const rule = result.rules.find((r) => r.shortName === 'no-hard-tabs');
    expect(rule).toBeDefined();
    if (!rule) throw new Error('expected rule to be defined');
    expect(rule.message).toBe('Custom tabs message.');
    expect((rule.assertions['no-hard-tabs'] as any).spacesPerTab).toBe(4);
  });

  it('rejects unknown preset names as validation errors', async () => {
    const result = await validate({ extends: ['recheck/nope'] });
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toContain('recheck/nope');
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

  it('config without extends is unaffected', async () => {
    const result = await validate({
      'recheck/test-rule': {
        severity: 'error',
        message: 'Test message',
        assertions: { pattern: { tokens: ['foo'] } },
      },
    });
    expect(result.isValid).toBe(true);
    expect(result.rules.map((r) => r.shortName)).toEqual(['test-rule']);
  });

  it('a preset entry whose assertion id cannot resolve produces a clear validation error at load, not a throw', async () => {
    // A made-up preset entry, so the unresolvable-id error can be tested without a broken name in real
    // config. The id is fictitious so it can never start to resolve.
    const result = await validate({
      'recheck/not-a-real-rule': {
        severity: 'error',
        message: 'Not a real rule.',
        assertions: { 'not-a-real-rule': {} },
      },
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('not-a-real-rule'))).toBe(true);
  });

  it('markdown preset includes the batch-1 heading rules, batch-2 whitespace/line rules, batch-3 list rules, batch-4 code/inline rules, batch-5 link/image/emphasis rules, and batch-6 blockquote/table rules, registered incrementally by each batch', async () => {
    const markdown = presets['recheck/markdown'];
    expect(Object.keys(markdown).sort()).toEqual(
      [
        'heading-increment',
        'heading-style',
        'no-missing-space-atx',
        'no-multiple-space-atx',
        'no-missing-space-closed-atx',
        'no-multiple-space-closed-atx',
        'blanks-around-headings',
        'heading-start-left',
        'no-duplicate-heading',
        'single-h1',
        'no-trailing-punctuation',
        'no-emphasis-as-heading',
        'first-line-h1',
        'required-headings',
        'no-trailing-spaces',
        'no-hard-tabs',
        'no-multiple-blanks',
        'line-length',
        'single-trailing-newline',
        'hr-style',
        'ul-style',
        'list-indent',
        'ul-indent',
        'ol-prefix',
        'list-marker-space',
        'blanks-around-lists',
        'no-reversed-links',
        'commands-show-output',
        'blanks-around-fences',
        'no-space-in-emphasis',
        'no-space-in-code',
        'no-space-in-links',
        'fenced-code-language',
        'no-empty-links',
        'code-block-style',
        'code-fence-style',
        'no-inline-html',
        'no-bare-urls',
        'proper-names',
        'no-alt-text',
        'emphasis-style',
        'strong-style',
        'link-fragments',
        'reference-links-images',
        'link-image-reference-definitions',
        'link-image-style',
        'descriptive-link-text',
        'no-multiple-space-blockquote',
        'no-blanks-blockquote',
        'table-pipe-style',
        'table-column-count',
        'blanks-around-tables',
        'table-column-style',
      ]
        .map((name) => `recheck/${name}`)
        .sort()
    );
    // Messages come from each token rule's `defaults.message`, not from a separate map.
    const validated = await validate({ extends: ['recheck/markdown'] });
    expect(validated.isValid).toBe(true);
    const messages = new Map(validated.rules.map((rule) => [rule.name, rule.message]));
    expect(messages.get('recheck/heading-increment')).toBe(
      'Heading levels should only increment by one level at a time.'
    );
    expect(messages.get('recheck/single-trailing-newline')).toBe(
      'Files should end with a single newline character.'
    );
    expect(messages.get('recheck/no-trailing-spaces')).toBe('Trailing spaces');
    expect(messages.get('recheck/no-hard-tabs')).toBe('Hard tabs');
    expect(messages.get('recheck/ul-style')).toBe('Unordered list style');
    expect(messages.get('recheck/blanks-around-lists')).toBe(
      'Lists should be surrounded by blank lines'
    );
    expect(messages.get('recheck/no-reversed-links')).toBe('Reversed link syntax');
    expect(messages.get('recheck/no-space-in-emphasis')).toBe('Spaces inside emphasis markers');
    expect(messages.get('recheck/no-empty-links')).toBe('No empty links');
    expect(messages.get('recheck/no-inline-html')).toBe('Inline HTML');
    expect(messages.get('recheck/link-fragments')).toBe('Link fragments should be valid');
    expect(messages.get('recheck/link-image-style')).toBe('Link and image style');
    expect(messages.get('recheck/no-multiple-space-blockquote')).toBe(
      'Multiple spaces after blockquote symbol'
    );
    expect(messages.get('recheck/no-blanks-blockquote')).toBe('Blank line inside blockquote');
    expect(messages.get('recheck/table-pipe-style')).toBe('Table pipe style');
    expect(messages.get('recheck/table-column-count')).toBe('Table column count');
    expect(messages.get('recheck/blanks-around-tables')).toBe(
      'Tables should be surrounded by blank lines'
    );
    expect(messages.get('recheck/table-column-style')).toBe('Table column style');
  });

  it('markdown-relaxed preset turns off no-inline-html and no-bare-urls (upstream "no-inline-html"/"no-bare-urls": false) and leaves the other nine batch-5 rules untouched', () => {
    // relaxed.json turns off only these two. The other nine rules keep their base severity.
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/no-inline-html'].severity).toBe('off');
    expect(relaxed['recheck/no-bare-urls'].severity).toBe('off');
    expect(relaxed['recheck/proper-names']).toEqual(
      presets['recheck/markdown']['recheck/proper-names']
    );
    expect(relaxed['recheck/no-alt-text']).toEqual(
      presets['recheck/markdown']['recheck/no-alt-text']
    );
    expect(relaxed['recheck/emphasis-style']).toEqual(
      presets['recheck/markdown']['recheck/emphasis-style']
    );
    expect(relaxed['recheck/strong-style']).toEqual(
      presets['recheck/markdown']['recheck/strong-style']
    );
    expect(relaxed['recheck/link-fragments']).toEqual(
      presets['recheck/markdown']['recheck/link-fragments']
    );
    expect(relaxed['recheck/reference-links-images']).toEqual(
      presets['recheck/markdown']['recheck/reference-links-images']
    );
    expect(relaxed['recheck/link-image-reference-definitions']).toEqual(
      presets['recheck/markdown']['recheck/link-image-reference-definitions']
    );
    expect(relaxed['recheck/link-image-style']).toEqual(
      presets['recheck/markdown']['recheck/link-image-style']
    );
    expect(relaxed['recheck/descriptive-link-text']).toEqual(
      presets['recheck/markdown']['recheck/descriptive-link-text']
    );
  });

  it('markdown-relaxed preset turns off fenced-code-language (upstream "fenced-code-language": false) and leaves the other nine batch-4 rules untouched', () => {
    // relaxed.json turns off only fenced-code-language (MD040), not the other nine rules.
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/fenced-code-language'].severity).toBe('off');
    expect(relaxed['recheck/no-reversed-links']).toEqual(
      presets['recheck/markdown']['recheck/no-reversed-links']
    );
    expect(relaxed['recheck/commands-show-output']).toEqual(
      presets['recheck/markdown']['recheck/commands-show-output']
    );
    expect(relaxed['recheck/blanks-around-fences']).toEqual(
      presets['recheck/markdown']['recheck/blanks-around-fences']
    );
    expect(relaxed['recheck/no-space-in-emphasis']).toEqual(
      presets['recheck/markdown']['recheck/no-space-in-emphasis']
    );
    expect(relaxed['recheck/no-space-in-code']).toEqual(
      presets['recheck/markdown']['recheck/no-space-in-code']
    );
    expect(relaxed['recheck/no-space-in-links']).toEqual(
      presets['recheck/markdown']['recheck/no-space-in-links']
    );
    expect(relaxed['recheck/no-empty-links']).toEqual(
      presets['recheck/markdown']['recheck/no-empty-links']
    );
    expect(relaxed['recheck/code-block-style']).toEqual(
      presets['recheck/markdown']['recheck/code-block-style']
    );
    expect(relaxed['recheck/code-fence-style']).toEqual(
      presets['recheck/markdown']['recheck/code-fence-style']
    );
  });

  it('minimal preset contains exactly the five planned rules, with no-reversed-links and no-empty-links now registered by batch 4', async () => {
    const minimal = presets['recheck/minimal'];
    expect(Object.keys(minimal).sort()).toEqual(
      [
        'no-trailing-spaces',
        'no-hard-tabs',
        'single-trailing-newline',
        'no-reversed-links',
        'no-empty-links',
      ]
        .map((name) => `recheck/${name}`)
        .sort()
    );
    const validated = await validate({ extends: ['recheck/minimal'] });
    expect(validated.isValid).toBe(true);
    const messages = new Map(validated.rules.map((rule) => [rule.name, rule.message]));
    expect(messages.get('recheck/no-reversed-links')).toBe('Reversed link syntax');
    expect(messages.get('recheck/no-empty-links')).toBe('No empty links');
  });

  it('markdown-relaxed preset computes overrides on top of markdown preset, activating the first-line-h1 override now that it is registered', () => {
    // markdown-relaxed is the markdown preset plus overrides from relaxed.json, which turns off first-line-h1.
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/first-line-h1'].severity).toBe('off');
    // The other heading rules are unchanged.
    expect(relaxed['recheck/heading-increment']).toEqual(
      presets['recheck/markdown']['recheck/heading-increment']
    );
  });

  it('markdown-relaxed preset turns off the batch-2 whitespace rules (upstream "whitespace" tag) and line-length (upstream "line_length")', () => {
    // relaxed.json turns off the "whitespace" tag (MD009, MD010, MD012) and "line_length" (MD013, `line-length`).
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/no-trailing-spaces'].severity).toBe('off');
    expect(relaxed['recheck/no-hard-tabs'].severity).toBe('off');
    expect(relaxed['recheck/no-multiple-blanks'].severity).toBe('off');
    expect(relaxed['recheck/line-length'].severity).toBe('off');
    // relaxed.json does not touch hr-style or single-trailing-newline.
    expect(relaxed['recheck/hr-style']).toEqual(presets['recheck/markdown']['recheck/hr-style']);
    expect(relaxed['recheck/single-trailing-newline']).toEqual(
      presets['recheck/markdown']['recheck/single-trailing-newline']
    );
  });

  it('markdown-relaxed preset turns off ul-indent (upstream "ul-indent": false) and leaves the other five batch-3 list rules untouched', () => {
    // relaxed.json turns off only ul-indent (MD007), not the other five list rules.
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/ul-indent'].severity).toBe('off');
    expect(relaxed['recheck/ul-style']).toEqual(presets['recheck/markdown']['recheck/ul-style']);
    expect(relaxed['recheck/list-indent']).toEqual(
      presets['recheck/markdown']['recheck/list-indent']
    );
    expect(relaxed['recheck/ol-prefix']).toEqual(presets['recheck/markdown']['recheck/ol-prefix']);
    expect(relaxed['recheck/list-marker-space']).toEqual(
      presets['recheck/markdown']['recheck/list-marker-space']
    );
    expect(relaxed['recheck/blanks-around-lists']).toEqual(
      presets['recheck/markdown']['recheck/blanks-around-lists']
    );
  });

  it('markdown-relaxed preset turns off the batch-6 blockquote whitespace rules (upstream "whitespace" tag) and leaves the four table rules untouched', () => {
    // relaxed.json turns off the "whitespace" tag, which MD027 and MD028 have. The four table rules do
    // not have it, so they keep the base severity.
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/no-multiple-space-blockquote'].severity).toBe('off');
    expect(relaxed['recheck/no-blanks-blockquote'].severity).toBe('off');
    expect(relaxed['recheck/table-pipe-style']).toEqual(
      presets['recheck/markdown']['recheck/table-pipe-style']
    );
    expect(relaxed['recheck/table-column-count']).toEqual(
      presets['recheck/markdown']['recheck/table-column-count']
    );
    expect(relaxed['recheck/blanks-around-tables']).toEqual(
      presets['recheck/markdown']['recheck/blanks-around-tables']
    );
    expect(relaxed['recheck/table-column-style']).toEqual(
      presets['recheck/markdown']['recheck/table-column-style']
    );
  });

  it('never mutates the shared preset registry across validate() calls', async () => {
    const minimalBefore = presets['recheck/minimal'];
    const hardTabsBefore = minimalBefore['recheck/no-hard-tabs'];
    const hardTabsBeforeStr = JSON.stringify(hardTabsBefore);

    // Validating must not change the shared preset, even though AJV's `useDefaults` would.
    await validate({ extends: ['recheck/minimal'] });

    const hardTabsAfterFirst = presets['recheck/minimal']['recheck/no-hard-tabs'];
    const hardTabsAfterFirstStr = JSON.stringify(hardTabsAfterFirst);

    await validate({ extends: ['recheck/minimal'], 'recheck/no-hard-tabs': { severity: 'warn' } });

    expect(hardTabsAfterFirstStr).toBe(hardTabsBeforeStr);
  });

  it('rejects extends with non-array value as validation error', async () => {
    const result = await validate({ extends: 'recheck/minimal' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('"extends" must be an array'))).toBe(true);
  });

  // An unresolvable `extends` entry must not stop validation of the rest of the config. Errors from
  // the other rules, such as an unknown assertion id, are reported together with it.
  it('reports an unknown assertion id alongside an unknown preset name in the same config (both errors, not just one)', async () => {
    const result = await validate({
      extends: ['recheck/no-such-preset'],
      'recheck/test-rule': {
        severity: 'error',
        message: 'Test message',
        assertions: { 'no-such-assertion': {} },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('Unknown preset "recheck/no-such-preset"'),
      })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('Unknown assertion type "no-such-assertion"'),
      })
    );
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

  // The prose rules use the `summary` scope (paragraphs, headings, list items, blockquotes, table
  // cells), so they never touch code blocks or frontmatter.
  it('repetition uses default options at severity warn, scoped to summary (all prose)', () => {
    const rule = presets['recheck/prose']['recheck/repetition'];
    expect(rule.severity).toBe('warn');
    expect(rule.assertions).toEqual({ repetition: {} });
    expect(rule.scope).toBe('summary');
    expect(rule.message?.length).toBeGreaterThan(0);
  });

  it('consistency declares the four US/UK variant pairs, case-insensitively, at severity warn, scoped to summary (all prose)', () => {
    const rule = presets['recheck/prose']['recheck/consistency'];
    expect(rule.severity).toBe('warn');
    expect(rule.scope).toBe('summary');
    expect(rule.assertions).toEqual({
      consistency: {
        either: {
          behavior: 'behaviour',
          color: 'colour',
          license: 'licence',
          organize: 'organise',
        },
        ignoreCase: true,
      },
    });
    expect(rule.message?.length).toBeGreaterThan(0);
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
    const { rules } = await validate({ extends: ['recheck/prose'] });
    const { fixedFiles } = await runRules([{ path: 'x.md', content }], rules, { fix: true });
    expect(fixedFiles.get('x.md')).toBe('The color palette is set.\n\nUse the same color again.\n');
  });

  // Without `ignoreCase: true`, a capitalized variant at the start of a sentence ("Colour") would
  // match neither the key nor the value, and the rule would miss it.
  it('consistency flags a capitalized, sentence-initial variant against a later lowercase one (ignoreCase)', async () => {
    const problems = await lintContent('Colour is used here.\n\nlater color appears.\n', {
      extends: ['recheck/prose'],
    });
    const consistencyProblems = problems.filter((p) => p.ruleName === 'recheck/consistency');
    expect(consistencyProblems.length).toBeGreaterThan(0);
  });

  // A fix must keep the casing of the text it replaces, so "Behavior" at the start of a sentence
  // becomes "Behaviour", not "behaviour". Run twice to check the result is stable.
  it('CLI --fix repro: a sentence-initial capitalized losing match is fixed to the capitalized winner, not lowercased (idempotent)', async () => {
    const content =
      'We spell it colour and behaviour throughout this document.\n\n' +
      'Behavior of the parser matters. Color is fine.\n';
    const { rules } = await validate({ extends: ['recheck/prose'] });

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

  // The default is sentence case, not AP title case, because Redocly's and the Google and Microsoft
  // style guides all use sentence case for headings. `style` is left out, because it only matters
  // for `$title`. The preset has no `exceptions` of its own: `capitalization` adds
  // `TECHNICAL_PROPER_NOUNS` by default, so `match` is the only option.
  it('capitalization enforces $sentence with no title-case style key, scoped to headings, at severity warn', () => {
    const rule = presets['recheck/prose']['recheck/capitalization'];
    expect(rule.severity).toBe('warn');
    expect(rule.scope).toBe('heading');
    expect(rule.message?.length).toBeGreaterThan(0);

    const options = rule.assertions.capitalization as {
      match: string;
      exceptions?: string[];
      style?: string;
    };
    expect(options.match).toBe('$sentence');
    expect(Object.keys(options).sort()).toEqual(['match']);
    expect(options.style).toBeUndefined();
    expect(options.exceptions).toBeUndefined();
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
      const problems = await lintContent(`# Deploy with ${entry} today\n`, {
        extends: ['recheck/prose'],
      });
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
      const problems = await lintContent(content, { extends: ['recheck/prose'] });
      expect(
        problems.filter((p) => p.ruleName === 'recheck/capitalization'),
        `"${entry}" in leading position should produce no capitalization finding`
      ).toEqual([]);
    }
  });

  // `fix: false` (the runner checks `rule.fix !== false`), even though `capitalization` is fixable for
  // the `$` styles: a sentence-case fix would lowercase any proper noun missing from the exceptions.
  it('capitalization opts out of auto-fix with fix: false', () => {
    const rule = presets['recheck/prose']['recheck/capitalization'];
    expect(rule.fix).toBe(false);
  });

  it('an exception-protected heading ("Use OpenAPI descriptions") produces no capitalization finding', async () => {
    const problems = await lintContent('## Use OpenAPI descriptions\n', {
      extends: ['recheck/prose'],
    });
    expect(problems.filter((p) => p.ruleName === 'recheck/capitalization')).toEqual([]);
  });

  it('a title-cased heading ("Use The API Now") IS flagged as a sentence-case violation', async () => {
    const problems = await lintContent('## Use The API Now\n', { extends: ['recheck/prose'] });
    const capitalizationProblems = problems.filter((p) => p.ruleName === 'recheck/capitalization');
    expect(capitalizationProblems).toHaveLength(1);
    expect(capitalizationProblems[0].message).toContain('$sentence');
    expect(capitalizationProblems[0].severity).toBe('warn');
  });

  // ALL-CAPS words (2+ letters) are kept by sentenceCase, so a heading of acronyms stays clean.
  it('an ALL-CAPS acronym heading is unaffected', async () => {
    const problems = await lintContent('## Configure CORS for the API and CDN\n', {
      extends: ['recheck/prose'],
    });
    expect(problems.filter((p) => p.ruleName === 'recheck/capitalization')).toEqual([]);
  });

  // A `--fix` run over a heading the rule flags must produce no fix and leave the file unchanged.
  it('emits no fix for a flagged heading under --fix, despite the rule being inherently fixable', async () => {
    const content = '## Use The API Now\n';
    const result = await validate({ extends: ['recheck/prose'] });
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

  it('every rule message satisfies the schema (non-empty, at most 2 %s placeholders)', () => {
    const prose = presets['recheck/prose'];
    for (const [name, rule] of Object.entries(prose)) {
      expect(rule.message, `${name} message`).toBeTruthy();
      const placeholderCount = (rule.message?.match(/%s/g) ?? []).length;
      expect(placeholderCount, `${name} placeholder count`).toBeLessThanOrEqual(2);
    }
  });

  it('expands via extends into normalized rules with the right severities', async () => {
    const result = await validate({ extends: ['recheck/prose'] });
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
    const problems = await lintContent(md, { extends: ['recheck/prose'] });

    const repetitionProblems = problems.filter((p) => p.ruleName === 'recheck/repetition');
    const consistencyProblems = problems.filter((p) => p.ruleName === 'recheck/consistency');

    // The code fence and frontmatter (lines 2, 8, 9) are not scanned...
    expect(repetitionProblems.every((p) => p.line === 12)).toBe(true);
    expect(consistencyProblems).toEqual([]);
    // ...but the repeated paragraph on line 12 is still reported.
    expect(repetitionProblems.length).toBeGreaterThan(0);
  });

  it('composes with recheck/markdown, the README-documented one-liner replacing markdownlint + Vale', async () => {
    const result = await validate({ extends: ['recheck/markdown', 'recheck/prose'] });
    expect(result.isValid).toBe(true);
    const shortNames = result.rules.map((r) => r.shortName);
    expect(shortNames).toContain('heading-increment');
    expect(shortNames).toContain('repetition');
    expect(shortNames).toContain('consistency');
    expect(shortNames).toContain('capitalization');
  });

  // AJV's `useDefaults` changes the object it validates (for example it adds `scope: 'all'`).
  // `resolveExtends` clones each preset rule first, so the shared registry stays clean. This checks
  // that for recheck/prose and for two separate configs that both extend it.
  it('never mutates the shared recheck/prose registry entry across validate() calls, and two configs extending it never share state', async () => {
    const repetitionBefore = presets['recheck/prose']['recheck/repetition'];
    const repetitionBeforeStr = JSON.stringify(repetitionBefore);
    const capitalizationBefore = presets['recheck/prose']['recheck/capitalization'];
    const capitalizationBeforeStr = JSON.stringify(capitalizationBefore);

    // First config: extends recheck/prose and overrides the severity of one rule.
    const first = await validate({
      extends: ['recheck/prose'],
      'recheck/capitalization': { severity: 'error' },
    });
    expect(first.isValid).toBe(true);

    // The registry entry must be unchanged by the first call.
    expect(JSON.stringify(presets['recheck/prose']['recheck/repetition'])).toBe(
      repetitionBeforeStr
    );
    expect(JSON.stringify(presets['recheck/prose']['recheck/capitalization'])).toBe(
      capitalizationBeforeStr
    );

    // Second config: same preset, no override. It must get the preset's own severity ('warn'), not 'error'.
    const second = await validate({ extends: ['recheck/prose'] });
    expect(second.isValid).toBe(true);
    const secondCapitalization = second.rules.find((r) => r.shortName === 'capitalization');
    expect(secondCapitalization?.severity).toBe('warn');

    // The first call's rule did get 'error', so the two results are separate objects.
    const firstCapitalization = first.rules.find((r) => r.shortName === 'capitalization');
    expect(firstCapitalization?.severity).toBe('error');
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

  // These four are general string and pattern utilities or single-purpose format checks, so the
  // preset-or-opt-in rule does not apply to them.
  function candidateAssertionIds(): string[] {
    return Object.keys(scopeRules).filter(
      (id) => !(PRE_EXISTING_GENERIC_ASSERTIONS as readonly string[]).includes(id)
    );
  }

  function assertionIdsShippedInAnyPreset(): Set<string> {
    const ids = new Set<string>();
    for (const preset of Object.values(presets)) {
      for (const rule of Object.values(preset)) {
        for (const assertionId of Object.keys(rule.assertions)) {
          ids.add(assertionId);
        }
      }
    }
    return ids;
  }

  // Shared with the mutation test below, so both run the same check.
  function assertCompleteness(ids: readonly string[]): void {
    const shippedIds = assertionIdsShippedInAnyPreset();
    const optInIds = new Set<string>(DOCUMENTED_OPT_IN_ASSERTIONS);
    for (const id of ids) {
      const isShipped = shippedIds.has(id);
      const isOptIn = optInIds.has(id);
      if (isShipped === isOptIn) {
        throw new Error(
          `"${id}" must be either shipped in a preset or a documented opt-in, not both/neither (shipped=${isShipped}, optIn=${isOptIn})`
        );
      }
    }
  }

  // An empty `scopeRules` (for example from a broken import) would make the check below pass with nothing checked.
  it('the live scopeRules registry has at least one non-generic candidate assertion to check completeness for', () => {
    expect(candidateAssertionIds().length).toBeGreaterThan(0);
  });

  it('every non-generic scope-rule assertion registered in scopeRules is either shipped in a preset or a documented opt-in — never neither, never both', () => {
    expect(() => assertCompleteness(candidateAssertionIds())).not.toThrow();
  });

  // The shipped side comes from all presets, because `recheck/google` ships scope-rule assertions too.
  it('assertions shipped in any preset, plus documented opt-ins, together account for exactly the live registry (minus pre-existing generic assertions), with no overlap', () => {
    const candidates = candidateAssertionIds();
    const shippedIds = assertionIdsShippedInAnyPreset();
    const shipped = candidates.filter((id) => shippedIds.has(id));

    const combined = [...new Set([...shipped, ...DOCUMENTED_OPT_IN_ASSERTIONS])].sort();
    expect(combined).toEqual(candidates.sort());

    const overlap = shipped.filter((id) =>
      (DOCUMENTED_OPT_IN_ASSERTIONS as readonly string[]).includes(id)
    );
    expect(overlap).toEqual([]);
  });

  it('buildProsePreset() only ever ships assertions from PROSE_PRESET_ASSERTIONS', () => {
    const prose = buildProsePreset();
    for (const rule of Object.values(prose)) {
      for (const assertionId of Object.keys(rule.assertions)) {
        expect(PROSE_PRESET_ASSERTIONS).toContain(assertionId);
      }
    }
  });

  // Adds an assertion with no preset or opt-in decision to the live `scopeRules`, like a new scope
  // rule would. This shows the check reads the real registry. It is removed in `finally`.
  it('a fake assertion registered in the live scopeRules registry with no preset/opt-in decision is caught, not silently passed', () => {
    const fakeId = '__mutation_proof_fake_assertion__';
    expect(scopeRules[fakeId]).toBeUndefined();
    const mutableScopeRules = scopeRules as Record<string, ScopeRule>;
    mutableScopeRules[fakeId] = {
      id: fakeId,
      fixable: false,
      execute: async () => [],
    };
    try {
      expect(candidateAssertionIds()).toContain(fakeId);
      expect(() => assertCompleteness(candidateAssertionIds())).toThrow(fakeId);
    } finally {
      delete mutableScopeRules[fakeId];
    }
    expect(scopeRules[fakeId]).toBeUndefined();
    expect(() => assertCompleteness(candidateAssertionIds())).not.toThrow();
  });
});

describe('preset data', () => {
  it('carries no derived message for a token rule', () => {
    expect(presets['recheck/markdown']['recheck/line-length']).not.toHaveProperty('message');
  });

  it('validates every preset alone, with a message on every rule', async () => {
    for (const id of Object.keys(presets)) {
      const result = await validate({ extends: [id] });
      expect(result.errors, id).toEqual([]);
      for (const rule of result.rules) {
        expect(rule.message, `${id} ${rule.name}`).toBeTruthy();
      }
    }
  });
});

describe('registerPresetRules', () => {
  it('adds a message only when the rule name has one', () => {
    expect(registerPresetRules(['a'], { a: 'A' })).toEqual({
      'recheck/a': { severity: 'error', message: 'A', assertions: { a: {} } },
    });
    // `toStrictEqual` fails on a `message` key, even when its value is undefined.
    expect(registerPresetRules(['b'])).toStrictEqual({
      'recheck/b': { severity: 'error', assertions: { b: {} } },
    });
  });
});
