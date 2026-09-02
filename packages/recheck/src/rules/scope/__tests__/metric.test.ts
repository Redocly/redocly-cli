import { describe, it, expect, vi, afterEach } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { computeTextStatistics, computeReadability } from '../../../metrics/index.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, MetricAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { metric, stripNonProse } from '../metric.js';

// `metric` consumes `ctx.segments` like every other scope rule -- it no
// longer re-extracts scopes from `ctx.tree` itself. Config normalization
// (config/validate.ts) forces `scope: summary` on every metric rule, so at
// runtime the runner hands it the extractor's `summary` segments (the
// document's prose). Direct execute() tests must therefore hand-build a ctx
// carrying exactly those segments: the old `segments: []` shape (which once
// PROVED metric ignored ctx.segments) would now mean "document with no
// prose" and every test here would silently report nothing.
function buildMetricContext(content: string): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => segment.scope === 'summary');
  return { segments, content, tree };
}

// Same recipe with `markdoc: true` -- a masked segment's `maskedRanges` only
// exists when the parse knows about Markdoc tags, which needs the flag passed
// explicitly.
function buildMarkdocMetricContext(content: string): ScopeRuleContext {
  const tree = parseMarkdown(content, { markdoc: true });
  const segments = extractScopes(tree, content).filter((segment) => segment.scope === 'summary');
  return { segments, content, tree };
}

function metricRule(
  message: string | undefined,
  options: MetricAssertion,
  overrides: Partial<NormalizedRule> = {}
): NormalizedRule {
  return {
    name: 'test-metric',
    shortName: 'metric',
    severity: 'error',
    message,
    assertions: { metric: options },
    ...overrides,
  };
}

describe('metric assertion', () => {
  it('flags exactly one problem at line 1, column 1 when the score is below min, using the fallback message', async () => {
    const content = 'Cats sit. Dogs run.\n';
    const ctx = buildMetricContext(content);
    // min is set far above any real flesch-reading-ease score (max ~121)
    // so this always violates, without hand-computing the exact score.
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });

    const problems = await metric.execute(rule, 'test.md', ctx);

    const expectedScore = computeReadability(
      'flesch-reading-ease',
      computeTextStatistics('Cats sit. Dogs run.')
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toBe(
      `Readability (flesch-reading-ease) is ${expectedScore}; expected between 1000 and ∞.`
    );
  });

  it('reports nothing when the score is within [min, max]', async () => {
    const content = 'Cats sit. Dogs run.\n';
    const ctx = buildMetricContext(content);
    const rule = metricRule('Readability (%s) is %s; expected between %s and %s.', {
      formula: 'flesch-reading-ease',
      min: -1000,
      max: 1000,
    });

    const problems = await metric.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('reports the too-high case with the max bound in the message', async () => {
    const content = 'Cats sit. Dogs run.\n';
    const ctx = buildMetricContext(content);
    // max set far below any real score so it always violates on the high side.
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', max: -1000 });

    const problems = await metric.execute(rule, 'test.md', ctx);

    const expectedScore = computeReadability(
      'flesch-reading-ease',
      computeTextStatistics('Cats sit. Dogs run.')
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe(
      `Readability (flesch-reading-ease) is ${expectedScore}; expected between -∞ and -1000.`
    );
  });

  it('prose extraction ignores code blocks and frontmatter: a huge code block does not change the reported score', async () => {
    const base =
      '---\ntitle: x\n---\n\nCats sit. Dogs run. Birds fly high above the trees today.\n';
    const hugeCodeBlock = '```js\n' + 'const x = 1;\n'.repeat(500) + '```\n';
    const withCode = base + '\n' + hugeCodeBlock;

    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const baseProblems = await metric.execute(rule, 'test.md', buildMetricContext(base));
    const withCodeProblems = await metric.execute(rule, 'test.md', buildMetricContext(withCode));

    expect(baseProblems).toHaveLength(1);
    expect(withCodeProblems).toHaveLength(1);
    expect(withCodeProblems[0].message).toBe(baseProblems[0].message);
  });

  // Frontmatter isolation, proven directly (the code-block test above
  // includes frontmatter only incidentally): the SAME document with and
  // without a frontmatter block must score identically -- frontmatter text
  // ('title:', etc.) is metadata, never prose, and must contribute zero
  // words to the statistics.
  it('frontmatter does not change the reported score (same doc with and without frontmatter)', async () => {
    const bare = 'Cats sit quietly. Dogs run swiftly. Birds fly high above the trees.\n';
    const withFrontmatter =
      '---\ntitle: A wordy title that must not count\ndescription: More words that must not count either\n---\n\n' +
      bare;

    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const bareProblems = await metric.execute(rule, 'test.md', buildMetricContext(bare));
    const withProblems = await metric.execute(rule, 'test.md', buildMetricContext(withFrontmatter));

    expect(bareProblems).toHaveLength(1);
    expect(withProblems).toHaveLength(1);
    // The message embeds the computed score, so identical messages mean an
    // identical score.
    expect(withProblems[0].message).toBe(bareProblems[0].message);
  });

  // Product decision, 2026-07-27: Markdoc tag-marker spans must not affect
  // the score -- wrapping a paragraph in `{% admonition %}` / `{% /admonition %}`
  // tags (their own paragraphs, separated by blank lines, since that's the
  // common Markdoc authoring shape) must report the identical score as the
  // bare paragraph.
  it('Markdoc tag markers do not change the reported score (admonition-wrapped paragraph)', async () => {
    const bare = 'Some prose paragraph text that is long enough to score meaningfully.\n';
    const wrapped =
      '{% admonition type="info" %}\n\n' +
      'Some prose paragraph text that is long enough to score meaningfully.\n\n' +
      '{% /admonition %}\n';

    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const bareProblems = await metric.execute(rule, 'test.md', buildMetricContext(bare));
    const wrappedProblems = await metric.execute(rule, 'test.md', buildMetricContext(wrapped));

    expect(bareProblems).toHaveLength(1);
    expect(wrappedProblems).toHaveLength(1);
    expect(wrappedProblems[0].message).toBe(bareProblems[0].message);
  });

  // Product decision, 2026-07-27: inline code spans must not affect the
  // score either -- a backticked token contributes nothing, same as if it
  // were never there.
  it('inline code spans do not change word/syllable counts (configFile fixture)', async () => {
    const withoutCode = 'Set the option to enable this behavior.\n';
    const withCode = 'Set the `configFile` option to enable this behavior.\n';

    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const withoutProblems = await metric.execute(rule, 'test.md', buildMetricContext(withoutCode));
    const withProblems = await metric.execute(rule, 'test.md', buildMetricContext(withCode));

    expect(withoutProblems).toHaveLength(1);
    expect(withProblems).toHaveLength(1);
    expect(withProblems[0].message).toBe(withoutProblems[0].message);
  });

  // Span-recognition parity with 92aa96e67d6 (capitalization.ts/spelling.ts):
  // metric's old INLINE_CODE_RE (`` `+[^`]*`+` ``) excludes ALL backticks
  // from the content, so a double-backtick span whose content itself
  // contains a literal single backtick (a single CommonMark code span, e.g.
  // ``configFile ` x``) is under-matched -- the regex's first backtick run
  // greedily eats the opening "``", `[^`]*` stops at the embedded single
  // backtick, and that lone backtick satisfies the closing `+`, leaving
  // everything after it as unstripped prose. Heavyweight fake words placed
  // there prove the leak: if they survive into the scored text, the
  // reported score shifts away from the bare baseline.
  it('inline code spans with an embedded backtick do not change word/syllable counts (span-recognition parity with capitalization/spelling)', async () => {
    const withoutCode = 'Set the option to enable this behavior.\n';
    const withCode =
      'Set the ``configFile ` faketasticalicious wobblesplosion`` option to enable this behavior.\n';

    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const withoutProblems = await metric.execute(rule, 'test.md', buildMetricContext(withoutCode));
    const withProblems = await metric.execute(rule, 'test.md', buildMetricContext(withCode));

    expect(withoutProblems).toHaveLength(1);
    expect(withProblems).toHaveLength(1);
    expect(withProblems[0].message).toBe(withoutProblems[0].message);
  });

  // Never divide by zero: an empty file, or a file with no prose segments
  // at all (only a code block), must never be flagged -- computeReadability's
  // 0-for-zero-words/sentences return is a documented "not enough text to
  // score" placeholder, not a genuine low score, so the bounds check must be
  // skipped entirely rather than comparing 0 against min.
  it('reports nothing for an empty file', async () => {
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000, max: 1000 });
    const problems = await metric.execute(rule, 'test.md', buildMetricContext(''));
    expect(problems).toEqual([]);
  });

  it('reports nothing for a file with no prose segments (code block only)', async () => {
    const content = '```js\nconst x = 1;\n```\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000, max: 1000 });
    const problems = await metric.execute(rule, 'test.md', buildMetricContext(content));
    expect(problems).toEqual([]);
  });

  // metric consumes ctx.segments — it does NOT re-extract scopes from
  // ctx.tree/ctx.content (Roman's PR-review ask: the runner already
  // extracted them once). A ctx whose segments are deliberately empty while
  // content/tree still carry scoreable prose must therefore report nothing;
  // if metric ever went back to self-extracting, this would flag.
  it('scores ctx.segments, not ctx.content: empty segments with prose-bearing content reports nothing', async () => {
    const content = 'Cats sit quietly. Dogs run swiftly. Birds fly high above the trees.\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const ctx: ScopeRuleContext = { segments: [], content, tree: parseMarkdown(content) };
    const problems = await metric.execute(rule, 'test.md', ctx);
    expect(problems).toEqual([]);
  });

  // The summary sources are exactly paragraph, heading, list-item,
  // blockquote, table.cell, table.header (see extractor.ts) -- proven here
  // by a document with prose ONLY in the non-paragraph kinds (no top-level
  // paragraph at all): if any of them were excluded, this would fall
  // through to the "no prose" (zero words) case above and report nothing.
  it('counts heading, list-item, blockquote, and table cell/header text as prose (no paragraph present)', async () => {
    const content =
      '# A heading with real words\n\n' +
      '- A list item with real words\n\n' +
      '> A blockquote with real words\n\n' +
      '| Header cell words | Other header |\n' +
      '| --- | --- |\n' +
      '| Body cell words | Other body |\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const problems = await metric.execute(rule, 'test.md', buildMetricContext(content));
    expect(problems).toHaveLength(1);
  });

  // A paragraph directly nested inside a list-item/blockquote does not get
  // its own standalone `paragraph` segment (see extractor.ts's
  // isNestedContainerParagraph), so its text appears in exactly one summary
  // segment: a paragraph inside a single list item must contribute its
  // words exactly ONCE.
  it('does not double-count a paragraph nested inside a list item', async () => {
    const nested = '- Cats sit quietly. Dogs run swiftly. Birds fly high above the trees.\n';
    const standalone = 'Cats sit quietly. Dogs run swiftly. Birds fly high above the trees.\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const nestedProblems = await metric.execute(rule, 'test.md', buildMetricContext(nested));
    const standaloneProblems = await metric.execute(
      rule,
      'test.md',
      buildMetricContext(standalone)
    );
    expect(nestedProblems).toHaveLength(1);
    expect(nestedProblems[0].message).toBe(standaloneProblems[0].message);
  });

  // Span-containment dedup (nested containers over the SAME words must not
  // be scored twice): a list nested inside a blockquote emits BOTH the
  // blockquote segment (its whole raw body, list markup and all) AND each
  // list-item segment (the same two items' words again) -- the old dedup
  // only matched IDENTICAL start positions, so this pair (different start
  // columns) sailed straight through uncaught and got double-counted.
  // Correctly deduped, the ONE surviving segment is the blockquote's own
  // whole raw body (the list items are each fully nested inside it, so
  // they drop out) -- the expected score is computed straight from that
  // exact raw text, not from a separately re-parsed "equivalent" document:
  // a plain (blockquote-free) version of this same list has a DIFFERENT
  // sentence count (splitSentences requires an uppercase letter right
  // after a sentence-ending '.\n', and here the next line starts with the
  // blockquote/list markup '> -' instead), which would make the two
  // incomparable for reasons that have nothing to do with this bug.
  it('does not double-count list items nested inside a blockquote', async () => {
    const nested =
      '> - Cats sit quietly. Dogs run swiftly.\n> - Birds fly high above the trees today.\n';
    const expectedProse =
      '> - Cats sit quietly. Dogs run swiftly.\n> - Birds fly high above the trees today.';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const nestedProblems = await metric.execute(rule, 'test.md', buildMetricContext(nested));
    const expectedScore = computeReadability(
      'flesch-reading-ease',
      computeTextStatistics(expectedProse)
    );
    expect(nestedProblems).toHaveLength(1);
    expect(nestedProblems[0].message).toBe(
      `Readability (flesch-reading-ease) is ${expectedScore}; expected between 1000 and ∞.`
    );
  });

  // Same double-counting shape, but with the SAME scope class nested in
  // itself: a blockquote nested inside another blockquote emits BOTH the
  // outer blockquote segment (whole raw body) and the inner blockquote
  // segment (the same paragraph's words again). Must score identically to
  // the bare paragraph with no blockquote wrapping at all.
  it('does not double-count a blockquote nested inside another blockquote', async () => {
    const nested = '> > Cats sit quietly. Dogs run swiftly. Birds fly high above trees.\n';
    const bare = 'Cats sit quietly. Dogs run swiftly. Birds fly high above trees.\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const nestedProblems = await metric.execute(rule, 'test.md', buildMetricContext(nested));
    const bareProblems = await metric.execute(rule, 'test.md', buildMetricContext(bare));
    expect(nestedProblems).toHaveLength(1);
    expect(nestedProblems[0].message).toBe(bareProblems[0].message);
  });

  // Non-regression guard for the fix above: table cells on the SAME row
  // are siblings with disjoint (non-overlapping) spans, never nested one
  // inside another -- span-containment dedup must keep every one of them,
  // not just the first. Asserted against a plain-text equivalent built by
  // joining each cell's own words in the same order extractProse joins
  // segments (top-to-bottom, left-to-right), so the count of ALL FOUR
  // cells' words is proven, not just "at least one".
  it('keeps every cell on the same table row as a separate, once-counted segment (siblings, not nested)', async () => {
    const table =
      '| Alpha bravo charlie | Delta echo foxtrot |\n' +
      '| --- | --- |\n' +
      '| Golf hotel india | Juliet kilo lima |\n';
    // Four separate blocks, matching the four cells: each block terminates as
    // its own sentence under the metric's prose view.
    const equivalent =
      'Alpha bravo charlie\n\nDelta echo foxtrot\n\nGolf hotel india\n\nJuliet kilo lima\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const tableProblems = await metric.execute(rule, 'test.md', buildMetricContext(table));
    const equivalentProblems = await metric.execute(
      rule,
      'test.md',
      buildMetricContext(equivalent)
    );
    expect(tableProblems).toHaveLength(1);
    expect(tableProblems[0].message).toBe(equivalentProblems[0].message);
  });

  // Item 10 (pre-PR cleanup): metric's message cap is 4 `%s` placeholders
  // (formula, score, min, max) — a schema-validated config can now
  // reference all four values, proven end-to-end: extends-resolving
  // validate() accepts the message, and runRules renders every slot.
  it('a 4-placeholder custom metric message validates and renders all four values end-to-end (extends + runRules)', async () => {
    const result = await validate({
      extends: ['recheck/minimal'],
      'recheck/readability-floor': {
        severity: 'error',
        message: 'Score for %s is %s (bounds: %s to %s).',
        assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
      },
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);

    const content = 'Cats sit. Dogs run.\n';
    const { problems } = await runRules([{ path: 't.md', content }], result.rules);
    const metricProblems = problems.filter((p) => p.ruleName === 'recheck/readability-floor');
    const score = computeReadability(
      'flesch-reading-ease',
      computeTextStatistics('Cats sit. Dogs run.')
    );
    expect(metricProblems).toHaveLength(1);
    expect(metricProblems[0].message).toBe(
      `Score for flesch-reading-ease is ${score} (bounds: 1000 to ∞).`
    );
  });

  // Vale parity: metric rules are ALWAYS summary-scoped. Config
  // normalization (config/validate.ts) forces `scope: summary` on any rule
  // whose assertions include `metric`; a config that explicitly sets a
  // DIFFERENT scope gets a console warning (ValidationResult carries only
  // errors -- same channel the stale `^#`-pattern warning uses) and summary
  // behavior anyway.
  describe('summary auto-scoping (config normalization)', () => {
    // Prose lives ONLY in a heading here: under a genuine `scope: paragraph`
    // run there would be zero matching segments (zero words -> no problem),
    // so a reported problem proves the configured scope was replaced by
    // summary, not merely warned about.
    // Prose, not a bare heading: the metric's prose view excludes headings,
    // so a heading-only document has nothing to score and reports nothing.
    const proseOnly = 'A paragraph with real words to score.\n';

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('forces scope summary on a metric rule with no configured scope, without warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await validate({
        'recheck/readability': {
          severity: 'error',
          message: 'Too hard.',
          assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
        },
      });
      expect(result.isValid).toBe(true);
      expect(result.rules[0].scope).toBe('summary');
      expect(warnSpy).not.toHaveBeenCalled();

      const { problems } = await runRules([{ path: 't.md', content: proseOnly }], result.rules);
      expect(problems.filter((p) => p.ruleName === 'recheck/readability')).toHaveLength(1);
    });

    it('warns and still applies summary behavior when a metric rule configures another scope', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await validate({
        'recheck/readability': {
          severity: 'error',
          message: 'Too hard.',
          scope: 'paragraph',
          assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
        },
      });
      expect(result.isValid).toBe(true);
      expect(result.rules[0].scope).toBe('summary');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('metric is always summary-scoped; ignoring configured scope')
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('paragraph'));

      const { problems } = await runRules([{ path: 't.md', content: proseOnly }], result.rules);
      expect(problems.filter((p) => p.ruleName === 'recheck/readability')).toHaveLength(1);
    });

    it('does not warn when a metric rule explicitly sets scope summary (or its default alias)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      for (const scope of ['summary', 'default']) {
        const result = await validate({
          'recheck/readability': {
            severity: 'error',
            message: 'Too hard.',
            scope,
            assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
          },
        });
        expect(result.isValid).toBe(true);
        expect(result.rules[0].scope).toBe('summary');
      }
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // The schema injects `scope: 'all'` as a structural default (AJV
    // useDefaults), so "user omitted scope" is only distinguishable from
    // "user wrote scope: all" BEFORE schema validation runs -- the
    // normalization captures explicit scopes pre-schema, and an explicit
    // `scope: all` on a metric rule warns like any other non-summary scope.
    it('warns for an explicit scope: all on a metric rule', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await validate({
        'recheck/readability': {
          severity: 'error',
          message: 'Too hard.',
          scope: 'all',
          assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
        },
      });
      expect(result.isValid).toBe(true);
      expect(result.rules[0].scope).toBe('summary');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('metric is always summary-scoped')
      );
    });
  });

  // `metric` is summary-scoped, so under `markdoc: true` its segments arrive
  // already masked before `extractProse` ever sees them. These pin that the
  // flag-on path (splicing `segment.maskedRanges` out of `content`) produces
  // the same readability numbers as the flag-off regex strip, across every
  // prose shape masking touches: paragraph, heading, table cell, and a tag the
  // extractor never masks at all (one written inside inline code).
  describe('structural exclusion with markdoc on equals the regex strip with it off', () => {
    // Every expected score below is a literal, hand-verified number rather
    // than a `computeReadability` call inside the test, so a change to the
    // readability formulas, the word tokenizer, or this rule's extraction
    // logic is caught here instead of silently recomputing its own expectation.
    async function expectScore(content: string, markdoc: boolean, expected: string) {
      const ctx = markdoc ? buildMarkdocMetricContext(content) : buildMetricContext(content);
      const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
      const problems = await metric.execute(rule, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe(
        `Readability (flesch-reading-ease) is ${expected}; expected between 1000 and ∞.`
      );
    }

    it('an inline tag with ordinary surrounding whitespace scores identically flag-on and flag-off', async () => {
      const content =
        'Alpha bravo charlie delta echo. Foxtrot golf hotel india juliet kilo. {% partial file="x" /%} Lima mike november oscar papa. Quebec romeo sierra tango uniform victor whiskey.\n';
      await expectScore(content, false, '35.48');
      await expectScore(content, true, '35.48');
    });

    // The regression this targets. metric's regex used to run on
    // already-masked content under `markdoc: true`, where a pattern built to
    // match `{%...%}` finds nothing (the tag's characters are now mask
    // spaces), so 17 blanks stayed in the joined prose and "<code>" /
    // "</code>" tokenized as two words instead of the single adjacent run a
    // real Markdoc render leaves behind. Deleting the masked span rather than
    // blanking it gives 10 words / -6.35 either way, not 11 words / 18.78.
    it("a tag flush against adjacent text with no separating whitespace still joins into one word, matching the regex strip's own deletion", async () => {
      const content =
        'The <code>{% $optionName %}</code> option also supports page-level configuration using front matter.\n';
      const manuallyStripped =
        'The <code></code> option also supports page-level configuration using front matter.\n';
      await expectScore(content, false, '-6.35');
      await expectScore(content, true, '-6.35');
      await expectScore(manuallyStripped, false, '-6.35');
    });

    it('a heading annotation tag (# Head {% #anchor %}) splices out identically to the bare heading', async () => {
      const content =
        '# Main heading {% #anchor %}\n\nSome prose paragraph text that is long enough to score meaningfully today.\n';
      // Headings are excluded from the prose view, so both modes score the
      // paragraph alone -- the invariant is that flag-on equals flag-off.
      await expectScore(content, false, '60.71');
      await expectScore(content, true, '60.71');
    });

    it('a table cell tag with no surrounding whitespace joins into one word, same as the regex strip', async () => {
      const content =
        '| Header cell words | Other header |\n| --- | --- |\n| foo{% x /%}bar words baz | Other body |\n';
      await expectScore(content, false, '68.94');
      await expectScore(content, true, '68.94');
    });

    // A tag inside an inline code span is never recognized as a tag token
    // (CommonMark inline code is raw text), so the extractor never masks it:
    // `maskedRanges` stays undefined even under `markdoc: true` and
    // `extractProse` falls back to the regex strip. The result matches anyway,
    // because the whole backtick span is inline code and is removed outright.
    it('a tag written inside an inline code span is never masked, and falls back to the regex strip even under markdoc: true', async () => {
      const content = 'Usage example: `{% $env.PUBLIC_REDOCLY_BRANCH_NAME %}` today.\n';
      await expectScore(content, false, '6.39');
      await expectScore(content, true, '6.39');
    });

    it('a block admonition tag pair scores identically flag-on and flag-off', async () => {
      const wrapped =
        '{% admonition type="info" %}\n\nSome prose paragraph text that is long enough to score meaningfully.\n\n{% /admonition %}\n';
      await expectScore(wrapped, false, '64.92');
      await expectScore(wrapped, true, '64.92');
    });

    // Explicit `markdoc: false`, rather than the option merely omitted as
    // everywhere above, takes the same "no tag tokens exist" path.
    it('markdoc: false explicitly still uses the regex strip, unchanged', async () => {
      const content =
        'Alpha bravo charlie delta echo. Foxtrot golf hotel india juliet kilo. {% partial file="x" /%} Lima mike november oscar papa. Quebec romeo sierra tango uniform victor whiskey.\n';
      const tree = parseMarkdown(content, { markdoc: false });
      const segments = extractScopes(tree, content).filter((s) => s.scope === 'summary');
      const ctx: ScopeRuleContext = { segments, content, tree };
      const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });

      const problems = await metric.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe(
        'Readability (flesch-reading-ease) is 35.48; expected between 1000 and ∞.'
      );
    });
  });

  describe('stripNonProse', () => {
    it('removes a Markdoc tag-marker span, keeping surrounding prose', () => {
      expect(stripNonProse('{% admonition type="info" %}Some text{% /admonition %}')).toBe(
        'Some text'
      );
    });

    it('removes each of two tag markers independently, keeping the prose between them', () => {
      expect(stripNonProse('{% tag %}\ntext\n{% /tag %}')).toBe('\ntext\n');
    });

    it('removes the whitespace-trim tag variant ({%- ... -%})', () => {
      expect(stripNonProse('{%- foo -%}bar')).toBe('bar');
    });

    it('leaves a tag-marker-only string empty', () => {
      expect(stripNonProse('{% admonition type="info" %}')).toBe('');
    });

    it('removes a single-backtick inline code span, dropping its content', () => {
      expect(stripNonProse('a `code` b')).toBe('a  b');
    });

    it('removes a multi-backtick-delimited inline code span (no embedded backtick)', () => {
      expect(stripNonProse('Say ``like this`` please.')).toBe('Say  please.');
    });

    // The motivating CommonMark case for the run-length backreference
    // pattern (see BACKTICK_SPAN_RE in core/inline-code.ts): ``code ` x`` is
    // a single 2-backtick-delimited span whose content contains one literal
    // backtick. A regex that just alternates "backtick run ... backtick
    // run" without matching the closing run's LENGTH to the opening run's
    // stops at that embedded backtick, leaving ' x' unstripped.
    it('removes a multi-backtick span whose content itself contains a literal backtick', () => {
      expect(stripNonProse('a ``code ` x`` b')).toBe('a  b');
    });

    it('leaves plain prose with no markup untouched', () => {
      expect(stripNonProse('Plain prose, nothing to strip.')).toBe(
        'Plain prose, nothing to strip.'
      );
    });
  });

  describe('config validation', () => {
    function metricConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error' as const,
          message: 'Test message',
          assertions: { metric: options },
        },
      };
    }

    it('errors when formula is missing', async () => {
      const result = await validate(metricConfig({ min: 1 }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('formula'))).toBe(true);
    });

    it('errors when formula is not one of the six recognized values', async () => {
      const result = await validate(metricConfig({ formula: 'bogus-formula', min: 1 }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('formula'))).toBe(true);
    });

    it('accepts every one of the six recognized formula values', async () => {
      const formulas = [
        'flesch-reading-ease',
        'flesch-kincaid-grade',
        'gunning-fog',
        'smog',
        'coleman-liau',
        'automated-readability',
      ];
      for (const formula of formulas) {
        const result = await validate(metricConfig({ formula, min: 1 }));
        expect(result.errors).toEqual([]);
        expect(result.isValid).toBe(true);
      }
    });

    it('errors when neither min nor max is set, mentioning min/max', async () => {
      const result = await validate(metricConfig({ formula: 'flesch-reading-ease' }));
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('min') && error.message.includes('max')
        )
      ).toBe(true);
    });

    it('accepts metric with only min set', async () => {
      const result = await validate(metricConfig({ formula: 'flesch-reading-ease', min: 30 }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts metric with only max set', async () => {
      const result = await validate(metricConfig({ formula: 'flesch-reading-ease', max: 30 }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects an unknown metric option', async () => {
      const result = await validate(
        metricConfig({ formula: 'flesch-reading-ease', min: 30, unknownOption: true })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('errors when min is not a number', async () => {
      const result = await validate(metricConfig({ formula: 'flesch-reading-ease', min: '30' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('min'))).toBe(true);
    });

    it('errors when max is not a number', async () => {
      const result = await validate(metricConfig({ formula: 'flesch-reading-ease', max: '30' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('max'))).toBe(true);
    });

    // An inverted range (min > max) can never be satisfied by any score, so
    // the rule would flag EVERY prose file it scopes to — always a config
    // mistake, never a legitimate rule. Mirrors occurrence's own min > max
    // rejection (see occurrence.test.ts).
    describe('validation rejects metric with min > max', () => {
      it('errors when min exceeds max, mentioning both bounds', async () => {
        const result = await validate(
          metricConfig({ formula: 'flesch-reading-ease', min: 60, max: 30 })
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (error) => error.message.includes('min') && error.message.includes('max')
          )
        ).toBe(true);
      });

      it('still accepts min === max (an exact-score bound)', async () => {
        const result = await validate(
          metricConfig({ formula: 'flesch-reading-ease', min: 30, max: 30 })
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });
});

// The metric's prose view diverges from the summary scope on purpose: a
// readability score is only meaningful over flowing prose, so headings are
// excluded and every block terminates a sentence. Other summary-scoped rules
// (prose, inclusive-language) keep seeing headings.
describe('metric prose extraction (readability-standard view)', () => {
  const fre = (content: string): Promise<number> => {
    const rule = metricRule('%s|%s', { formula: 'flesch-reading-ease', min: 500 });
    return metric
      .execute(rule, 'test.md', buildMetricContext(content))
      .then((problems) => Number(problems[0].message.split('|')[1]));
  };

  it('excludes headings from the score', async () => {
    const paragraph = 'The cat sat on the mat. The dog ran in the park.\n';
    const withHeading =
      '# Comprehensive internationalization implementation considerations\n\n' + paragraph;
    expect(await fre(withHeading)).toBe(await fre(paragraph));
  });

  it('unpunctuated list items terminate as sentences instead of fusing', async () => {
    const bullets = '- The cat sat on the mat\n- The dog ran in the park\n';
    const punctuated = 'The cat sat on the mat. The dog ran in the park.\n';
    expect(await fre(bullets)).toBe(await fre(punctuated));
  });

  it('a punctuated block is not double-terminated', async () => {
    const one = 'The cat sat on the mat.\n';
    const two = 'The cat sat on the mat.\n\nThe dog ran in the park.\n';
    // Both paragraphs already end in periods; joining must not add empty
    // sentences, so two easy sentences score like two easy sentences.
    expect(await fre(two)).toBeCloseTo(await fre(one), 0);
  });

  // Block ends are unconditional sentence ends. The splitter's own boundary
  // rule (terminator + space + capital, abbreviation carve-outs) governs only
  // INSIDE a block; asking it to rediscover block boundaries in joined text
  // silently fused blocks whose next word was lowercase or numeric, or whose
  // last word doubled as an abbreviation (Bugbot, PR #26155).
  it('lowercase list items still terminate as sentences', async () => {
    const bullets = '- the cat sat on the mat\n- the dog ran in the park\n';
    // Anchored to a punctuated single paragraph (two true sentences), not to
    // another block pair -- two fused-the-same-way documents would pass as
    // equals without proving termination.
    const punctuated = 'The cat sat on the mat. The dog ran in the park.\n';
    expect(await fre(bullets)).toBe(await fre(punctuated));
  });

  it('a block ending in an abbreviation-list word still terminates', async () => {
    // 'max' is in ABBREVIATIONS, so the splitter refuses a boundary after
    // 'max.' inside a block -- but a block END must terminate regardless.
    const bullets = '- Set the max\n- Set the timeout too\n';
    const paragraphs = 'Set the max.\n\nSet the timeout too.\n';
    expect(await fre(bullets)).toBe(await fre(paragraphs));
  });

  it('a block followed by a numeric block still terminates', async () => {
    const bullets = '- the cat sat on the mat\n- 42 dogs ran in the park\n';
    const paragraphs = 'the cat sat on the mat.\n\n42 dogs ran in the park.\n';
    expect(await fre(bullets)).toBe(await fre(paragraphs));
  });

  it('two separate paragraphs are two sentences even without punctuation', async () => {
    const unpunctuated = 'the cat sat on the mat\n\nthe dog ran in the park\n';
    const punctuated = 'The cat sat on the mat. The dog ran in the park.\n';
    expect(await fre(unpunctuated)).toBe(await fre(punctuated));
  });

  it('matches standard readability tooling on a real docs sample', async () => {
    // This sample scored 22.71 in Lexi (headings stripped, blocks terminate).
    // Under the old punctuation-only rule it scored 5.43. Tolerance is wide
    // because syllable heuristics legitimately differ between tools.
    const sample = [
      '# Introduction',
      'Configure custom plugins to extend lint and decorator behavior. Use plugins when you need to add rules beyond the built-in and configurable, or decorators beyond the built-in decorators. For implementation guidance, see custom plugins.',
      '',
      '## Options',
      'The plugins configuration is a list of paths to plugin files, relative to the config file. You can include as many plugins as you need.',
      '',
      '## Resources',
      '- APIs configuration - Set per-API configuration options in redocly.yaml for customized plugin behavior across different API specifications',
      '- Rules configuration - Define linting rules that work with plugins for comprehensive API validation and quality enforcement',
      '- Decorators - Apply transformations to your OpenAPI documents for enhanced functionality when used with plugins',
    ].join('\n');
    const score = await fre(sample);
    expect(score).toBeGreaterThan(15);
    expect(score).toBeLessThan(32);
  });
});
