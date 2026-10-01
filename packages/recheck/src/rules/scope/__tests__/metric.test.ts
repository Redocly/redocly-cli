import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { computeTextStatistics, computeReadability } from '../../../metrics/index.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, MetricAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { metric, stripNonProse } from '../metric.js';

// `metric` uses `ctx.segments`, and the runner gives it the `summary` segments (the prose). Tests that call execute() directly must build a context with those segments.
function buildMetricContext(content: string): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => segment.scope === 'summary');
  return { segments, content, tree };
}

// Same, but parses Markdoc tags so segments know their masked ranges.
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
    // `min` is above any real score (max about 121), so this always violates.
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
    // `max` is below any real score, so this always violates.
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

  // The same document with and without frontmatter must score the same.
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
    // The message contains the score, so equal messages mean equal scores.
    expect(withProblems[0].message).toBe(bareProblems[0].message);
  });

  // Markdoc tag markers must not affect the score.
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

  // Inline code must not affect the score.
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

  // A double-backtick span that contains a single backtick (``configFile ` x``) must be removed completely. The heavy fake words after it would change the score if they leaked into the text.
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

  // An empty file, or a file with no prose, must not be flagged. A score of 0 means there is not enough text.
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

  // `metric` uses `ctx.segments` and does not extract scopes itself, so empty segments must report nothing even when the content has prose.
  it('scores ctx.segments, not ctx.content: empty segments with prose-bearing content reports nothing', async () => {
    const content = 'Cats sit quietly. Dogs run swiftly. Birds fly high above the trees.\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const ctx: ScopeRuleContext = { segments: [], content, tree: parseMarkdown(content) };
    const problems = await metric.execute(rule, 'test.md', ctx);
    expect(problems).toEqual([]);
  });

  // Prose that only exists in non-paragraph blocks (list item, blockquote, table) must still be scored.
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

  // A paragraph inside a list item must be counted once.
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

  // A list inside a blockquote produces both a blockquote segment and list item segments with the same words. They must be counted once. The expected score uses the blockquote's raw text, because a plain list would split sentences differently.
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

  // A blockquote inside a blockquote must score the same as the bare paragraph.
  it('does not double-count a blockquote nested inside another blockquote', async () => {
    const nested = '> > Cats sit quietly. Dogs run swiftly. Birds fly high above trees.\n';
    const bare = 'Cats sit quietly. Dogs run swiftly. Birds fly high above trees.\n';
    const rule = metricRule(undefined, { formula: 'flesch-reading-ease', min: 1000 });
    const nestedProblems = await metric.execute(rule, 'test.md', buildMetricContext(nested));
    const bareProblems = await metric.execute(rule, 'test.md', buildMetricContext(bare));
    expect(nestedProblems).toHaveLength(1);
    expect(nestedProblems[0].message).toBe(bareProblems[0].message);
  });

  // Table cells in one row are separate segments, and all four must be counted.
  it('keeps every cell on the same table row as a separate, once-counted segment (siblings, not nested)', async () => {
    const table =
      '| Alpha bravo charlie | Delta echo foxtrot |\n' +
      '| --- | --- |\n' +
      '| Golf hotel india | Juliet kilo lima |\n';
    // Four separate blocks, one per cell; each block ends a sentence.
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

  // A message can use all four `%s` values: formula, score, min and max.
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

  // Metric rules always use the `summary` scope. A different configured scope gives a console warning and is replaced.
  describe('summary auto-scoping (config normalization)', () => {
    // The metric ignores headings, so a heading-only document reports nothing.
    const proseOnly = 'A paragraph with real words to score.\n';

    it('forces scope summary on a metric rule with no configured scope, without warning', async () => {
      const warnings: string[] = [];
      const result = await validate(
        {
          'recheck/readability': {
            severity: 'error',
            message: 'Too hard.',
            assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
          },
        },
        { warn: (message) => warnings.push(message) }
      );
      expect(result.isValid).toBe(true);
      expect(result.rules[0].scope).toBe('summary');
      expect(warnings).toEqual([]);

      const { problems } = await runRules([{ path: 't.md', content: proseOnly }], result.rules);
      expect(problems.filter((p) => p.ruleName === 'recheck/readability')).toHaveLength(1);
    });

    it('warns and still applies summary behavior when a metric rule configures another scope', async () => {
      const warnings: string[] = [];
      const result = await validate(
        {
          'recheck/readability': {
            severity: 'error',
            message: 'Too hard.',
            scope: 'paragraph',
            assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
          },
        },
        { warn: (message) => warnings.push(message) }
      );
      expect(result.isValid).toBe(true);
      expect(result.rules[0].scope).toBe('summary');
      expect(
        warnings.some((message) =>
          message.includes('metric is always summary-scoped; ignoring configured scope')
        )
      ).toBe(true);
      expect(warnings.some((message) => message.includes('paragraph'))).toBe(true);

      const { problems } = await runRules([{ path: 't.md', content: proseOnly }], result.rules);
      expect(problems.filter((p) => p.ruleName === 'recheck/readability')).toHaveLength(1);
    });

    it('does not warn when a metric rule explicitly sets scope summary (or its default alias)', async () => {
      const warnings: string[] = [];
      for (const scope of ['summary', 'default']) {
        const result = await validate(
          {
            'recheck/readability': {
              severity: 'error',
              message: 'Too hard.',
              scope,
              assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
            },
          },
          { warn: (message) => warnings.push(message) }
        );
        expect(result.isValid).toBe(true);
        expect(result.rules[0].scope).toBe('summary');
      }
      expect(warnings).toEqual([]);
    });

    // The schema adds `scope: 'all'` by default, so an explicit `scope: all` is only visible before schema validation. It warns like any other non-summary scope.
    it('warns for an explicit scope: all on a metric rule', async () => {
      const warnings: string[] = [];
      const result = await validate(
        {
          'recheck/readability': {
            severity: 'error',
            message: 'Too hard.',
            scope: 'all',
            assertions: { metric: { formula: 'flesch-reading-ease', min: 1000 } },
          },
        },
        { warn: (message) => warnings.push(message) }
      );
      expect(result.isValid).toBe(true);
      expect(result.rules[0].scope).toBe('summary');
      expect(warnings.some((message) => message.includes('metric is always summary-scoped'))).toBe(
        true
      );
    });
  });

  // With `markdoc: true`, segments arrive already masked. These tests check that the result matches the `markdoc: false` result for paragraph, heading, table cell, and a tag inside inline code.
  describe('structural exclusion with markdoc on equals the regex strip with it off', () => {
    // The expected scores are fixed numbers, not computed in the test.
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

    // With `markdoc: true`, the content is already masked, so a regex for `{%...%}` finds nothing and 17 blanks remained, splitting "<code>" and "</code>" into two words. Deleting the masked span gives 10 words / -6.35, not 11 words / 18.78.
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
      // Headings are not scored, so both modes score the paragraph only.
      await expectScore(content, false, '60.71');
      await expectScore(content, true, '60.71');
    });

    it('a table cell tag with no surrounding whitespace joins into one word, same as the regex strip', async () => {
      const content =
        '| Header cell words | Other header |\n| --- | --- |\n| foo{% x /%}bar words baz | Other body |\n';
      await expectScore(content, false, '68.94');
      await expectScore(content, true, '68.94');
    });

    // A tag inside inline code is not a tag token, so nothing is masked. The result is the same because inline code is removed anyway.
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

    // ``code ` x`` is one span with a single backtick inside. The closing run must have the same length as the opening run.
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

    // An inverted range (min > max) flags every file, so it is rejected.
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

// The metric scores flowing prose only: headings are left out and every block ends a sentence. Other summary-scoped rules still see headings.
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
    // Both paragraphs already end in periods, so joining must not add empty sentences.
    expect(await fre(two)).toBeCloseTo(await fre(one), 0);
  });

  // The end of a block always ends a sentence, even when the next block starts lowercase or with a number, or the last word is an abbreviation.
  it('lowercase list items still terminate as sentences', async () => {
    const bullets = '- the cat sat on the mat\n- the dog ran in the park\n';
    // Compared with one paragraph of two sentences, not with another pair of blocks.
    const punctuated = 'The cat sat on the mat. The dog ran in the park.\n';
    expect(await fre(bullets)).toBe(await fre(punctuated));
  });

  it('a block ending in an abbreviation-list word still terminates', async () => {
    // 'max.' is an abbreviation, so no sentence break inside a block, but the end of a block must still end the sentence.
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
    // This sample scored 22.71 in Lexi (headings removed, blocks end sentences). The tolerance is wide because syllable counting differs between tools.
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
