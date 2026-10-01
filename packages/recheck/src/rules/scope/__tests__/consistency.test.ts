import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules, runRulesUntilStable } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { consistency } from '../consistency.js';
import { buildWholeFileContext } from './helpers.js';

function consistencyRule(
  message: string,
  options: { either: Record<string, string>; ignoreCase?: boolean },
  scope: string | string[] = 'all'
): NormalizedRule {
  return {
    name: 'test-consistency',
    shortName: 'consistency',
    severity: 'error',
    message,
    scope,
    assertions: { consistency: options },
  };
}

// Builds a rule context with only the segments whose scope matches the filter.
function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

const MESSAGE = 'Inconsistent spelling: "%s" conflicts with first-seen "%s".';

describe('consistency assertion', () => {
  it('flags the LATER variant: "behavior" first means every later "behaviour" is the problem', async () => {
    const content = 'behavior first.\n\nlater behaviour.\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });
    const ctx = buildWholeFileContext(content);

    const problems = await consistency.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe(
      'Inconsistent spelling: "behaviour" conflicts with first-seen "behavior".'
    );
    expect(problems[0].line).toBe(3);
    // 'later behaviour.': 'behaviour' starts at source column 7.
    expect(problems[0].column).toBe(7);
    // `text` is the whole line containing the match; `match` is just the matched text.
    expect(problems[0].text).toBe('later behaviour.');
    expect(problems[0].match).toBe('behaviour');
  });

  it('fix replaces the later variant with the first-seen one', async () => {
    const content = 'behavior first.\n\nlater behaviour.\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

    expect(fixedFiles.get('t.md')).toBe('behavior first.\n\nlater behavior.\n');
  });

  it('the reversed document flags "behavior" instead -- first-seen is by SOURCE ORDER, not by which `either` entry (key vs value) a variant sits in', async () => {
    // The key is scanned before the value, so only sorting by position makes 'behaviour' win.
    const content = 'behaviour first.\n\nlater behavior.\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });
    const ctx = buildWholeFileContext(content);

    const problems = await consistency.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe(
      'Inconsistent spelling: "behavior" conflicts with first-seen "behaviour".'
    );

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
    expect(fixedFiles.get('t.md')).toBe('behaviour first.\n\nlater behaviour.\n');
  });

  it('does not flag a document that only ever uses one variant', async () => {
    const content = 'behavior here, behavior there, behavior everywhere.\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });
    const ctx = buildWholeFileContext(content);

    const problems = await consistency.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('the winner is decided FILE-WIDE across segments: scope paragraph, one variant per paragraph', async () => {
    const content = 'behaviour paragraph one.\n\nbehavior paragraph two.\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } }, 'paragraph');
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

    const problems = await consistency.execute(rule, 'test.md', ctx);

    // Each paragraph is consistent alone; only the file-wide winner makes the second one a problem.
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toBe(
      'Inconsistent spelling: "behavior" conflicts with first-seen "behaviour".'
    );
  });

  describe('overlapping scopes dedup by source position (regression guard)', () => {
    // Each sentence overlaps its paragraph, so every match is found twice. Each must be counted once.
    const content = 'Prefer behaviour here. Also behavior there. More behavior again.\n';

    it('produces exactly ONE problem per later-variant occurrence, winner by source order', async () => {
      const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } }, [
        'paragraph',
        'sentence',
      ]);
      const ctx = buildScopedContext(
        content,
        (scope) => scope === 'paragraph' || scope === 'sentence'
      );
      expect(ctx.segments.some((segment) => segment.scope === 'paragraph')).toBe(true);
      expect(ctx.segments.some((segment) => segment.scope === 'sentence')).toBe(true);

      const problems = await consistency.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(2);
      expect(problems.map((p) => [p.line, p.column])).toEqual([
        [1, 29],
        [1, 50],
      ]);
      for (const problem of problems) {
        expect(problem.message).toBe(
          'Inconsistent spelling: "behavior" conflicts with first-seen "behaviour".'
        );
      }
    });

    it('end-to-end through runRules with scope [paragraph, sentence]: one fix per occurrence, clean output', async () => {
      const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } }, [
        'paragraph',
        'sentence',
      ]);

      const { problems } = await runRules([{ path: 't.md', content }], [rule]);
      expect(problems).toHaveLength(2);

      const { fixedFiles, fixes } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      expect(fixes).toHaveLength(2);
      expect(fixedFiles.get('t.md')).toBe(
        'Prefer behaviour here. Also behaviour there. More behaviour again.\n'
      );
    });
  });

  describe('ignoreCase', () => {
    it('matches case-insensitively when true; replacement is the winning variant AS WRITTEN in `either`', async () => {
      // The capitalized 'Behaviour' is the first one seen, so the later 'behavior' is the problem.
      const content = 'Behaviour first. behavior later.\n';
      const rule = consistencyRule(MESSAGE, {
        either: { behavior: 'behaviour' },
        ignoreCase: true,
      });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe(
        'Inconsistent spelling: "behavior" conflicts with first-seen "behaviour".'
      );

      // The fix inserts the winner as written in the config.
      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('Behaviour first. behaviour later.\n');
    });

    it('a differently-cased later occurrence of the WINNING variant is not flagged', async () => {
      // With ignoreCase, 'Behaviour' counts as the winning variant, so it is not a problem.
      const content = 'behaviour first. Behaviour again.\n';
      const rule = consistencyRule(MESSAGE, {
        either: { behavior: 'behaviour' },
        ignoreCase: true,
      });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('is case-sensitive by default: "Behaviour" (capitalized) is not a match, so no conflict exists', async () => {
      const content = 'Behaviour first. behavior later.\n';
      const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    // The fix keeps the capitalization of the matched text.
    it("with ignoreCase, the fix preserves the losing match's OBSERVED casing (applyMatchCase), not the winner literally as authored", async () => {
      const content = 'behavior first, then Behaviour.\n';
      const rule = consistencyRule(MESSAGE, {
        either: { behavior: 'behaviour' },
        ignoreCase: true,
      });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

      expect(fixedFiles.get('t.md')).toBe('behavior first, then Behavior.\n');
    });

    // A capitalized match at the start of a sentence must stay capitalized.
    it('CRITICAL: a sentence-initial capitalized losing match keeps its capital letter after --fix, instead of being lowercased', async () => {
      const content =
        'We spell it colour and behaviour throughout.\n\nBehavior of the parser matters. Color is fine.\n';
      const rule = consistencyRule(MESSAGE, {
        either: { behavior: 'behaviour', color: 'colour' },
        ignoreCase: true,
      });

      const { fixedFiles: firstPass } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      const fixedOnce = firstPass.get('t.md') ?? content;
      expect(fixedOnce).toBe(
        'We spell it colour and behaviour throughout.\n\nBehaviour of the parser matters. Colour is fine.\n'
      );

      const { fixedFiles: secondPass } = await runRules(
        [{ path: 't.md', content: fixedOnce }],
        [rule],
        {
          fix: true,
        }
      );
      expect(secondPass.get('t.md') ?? fixedOnce).toBe(fixedOnce);
    });
  });

  it('is idempotent under runRulesUntilStable', async () => {
    const content = 'behavior first.\n\nlater behaviour and more behaviour.\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });

    const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);

    expect(fixedFiles.get('t.md')).toBe('behavior first.\n\nlater behavior and more behavior.\n');
  });

  describe('word boundaries', () => {
    it('does not match a variant inside a longer word', async () => {
      // Neither word counts as an occurrence of the other, because of the word boundaries.
      const content = 'misbehavior everywhere.\n\nbehaviours abound.\n';
      const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('regex metacharacters in variants are matched literally (escaped like swap keys)', async () => {
      // 'a.b' must not match 'axb'.
      const content = 'axb first. a.b later.\n';
      const rule = consistencyRule(MESSAGE, { either: { 'a.b': 'a-b' } });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });

  it('handles multiple pairs independently -- each pair gets its own first-seen winner', async () => {
    const content = 'behavior and colour.\n\nbehaviour and color.\n';
    const rule = consistencyRule(MESSAGE, {
      either: { behavior: 'behaviour', color: 'colour' },
    });
    const ctx = buildWholeFileContext(content);

    const problems = await consistency.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.message).sort()).toEqual([
      'Inconsistent spelling: "behaviour" conflicts with first-seen "behavior".',
      'Inconsistent spelling: "color" conflicts with first-seen "colour".',
    ]);

    const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
    expect(fixedFiles.get('t.md')).toBe('behavior and colour.\n\nbehavior and colour.\n');
  });

  // A pair is only fixed when both variants have the same number of words. `it's` can mean "it is" or "it has", so rewriting it blindly can be wrong.
  describe('same-word-count guard (fix-safety for ambiguous contractions)', () => {
    it('same-word-count pair (colour/color, 1 word each) still detects AND fixes', async () => {
      const content = 'color first.\n\nlater colour.\n';
      const rule = consistencyRule(MESSAGE, { either: { color: 'colour' } });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);

      const { fixes, fixedFiles } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      expect(fixes).toHaveLength(1);
      expect(fixedFiles.get('t.md')).toBe('color first.\n\nlater color.\n');
    });

    it('different-word-count pair ("it\'s" vs. "it is", 1 word vs. 2) still detects but NEVER fixes -- the brief\'s corruption case', async () => {
      // 'it is' is seen first, so 'it's' is the losing variant. Here it means "it has", so it must not become "it is been".
      const content = "It is fine. Traffic has been steady, but it's been growing for hours.\n";
      const rule = consistencyRule(MESSAGE, { either: { "it's": 'it is' }, ignoreCase: true });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].match.toLowerCase()).toBe("it's");
      expect(problems[0].message).toContain('"it is"');

      const { fixes, fixedFiles } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      expect(fixes).toEqual([]);
      expect(fixedFiles.get('t.md') ?? content).toBe(content);
    });

    it('a rule mixing a same-word-count pair and a different-word-count pair fixes only the safe one', async () => {
      const content =
        'color first. It is fine.\n\n' + "later colour, but it's been growing for hours.\n";
      const rule = consistencyRule(MESSAGE, {
        either: { color: 'colour', "it's": 'it is' },
        ignoreCase: true,
      });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(2);

      // Only the same-word-count pair (color/colour) is fixed.
      const { fixes, fixedFiles } = await runRules([{ path: 't.md', content }], [rule], {
        fix: true,
      });
      expect(fixes).toHaveLength(1);
      expect(fixes[0].insertText).toBe('color');
      expect(fixedFiles.get('t.md')).toBe(
        'color first. It is fine.\n\n' + "later color, but it's been growing for hours.\n"
      );
    });

    it('is idempotent: a second --fix pass over the unfixed different-word-count conflict changes nothing further', async () => {
      const content = "It is fine. Traffic has been steady, but it's been growing for hours.\n";
      const rule = consistencyRule(MESSAGE, { either: { "it's": 'it is' }, ignoreCase: true });

      const { fixedFiles } = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      expect(fixedFiles.get('t.md') ?? content).toBe(content);
    });

    // Known limitation: pairs like `don't` / `do not` are also not fixed, even though they are safe. The check only counts words.
    it.each([
      ["don't", 'do not'],
      ["won't", 'will not'],
      ["isn't", 'is not'],
    ])(
      'false positive: the UNAMBIGUOUS pair %j/%j is also blocked by the guard, purely for crossing a word-count boundary',
      async (contraction, expansion) => {
        const content = `${expansion[0].toUpperCase()}${expansion.slice(1)} fine, but later ${contraction} still true.\n`;
        const rule = consistencyRule(MESSAGE, {
          either: { [contraction]: expansion },
          ignoreCase: true,
        });
        const ctx = buildWholeFileContext(content);

        const problems = await consistency.execute(rule, 'test.md', ctx);
        expect(problems).toHaveLength(1);

        // Reported but not fixed.
        const { fixes } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
        expect(fixes).toEqual([]);
      }
    );

    // `can't` / `cannot` is still fixed because both sides are one word.
    it("can't/cannot (equally unambiguous, but same word count) is NOT blocked -- the guard is inconsistent by design, not by bug", async () => {
      const content = "Cannot proceed without approval. It can't proceed either.\n";
      const rule = consistencyRule(MESSAGE, { either: { "can't": 'cannot' }, ignoreCase: true });

      const { fixes } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixes).toHaveLength(1);
    });
  });

  it("reports the true column for a conflict on a heading segment's first line", async () => {
    // A heading's content starts after the '## ', so the column needs the segment's start column.
    const content = '## behavior and behaviour\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } }, 'heading');
    const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

    const problems = await consistency.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // '## behavior and behaviour': 'behaviour' starts at source column 17.
    expect(problems[0].column).toBe(17);
    expect(problems[0].text).toBe('behavior and behaviour');
    expect(problems[0].match).toBe('behaviour');
  });

  // The fallback message must have one `%s` for each value, and the rule has no `message`.
  describe('no-message fallback (programmatic NormalizedRule, bypassing validate())', () => {
    it('falls back to the two-placeholder template with matched text then winner', async () => {
      const content = 'behavior first.\n\nlater behaviour.\n';
      const rule: NormalizedRule = {
        name: 'test-consistency-fallback',
        shortName: 'consistency',
        severity: 'error',
        scope: 'all',
        assertions: { consistency: { either: { behavior: 'behaviour' } } },
      };

      const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe(
        'Inconsistent spelling: "behaviour" conflicts with first-seen "behavior".'
      );
    });
  });

  // An empty `either` key must not hang the scan. The timeout makes a hang fail the test.
  describe('zero-width match guard (defense in depth against an empty either key)', () => {
    it(
      'completes without hanging and reports no problems for an empty key, even bypassing validate()',
      { timeout: 2000 },
      async () => {
        const content = 'behavior first.\n\nlater behaviour.\n';
        const rule: NormalizedRule = {
          name: 'test-consistency-empty-key',
          shortName: 'consistency',
          severity: 'error',
          scope: 'all',
          message: MESSAGE,
          assertions: { consistency: { either: { '': 'behaviour' } } },
        };

        const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

        expect(problems).toEqual([]);
      }
    );
  });

  describe('validation', () => {
    function consistencyConfig(options: unknown) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { consistency: options },
        },
      };
    }

    it('accepts a well-formed config', async () => {
      const result = await validate(
        consistencyConfig({ either: { behavior: 'behaviour' }, ignoreCase: true })
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects a config missing "either"', async () => {
      const result = await validate(consistencyConfig({}));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('either'))).toBe(true);
    });

    it('rejects an empty "either" object', async () => {
      const result = await validate(consistencyConfig({ either: {} }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('either'))).toBe(true);
    });

    it('rejects a wrong-typed "either" (not an object)', async () => {
      const result = await validate(consistencyConfig({ either: 'behavior' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('either'))).toBe(true);
    });

    it('rejects an "either" entry whose value is not a string', async () => {
      const result = await validate(consistencyConfig({ either: { behavior: 42 } }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('behavior'))).toBe(true);
    });

    // An empty key must be rejected when the config loads, like an empty value.
    it('rejects an "either" entry whose key is an empty string', async () => {
      const result = await validate(consistencyConfig({ either: { '': 'behaviour' } }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('either'))).toBe(true);
    });

    it('rejects an unknown consistency option', async () => {
      const result = await validate(
        consistencyConfig({ either: { behavior: 'behaviour' }, unknownOption: true })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('rejects a non-boolean ignoreCase', async () => {
      const result = await validate(
        consistencyConfig({ either: { behavior: 'behaviour' }, ignoreCase: 'yes' })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignoreCase'))).toBe(true);
    });
  });
});
