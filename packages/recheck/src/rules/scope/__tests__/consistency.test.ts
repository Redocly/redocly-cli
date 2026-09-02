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

// Builds a ScopeRuleContext filtered to the given scope predicate, matching
// the recipe in src/rules/CONTRIBUTING.md's "Testing" section for scoped
// rules (parseMarkdown + extractScopes, filtered by scope name) -- same
// helper as occurrence.test.ts's/repetition.test.ts's buildScopedContext.
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
    // Problem.text is the FULL source line containing the match
    // (pattern.ts's convention); Problem.match keeps the matched substring.
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
    // The key ('behavior') is scanned before the value ('behaviour') when
    // collecting matches, so ONLY a source-order sort makes 'behaviour' win
    // here -- collection order alone would crown 'behavior' again.
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

    // Each paragraph on its own is internally consistent -- only a
    // file-wide winner makes paragraph two's 'behavior' a problem.
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toBe(
      'Inconsistent spelling: "behavior" conflicts with first-seen "behaviour".'
    );
  });

  describe('overlapping scopes dedup by source position (regression guard)', () => {
    // scope [paragraph, sentence]: every sentence segment overlaps its own
    // paragraph segment, so each variant occurrence is matched TWICE at the
    // exact same absolute source position. Without position dedup that (a)
    // double-counts -- two problems per later-variant occurrence -- and (b)
    // can scramble which variant is 'first' when duplicates interleave in
    // collection order.
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
      // Sanity: the overlap this test exists for is really present -- the
      // same source text sits in a paragraph segment AND sentence segments.
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
      // 'Behaviour' (capitalized) is still the first-seen occurrence of the
      // 'behaviour' variant; the later 'behavior' is the problem.
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

      // The fix inserts the winning variant literally as written in the
      // config ('behaviour', lowercase), matching swap's replacement
      // semantics -- it does NOT preserve the matched text's casing.
      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe('Behaviour first. behaviour later.\n');
    });

    it('a differently-cased later occurrence of the WINNING variant is not flagged', async () => {
      // With ignoreCase, 'Behaviour' is an occurrence of the winning
      // 'behaviour' variant, so it is NOT a problem; only true
      // cross-variant conflicts are flagged (casing drift within one
      // variant is out of scope for this assertion).
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

    // Critical fix (final-review Item 1): this test used to pin the BUGGY
    // behavior -- `insertText: site.winner` inserted the config's authored
    // variant literally, so a capitalized losing match ("Behaviour") got
    // rewritten to the lowercase-as-authored winner ("behavior"),
    // corrupting the capital letter. Fixed by routing the replacement
    // through `applyMatchCase` (see consistency.ts's fix()), the same guard
    // swap.ts:177 already applies -- so the losing match's OWN observed
    // casing is now preserved, exactly like swap's fix does.
    it("with ignoreCase, the fix preserves the losing match's OBSERVED casing (applyMatchCase), not the winner literally as authored", async () => {
      const content = 'behavior first, then Behaviour.\n';
      const rule = consistencyRule(MESSAGE, {
        either: { behavior: 'behaviour' },
        ignoreCase: true,
      });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });

      expect(fixedFiles.get('t.md')).toBe('behavior first, then Behavior.\n');
    });

    // The exact shape from the brief's CLI repro: a SENTENCE-INITIAL
    // capitalized losing match must keep its capital letter, not be
    // silently lowercased to the authored winner. Idempotent under a
    // second --fix pass (gate: "run twice for idempotency").
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

      // Idempotency: fixing the already-fixed content changes nothing further.
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
      // 'behaviours' contains 'behaviour' and 'misbehavior' contains
      // 'behavior', but \b-wrapping means neither counts as an occurrence
      // -- so this document has NO conflict at all.
      const content = 'misbehavior everywhere.\n\nbehaviours abound.\n';
      const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } });
      const ctx = buildWholeFileContext(content);

      const problems = await consistency.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('regex metacharacters in variants are matched literally (escaped like swap keys)', async () => {
      // 'a.b' must match only the literal 'a.b', not 'axb' -- an unescaped
      // '.' would make 'axb' a phantom occurrence of the 'a.b' variant.
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

  // Engine guard (fix-posture task, Step 2): a pair is only auto-fixed when
  // its two variants have the SAME WORD COUNT -- the same shape as
  // applyMatchCase's multi-word guard in case-preserve.ts, a mechanical,
  // checkable property that correlates with a real semantic hazard rather
  // than an attempt to understand the words. `colour`/`color` is one word
  // either way (safe). `it's`/`it is` is one word vs. two: `it's` expands to
  // EITHER "it is" OR "it has", so picking one as the first-seen winner and
  // blindly rewriting the other collapses a real distinction -- this is the
  // bug that shipped, live since Phase 1, masked in `recheck/microsoft` only
  // by an unrelated rule (`use-contractions`) rewriting the damage back in
  // a later fix pass (see preset-microsoft.test.ts's reproduction of that
  // exact masking).
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
      // "It is fine." makes "it is" the first-seen winner; the later "it's"
      // -- which here means "it HAS been growing", not "it IS been
      // growing" -- is the losing variant. The old behavior blindly
      // rewrote every losing occurrence to the winner, producing "it is
      // been growing for hours": grammatically broken, and wrong regardless
      // of which sense the original "it's" meant.
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
      // No rewrite at all: the file is either absent from fixedFiles (no
      // fix landed) or, if present, byte-identical to the input.
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

      // Both pairs are still detected...
      const problems = await consistency.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(2);

      // ...but only the same-word-count pair (color/colour) produces a fix.
      // ("color" appears first in the document, so it's the first-seen
      // winner; the later "colour" is the one that gets rewritten.)
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

    // KNOWN EDGE, accepted, not fixed (see wordCount()'s doc comment in
    // consistency.ts): the guard is a word-count PROXY for ambiguity, not a
    // test of ambiguity itself, so it also blocks pairs that cross a word
    // boundary WITHOUT being ambiguous. `don't`/`do not`, `won't`/`will not`,
    // and `isn't`/`is not` each have exactly one possible expansion (unlike
    // `it's`, which has two) -- genuinely safe to auto-fix in either
    // direction -- but all three are 1-word-vs-2-word pairs, so the guard
    // blocks them anyway, same as it blocks the pair it exists for. Pinned
    // here as a known cost of the heuristic, not a regression: narrowing the
    // guard with a hand-picked "these contractions are actually safe"
    // exception list would repeat the exact per-pair-criterion pattern this
    // change retires for the style-guide presets.
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

        // Still detected...
        const problems = await consistency.execute(rule, 'test.md', ctx);
        expect(problems).toHaveLength(1);

        // ...but never fixed, even though there is no ambiguity to protect
        // against here -- unlike `it's`, neither of these contractions has
        // a second possible expansion.
        const { fixes } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
        expect(fixes).toEqual([]);
      }
    );

    // By contrast, `can't`/`cannot` -- equally unambiguous, but written as
    // ONE word on both sides -- is NOT blocked: the guard's false-positive
    // rate depends on how a contraction's expansion happens to be spelled
    // (one word vs. two), not on whether it is actually ambiguous.
    it("can't/cannot (equally unambiguous, but same word count) is NOT blocked -- the guard is inconsistent by design, not by bug", async () => {
      const content = "Cannot proceed without approval. It can't proceed either.\n";
      const rule = consistencyRule(MESSAGE, { either: { "can't": 'cannot' }, ignoreCase: true });

      const { fixes } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixes).toHaveLength(1);
    });
  });

  it("reports the true column for a conflict on a heading segment's first line", async () => {
    // Regression-style check (mirrors swap.test.ts/repetition.test.ts): a
    // heading segment's content excludes the '## ' marker, so its
    // startColumn (4 here) must be added when the match falls on the
    // segment's first line.
    const content = '## behavior and behaviour\n';
    const rule = consistencyRule(MESSAGE, { either: { behavior: 'behaviour' } }, 'heading');
    const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

    const problems = await consistency.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // '## behavior and behaviour': 'behaviour' starts at source column 17.
    expect(problems[0].column).toBe(17);
    // Problem.text is the segment-content line containing the match (same
    // as pattern.ts): the heading's semantic text, without the '## ' marker.
    expect(problems[0].text).toBe('behavior and behaviour');
    expect(problems[0].match).toBe('behaviour');
  });

  // The no-`rule.message` fallback template must have exactly as many `%s`
  // placeholders as values passed to formatTemplate -- a mismatch either
  // leaves a literal "%s" in the output or silently drops a value. This
  // path is only reachable by a caller building a NormalizedRule
  // programmatically (message is optional at the type level; see
  // types/rules.ts) and handing it straight to runRules, bypassing
  // validate() (which requires `message` via the JSON schema) entirely --
  // same as repetition.test.ts's equivalent describe block.
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

  // Defense in depth: validate() rejects an empty-string `either` key (see
  // the "validation" describe block below), but a caller can still build a
  // NormalizedRule programmatically and hand it straight to runRules(),
  // bypassing validate() entirely -- same bypass path as the "no-message
  // fallback" block above. Without a guard, the empty key escapes to the
  // zero-width pattern `\b\b`; a global regex's lastIndex never advances
  // past a zero-length match, so collectMatches's exec loop spins forever.
  // The explicit timeout below is what turns a stuck run into a reported
  // (failing) test rather than a CI job that hangs until it's killed.
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

    // Regression guard: an empty-string KEY escapes (in collectMatches) to
    // the zero-width pattern `\b\b`, which never advances a global regex's
    // lastIndex and hangs the scan loop forever (see the "zero-width match
    // guard" describe block below for the direct-execution side of this).
    // Validation must reject this at config load time, same as it already
    // rejects an empty-string VALUE.
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
