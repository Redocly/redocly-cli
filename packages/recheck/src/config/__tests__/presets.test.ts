import { describe, expect, it } from 'vitest';

import { runRules } from '../../core/runner.js';
import { TECHNICAL_PROPER_NOUNS } from '../../data/proper-nouns.js';
import { lintContent } from '../../index.js';
import { scopeRules } from '../../rules/registry.js';
import { allTokenRules, RECHECK_ORIGINAL_TOKEN_RULE_NAMES } from '../../rules/token/index.js';
import type { ScopeRule } from '../../rules/types.js';
import { presets, DOCUMENTED_OPT_IN_ASSERTIONS } from '../presets/index.js';
import { PROSE_PRESET_ASSERTIONS, buildProsePreset } from '../presets/prose.js';
import { validate } from '../validate.js';

describe('extends presets', () => {
  // Binds the `recheck/markdown` preset to the token-rule registry so a new or
  // renamed token rule landing without a matching preset entry (or vice versa)
  // fails immediately. Both length and set equality are checked, so a
  // same-count-but-different-membership drift is caught too.
  //
  // Recheck-original token rules have no markdownlint counterpart and are
  // deliberately absent from `recheck/markdown`, which means the markdownlint
  // parity rules rather than every token rule we ship. Listing them here is the
  // explicit opt-in: the guard still fails on a token rule in NEITHER the parity
  // preset nor this list, so a rule cannot be forgotten silently.
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
    // Current validate() behavior: normalization does not drop severity:off
    // rules — that filtering (filterEnabledRules) happens later, at lint
    // time, for callers that want to skip disabled rules. validate()'s
    // normalized `rules` output always includes every configured rule,
    // carrying whatever severity it resolved to. So the merged rule is
    // still present here, just with severity overridden to "off".
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
    // A hand-built preset-shaped entry, not part of any shipped preset, so the
    // unresolvable-id error path can be exercised without planting a broken
    // name in real config. The id is deliberately fictitious rather than a
    // not-yet-implemented rule name, so it can never start resolving later.
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

  it('markdown preset includes the batch-1 heading rules, batch-2 whitespace/line rules, batch-3 list rules, batch-4 code/inline rules, batch-5 link/image/emphasis rules, and batch-6 blockquote/table rules, registered incrementally by each batch', () => {
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
    // Every entry's message is derived from the token rule's own
    // defaults.message — no hand-maintained message map for ported rules.
    expect(markdown['recheck/heading-increment'].message).toBe(
      'Heading levels should only increment by one level at a time.'
    );
    // single-trailing-newline has no legacy scope-id collision, so its
    // message is also derived from defaults.message with no override.
    expect(markdown['recheck/single-trailing-newline'].message).toBe(
      'Files should end with a single newline character.'
    );
    // These ids resolve straight to their token rules and derive their message
    // from `defaults.message`, so the preset needs no explicit override.
    expect(markdown['recheck/no-trailing-spaces'].message).toBe('Trailing spaces');
    expect(markdown['recheck/no-hard-tabs'].message).toBe('Hard tabs');
    // Batch-3 list rules have no legacy scope-id collision (the legacy
    // `bullet-style` id is distinct from `ul-style`), so all six derive
    // their message from defaults.message with no override needed either.
    expect(markdown['recheck/ul-style'].message).toBe('Unordered list style');
    expect(markdown['recheck/blanks-around-lists'].message).toBe(
      'Lists should be surrounded by blank lines'
    );
    // Batch-4 rules have no legacy scope-id collision, so all ten derive
    // their message from defaults.message with no override needed.
    expect(markdown['recheck/no-reversed-links'].message).toBe('Reversed link syntax');
    expect(markdown['recheck/no-space-in-emphasis'].message).toBe('Spaces inside emphasis markers');
    expect(markdown['recheck/no-empty-links'].message).toBe('No empty links');
    // Batch-5 rules have no legacy scope-id collision either (`link-fragments`
    // is a new id, distinct from the legacy `no-broken-fragment-links` scope
    // rule it replaces), so all eleven derive their message from
    // defaults.message with no override needed.
    expect(markdown['recheck/no-inline-html'].message).toBe('Inline HTML');
    expect(markdown['recheck/link-fragments'].message).toBe('Link fragments should be valid');
    expect(markdown['recheck/link-image-style'].message).toBe('Link and image style');
    // Batch-6 rules (the final batch) have no legacy scope-id collision
    // either, so all six derive their message from defaults.message with
    // no override needed.
    expect(markdown['recheck/no-multiple-space-blockquote'].message).toBe(
      'Multiple spaces after blockquote symbol'
    );
    expect(markdown['recheck/no-blanks-blockquote'].message).toBe('Blank line inside blockquote');
    expect(markdown['recheck/table-pipe-style'].message).toBe('Table pipe style');
    expect(markdown['recheck/table-column-count'].message).toBe('Table column count');
    expect(markdown['recheck/blanks-around-tables'].message).toBe(
      'Tables should be surrounded by blank lines'
    );
    expect(markdown['recheck/table-column-style'].message).toBe('Table column style');
  });

  it('markdown-relaxed preset turns off no-inline-html and no-bare-urls (upstream "no-inline-html"/"no-bare-urls": false) and leaves the other nine batch-5 rules untouched', () => {
    // relaxed.json disables exactly these two; none of the other nine batch-5
    // rules appear there, so they must come through at their base severity.
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
    // relaxed.json disables only fenced-code-language (MD040); none of the
    // other nine batch-4 rules appear there.
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

  it('minimal preset contains exactly the five planned rules, with no-reversed-links and no-empty-links now registered by batch 4', () => {
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
    expect(minimal['recheck/no-reversed-links'].message).toBe('Reversed link syntax');
    expect(minimal['recheck/no-empty-links'].message).toBe('No empty links');
  });

  it('markdown-relaxed preset computes overrides on top of markdown preset, activating the first-line-h1 override now that it is registered', () => {
    // markdown-relaxed is computed: the base markdown preset plus a static
    // override map derived from relaxed.json, which disables first-line-h1.
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/first-line-h1'].severity).toBe('off');
    // Every other batch-1 rule is carried over from the base preset
    // unchanged (relaxed.json does not otherwise touch heading rules).
    expect(relaxed['recheck/heading-increment']).toEqual(
      presets['recheck/markdown']['recheck/heading-increment']
    );
  });

  it('markdown-relaxed preset turns off the batch-2 whitespace rules (upstream "whitespace" tag) and line-length (upstream "line_length")', () => {
    // relaxed.json disables the "whitespace" tag (MD009/MD010/MD012 all
    // carry it upstream) and "line_length" (MD013, Recheck id
    // `line-length`).
    const relaxed = presets['recheck/markdown-relaxed'];
    expect(relaxed['recheck/no-trailing-spaces'].severity).toBe('off');
    expect(relaxed['recheck/no-hard-tabs'].severity).toBe('off');
    expect(relaxed['recheck/no-multiple-blanks'].severity).toBe('off');
    expect(relaxed['recheck/line-length'].severity).toBe('off');
    // hr-style and single-trailing-newline are untouched by relaxed.json.
    expect(relaxed['recheck/hr-style']).toEqual(presets['recheck/markdown']['recheck/hr-style']);
    expect(relaxed['recheck/single-trailing-newline']).toEqual(
      presets['recheck/markdown']['recheck/single-trailing-newline']
    );
  });

  it('markdown-relaxed preset turns off ul-indent (upstream "ul-indent": false) and leaves the other five batch-3 list rules untouched', () => {
    // relaxed.json disables only ul-indent (MD007); the other five batch-3 list
    // rules (ul-style, list-indent, ol-prefix, list-marker-space,
    // blanks-around-lists) do not appear there.
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
    // relaxed.json disables the "whitespace" tag. MD027
    // (no-multiple-space-blockquote) and MD028 (no-blanks-blockquote) both
    // carry it upstream (alongside blockquote/indentation), joining the
    // same tag-driven override group as the batch-2 whitespace rules. None
    // of the four table rules (table-pipe-style/table-column-count/
    // blanks-around-tables/table-column-style) carry the whitespace tag or
    // appear in relaxed.json at all, so they stay at the base preset's
    // error severity in markdown-relaxed too.
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
    // Capture the exact structure before any validation
    const minimalBefore = presets['recheck/minimal'];
    const hardTabsBefore = minimalBefore['recheck/no-hard-tabs'];
    const hardTabsBeforeStr = JSON.stringify(hardTabsBefore);

    // First validate call — this will trigger AJV's useDefaults, mutating the preset
    await validate({ extends: ['recheck/minimal'] });

    // At this point, if mutation happened, hardTabsBefore would have been mutated in place
    const hardTabsAfterFirst = presets['recheck/minimal']['recheck/no-hard-tabs'];
    const hardTabsAfterFirstStr = JSON.stringify(hardTabsAfterFirst);

    // Second validate call to prove registry is still dirty
    await validate({ extends: ['recheck/minimal'], 'recheck/no-hard-tabs': { severity: 'warn' } });

    // The strings should still match, proving no mutation happened
    expect(hardTabsAfterFirstStr).toBe(hardTabsBeforeStr);
  });

  it('rejects extends with non-array value as validation error', async () => {
    const result = await validate({ extends: 'recheck/minimal' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('"extends" must be an array'))).toBe(true);
  });

  // Bugbot #3639013360: an unresolvable `extends` entry used to short-
  // circuit validate() entirely, before semantic validation of the rest of
  // the config ever ran — so an unknown assertion id elsewhere in the same
  // config went unreported. `resolveExtends` only fails to merge the
  // unresolvable preset name itself; every other preset and all of the
  // user's own top-level rule keys still land in the merged config, so
  // semantic validation must still run against them and report both
  // problems together.
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
        message: expect.stringContaining('unknown assertion type "no-such-assertion"'),
      })
    );
  });
});

describe('recheck/prose preset', () => {
  // The preset contents are EXACT: `repetition`
  // (defaults), `consistency` (four US/UK variant pairs), `capitalization`
  // ($sentence, headings only — changed from $title/AP by product decision
  // 2026-07-29) — all at severity `warn` (a lighter touch
  // than `recheck/markdown`'s `error`, since these are style suggestions,
  // not structural violations). `occurrence`/`conditional`/`metric`/
  // `spelling` are deliberately NOT included — see the
  // "registry <-> preset completeness" describe block below, which pins
  // that omission as a documented opt-in rather than an oversight.
  it('contains exactly repetition, consistency, and capitalization — nothing else', () => {
    const prose = presets['recheck/prose'];
    expect(Object.keys(prose).sort()).toEqual(
      ['repetition', 'consistency', 'capitalization'].map((name) => `recheck/${name}`).sort()
    );
  });

  // The preset's prose rules are scoped to `summary` — the canonical
  // all-prose scope (paragraph, heading, list-item, blockquote, and table
  // cells) — so they can never touch code blocks or frontmatter
  // (capitalization is heading-only already); 'never rewrites code
  // samples' is part of the preset's README contract.
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

  // Consistency engine guard (fix-posture task, Step 2): `consistency.ts`
  // only auto-fixes a pair when its two variants have the same word count
  // (see rules/scope/consistency.ts's wordCount() doc comment -- the same
  // shape as applyMatchCase's multi-word guard in case-preserve.ts). All
  // four of this preset's pairs are British/American SPELLING variants,
  // never a word-count-crossing substitution like `it's`/`it is`, so the
  // guard must be a complete no-op here: proven two ways below -- first
  // structurally (every pair really is one word on both sides), then
  // behaviorally (an actual --fix run still rewrites a real conflict).
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

  // Without `ignoreCase: true`, a capitalized variant opening a sentence
  // ("Colour") matches neither the lowercase key nor the value, so it is never
  // counted as first-seen and never flagged later -- defeating the rule for any
  // document whose first mention happens to be capitalized.
  it('consistency flags a capitalized, sentence-initial variant against a later lowercase one (ignoreCase)', async () => {
    const problems = await lintContent('Colour is used here.\n\nlater color appears.\n', {
      extends: ['recheck/prose'],
    });
    const consistencyProblems = problems.filter((p) => p.ruleName === 'recheck/consistency');
    expect(consistencyProblems.length).toBeGreaterThan(0);
  });

  // A fix must carry over the losing match's own casing rather than inserting
  // the authored winner literally, or a capitalized match opening a sentence
  // ("Behavior") gets rewritten to a lowercase winner ("behaviour") and
  // silently lowercases the sentence start. Run twice to confirm idempotence.
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

  // Product decision 2026-07-29: the preset default is SENTENCE case, not
  // AP title case — Redocly's own documentation style guide, this repo's
  // CLAUDE.md ('Headings use sentence case without ending punctuation'),
  // Google's developer documentation style guide, and Microsoft's writing
  // style guide all mandate sentence case for headings. `style` is dropped
  // entirely rather than left at 'ap': applyDollarStyle only consults it in
  // the `$title` branch (rules/scope/capitalization.ts), so carrying it
  // alongside `$sentence` would be dead config the README already
  // documents as a no-op.
  // The preset ships no `exceptions` key of its own: `capitalization` unions
  // `TECHNICAL_PROPER_NOUNS` into `exceptions` by default, leaving `match` as
  // this rule's only option here.
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

  // Since the preset carries no `exceptions` of its own, this pins the
  // vocabulary `capitalization` falls back on: a future edit must not quietly
  // empty or de-alphabetize the list that keeps '$sentence' headings from
  // flagging every mixed-case proper noun. `proper-nouns.test.ts` covers the
  // list's general shape; what matters here is that these specific words stay
  // protected. The length floor is a floor, not a target.
  it('the built-in technical proper-noun vocabulary is non-empty and protects the carried-over required words', () => {
    expect(Array.isArray(TECHNICAL_PROPER_NOUNS)).toBe(true);
    expect(TECHNICAL_PROPER_NOUNS.length).toBeGreaterThanOrEqual(15);
    for (const word of ['OpenAPI', 'AsyncAPI', 'GraphQL', 'macOS', 'iOS', 'npm', 'Redocly']) {
      expect(TECHNICAL_PROPER_NOUNS, `vocabulary should protect "${word}"`).toContain(word);
    }
    // Sorted case-insensitively, matching how every other fixed word list
    // in this package is written (title-case.ts's stopword lists,
    // prose.ts's `consistency.either` pairs).
    const sorted = [...TECHNICAL_PROPER_NOUNS].sort((a, b) =>
      a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
    );
    expect(TECHNICAL_PROPER_NOUNS).toEqual(sorted);
    expect(new Set(TECHNICAL_PROPER_NOUNS.map((w) => w.toLowerCase())).size).toBe(
      TECHNICAL_PROPER_NOUNS.length
    );
  });

  // Matching is phrase-aware, so multi-token vocabulary entries are live rather
  // than dead config. Asserted end to end through the real preset rather than by
  // presence in the list alone, since only the round trip proves they work.
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

  // #25610: the test above only covers a phrase entry in the MIDDLE of a
  // heading. A LEADING one used to be a guaranteed false positive under every
  // preset that ships `capitalization: $sentence` with the built-in vocabulary
  // unioned in (recheck/prose, and recheck/google + recheck/microsoft through
  // it), because phrase masking removed the entry before "first word" was
  // computed, promoting the next real word to sentence-initial. Every
  // multi-token entry the vocabulary ships is driven through the real preset
  // pipeline in first position -- derived from TECHNICAL_PROPER_NOUNS rather
  // than hardcoded, so a seventh phrase entry is covered the day it lands.
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

  // `fix: false` (honored by the runner as `rule.fix !== false`, see
  // core/runner.ts) even though `capitalization` is registered `fixable`
  // for the four `$`-styles: a sentence-case auto-fix would lowercase any
  // proper noun not yet in the exceptions list, silently damaging content.
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

  // ALL-CAPS words (2+ letters) are preserved by sentenceCase itself, with
  // no exceptions entry needed — an acronym-only heading must stay clean.
  it('an ALL-CAPS acronym heading is unaffected', async () => {
    const problems = await lintContent('## Configure CORS for the API and CDN\n', {
      extends: ['recheck/prose'],
    });
    expect(problems.filter((p) => p.ruleName === 'recheck/capitalization')).toEqual([]);
  });

  // The behavioral half of `fix: false`: a --fix run over a heading the
  // rule genuinely flags must emit NO fix and leave the file byte-identical,
  // even though the same rule/style pair is fixable outside the preset.
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

    // Sanity: the SAME rule without `fix: false` does emit a fix, proving
    // the empty result above comes from the opt-out and not from the rule
    // being unfixable for `$sentence`.
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

    // Code fence + frontmatter contribute NOTHING (lines 2, 8, 9)...
    expect(repetitionProblems.every((p) => p.line === 12)).toBe(true);
    expect(consistencyProblems).toEqual([]);
    // ...while the genuine paragraph repeat on line 12 is still flagged.
    expect(repetitionProblems.length).toBeGreaterThan(0);
  });

  it('composes with recheck/markdown, the README-documented one-liner replacing markdownlint + Vale', async () => {
    const result = await validate({ extends: ['recheck/markdown', 'recheck/prose'] });
    expect(result.isValid).toBe(true);
    const shortNames = result.rules.map((r) => r.shortName);
    expect(shortNames).toContain('heading-increment'); // from recheck/markdown
    expect(shortNames).toContain('repetition'); // from recheck/prose
    expect(shortNames).toContain('consistency');
    expect(shortNames).toContain('capitalization');
  });

  // AJV's useDefaults mutates the object it validates in place (e.g.
  // injecting `scope: 'all'` onto a rule that omitted it) — resolveExtends
  // guards against this polluting the shared preset registry by
  // structuredClone-ing each preset rule before merging (see
  // config/presets/index.ts). The equivalent recheck/minimal case (above)
  // pins the same precedent; here it's proven specifically for
  // recheck/prose, AND for two INDEPENDENT configs that both extend it —
  // neither call may leak mutated state into the other via the shared
  // registry object.
  it('never mutates the shared recheck/prose registry entry across validate() calls, and two configs extending it never share state', async () => {
    const repetitionBefore = presets['recheck/prose']['recheck/repetition'];
    const repetitionBeforeStr = JSON.stringify(repetitionBefore);
    const capitalizationBefore = presets['recheck/prose']['recheck/capitalization'];
    const capitalizationBeforeStr = JSON.stringify(capitalizationBefore);

    // First config: extends recheck/prose plus a severity override on one rule.
    const first = await validate({
      extends: ['recheck/prose'],
      'recheck/capitalization': { severity: 'error' },
    });
    expect(first.isValid).toBe(true);

    // The shared registry entry must be untouched by the first call's
    // AJV useDefaults pass (it operates on resolveExtends's clone, not
    // the original).
    expect(JSON.stringify(presets['recheck/prose']['recheck/repetition'])).toBe(
      repetitionBeforeStr
    );
    expect(JSON.stringify(presets['recheck/prose']['recheck/capitalization'])).toBe(
      capitalizationBeforeStr
    );

    // Second, independent config extending the same preset with no
    // override — must resolve the preset's OWN default severity ('warn'),
    // not 'error' leaked from the first call's override.
    const second = await validate({ extends: ['recheck/prose'] });
    expect(second.isValid).toBe(true);
    const secondCapitalization = second.rules.find((r) => r.shortName === 'capitalization');
    expect(secondCapitalization?.severity).toBe('warn');

    // And the first call's own resolved rule really did get 'error' — proving
    // the two calls' results are independent objects, not aliases of the
    // same mutated preset entry.
    const firstCapitalization = first.rules.find((r) => r.shortName === 'capitalization');
    expect(firstCapitalization?.severity).toBe('error');
  });
});

describe('registry <-> preset completeness (native scope-rule assertions)', () => {
  // Every assertion in the live `scopeRules` registry must be accounted for
  // exactly one way: shipped inside some preset, or deliberately left out and
  // exported as a documented opt-in (`DOCUMENTED_OPT_IN_ASSERTIONS`), in which
  // case the README must carry a copy-paste snippet for it. The candidate set
  // is derived from the live registry rather than a hardcoded list, so a new
  // assertion landing with no preset/opt-in decision fails here instead of
  // passing silently.
  //
  // This guard covers scope rules only. Token rules live in a separate
  // registry (`allTokenRules`) and are out of its candidate set by design, so
  // it says nothing about whether the markdoc rules or
  // `no-duplicate-link-destinations` are accounted for anywhere.
  const PRE_EXISTING_GENERIC_ASSERTIONS = [
    'swap',
    'pattern',
    'semantic-line-breaks',
    'max-image-size',
  ] as const;

  // These four are general-purpose string/pattern utilities or single-purpose
  // format checks rather than prose-style assertions, so the preset-or-opt-in
  // policy does not apply to them.
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

  // Shared with the mutation test below so both exercise the identical check; a
  // hand-duplicated copy could pass while the real guard was broken.
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

  // Without this, an empty `scopeRules` (a broken import, say) would make the
  // completeness check below pass vacuously.
  it('the live scopeRules registry has at least one non-generic candidate assertion to check completeness for', () => {
    expect(candidateAssertionIds().length).toBeGreaterThan(0);
  });

  it('every non-generic scope-rule assertion registered in scopeRules is either shipped in a preset or a documented opt-in — never neither, never both', () => {
    expect(() => assertCompleteness(candidateAssertionIds())).not.toThrow();
  });

  // The shipped side is derived from ALL presets, not just `recheck/prose`:
  // `recheck/google` ships scope-rule assertions too.
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

  // Patches the live `scopeRules` record with an assertion that has no
  // preset/opt-in decision, standing in for a future scope rule landing without
  // one. This is what proves the completeness check reads the real registry
  // rather than a hardcoded snapshot of it. Restored in `finally` so the fake id
  // cannot leak into another test.
  it('a fake assertion registered in the live scopeRules registry with no preset/opt-in decision is caught, not silently passed', () => {
    const fakeId = '__mutation_proof_fake_assertion__';
    expect(scopeRules[fakeId]).toBeUndefined(); // not already present, or this proves nothing
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
