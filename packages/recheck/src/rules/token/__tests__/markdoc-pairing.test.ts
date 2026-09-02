import { describe, it, expect } from 'vitest';

import type { MarkdocSchema } from '../../../parser/markdoc/schema.js';
import { tokenRuleHarness } from './harness.js';

const SCHEMA: MarkdocSchema = { tags: { img: { selfClosing: true } } };

const h = tokenRuleHarness('markdoc-pairing', {}, { markdoc: true, markdocSchema: SCHEMA });

describe('markdoc-pairing', () => {
  it('no-ops cleanly when the markdoc flag is off (ctx.markdoc absent)', async () => {
    const off = tokenRuleHarness('markdoc-pairing');
    expect(await off.lint('{% img %}\ntext\n')).toEqual([]);
  });

  it('reports nothing for a well-formed pair', async () => {
    expect(await h.lint('{% a %}\nx\n{% /a %}\n')).toEqual([]);
  });

  it('reports one problem per unclosed open', async () => {
    const problems = await h.lint('{% admonition %}\ntext\n{% widget %}\nmore\n');
    expect(problems).toHaveLength(2);
    expect(problems.every((p) => p.message.includes('never closed'))).toBe(true);
    expect(problems[0].line).toBe(1);
    expect(problems[1].line).toBe(3);
  });

  it('reports one problem per orphaned close, without overclaiming "no open exists"', async () => {
    const problems = await h.lint('{% /a %}\ntext\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('no well-formed matching open was found');
    expect(problems[0].message).not.toContain('no open exists');
  });

  it('an orphaned close from a malformed (blockquote multi-line) open still reports the softer wording', async () => {
    // The open tag here is malformed rather than absent, so the message must
    // not claim more than that no well-formed open was found.
    const src =
      '{% before %}\nx\n{% /before %}\n\n' +
      '> {% multi\n> attr="a" %}\n> body\n> {% /multi %}\n\n' +
      '{% after %}\nx\n{% /after %}\n';
    const problems = await h.lint(src);
    const orphanReport = problems.find((p) => p.message.includes('/multi'));
    expect(orphanReport).toBeDefined();
    expect(orphanReport?.message).toContain('no well-formed matching open was found');
  });

  it('reports one problem per crossed entry, calling out the interleaving', async () => {
    const problems = await h.lint('{% a %}{% b %}{% /a %}{% /b %}\n');
    expect(problems).toHaveLength(2);
    expect(problems.every((p) => p.message.includes('interleaved'))).toBe(true);
    expect(problems.some((p) => p.message.includes('"a"'))).toBe(true);
    expect(problems.some((p) => p.message.includes('"b"'))).toBe(true);
  });

  it('asserts the FULL voidMissingSlash message with toBe (no dangling placeholder)', async () => {
    const problems = await h.lint('{% img %}\ntext\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toBe('"img" is self-closing — write {% img /%}');
  });

  it('a properly self-closed void tag reports nothing', async () => {
    expect(await h.lint('{% img /%}\ntext\n')).toEqual([]);
  });

  it('a self-closing tag used WITH an explicit close is detected from `pairs`, not silently accepted', async () => {
    const problems = await h.lint('{% img %}\nx\n{% /img %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('"img" is self-closing');
    expect(problems[0].message).toContain('must not be used with a matching {% /img %} close');
  });

  it('schema: false (no schema at all) never flags voidMissingSlash or the pairs/self-closing check', async () => {
    const noSchema = tokenRuleHarness(
      'markdoc-pairing',
      {},
      { markdoc: true, markdocSchema: null }
    );
    // Without a schema there is no self-closing set to compare against, so
    // "img" is just an ordinary unclosed tag: the unclosed check still fires
    // (it is schema-independent), but never with the self-closing wording.
    const unclosedProblems = await noSchema.lint('{% img %}\ntext\n');
    expect(unclosedProblems).toHaveLength(1);
    expect(unclosedProblems[0].message).toContain('never closed');
    expect(unclosedProblems[0].message).not.toContain('self-closing');

    expect(await noSchema.lint('{% img %}\nx\n{% /img %}\n')).toEqual([]);
  });

  it('never reports annotation, variable, function, or self-closing kinds (they never enter pairing)', async () => {
    const problems = await h.lint('{% #id %}\n{% $var %}\n{% equals(1,1) %}\n{% x /%}\n');
    expect(problems).toEqual([]);
  });

  // Violations come from five separate buckets walked one after another, so
  // without an explicit sort they emerge out of document order. This fixture
  // puts one violation from four buckets on deliberately out-of-order lines.
  describe('reports come out in document order, not bucket order', () => {
    it('interleaves the buckets correctly', async () => {
      const source = [
        '{% /gone %}', // 1  orphaned close
        '',
        '{% img %}', // 3  voidMissingSlash (schema says img is self-closing)
        '',
        '{% outer %}', // 5  crossed (with inner, below)
        '{% inner %}', // 6
        '{% /outer %}', // 7
        '{% /inner %}', // 8
        '',
        '{% never %}', // 10 unclosed
        'text',
        '',
      ].join('\n');
      const problems = await h.lint(source);
      // Lines 5 and 6 both appear because `crossed` holds one entry per
      // crossed pair, so outer and inner each report.
      expect(problems.map((problem) => problem.line)).toEqual([1, 3, 5, 6, 10]);
      // Confirms these really come from four different buckets, so the
      // ordering above is not just one bucket's internal order.
      expect(
        problems.map((problem) => problem.message.replace(/^"[^"]*" ?/, '').slice(0, 23))
      ).toEqual([
        'close tag found, but no',
        'is self-closing — write',
        'and its close are inter',
        'and its close are inter',
        'is opened here but neve',
      ]);
    });

    it('two violations of the SAME kind still come out in line order', async () => {
      const problems = await h.lint('{% b %}\n\n{% a %}\ntext\n');
      expect(problems.map((problem) => problem.line)).toEqual([1, 3]);
    });

    it('same line, different columns: the leftmost comes first', async () => {
      const problems = await h.lint('{% /z %} and {% /y %}\n');
      expect(problems.map((problem) => [problem.line, problem.column])).toEqual([
        [1, 1],
        [1, 14],
      ]);
    });
  });

  // The runner resolves the self-closing set once per run and hands it to the
  // rule on `ctx.markdoc.selfClosingTags` instead of the rule re-deriving it
  // per file; these pin the observable behavior that set drives.
  describe('consumes the runner-provided self-closing set', () => {
    it('a schema-declared self-closing tag written without /%} reports', async () => {
      const problems = await h.lint('{% img %}\ntext\n');
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"img" is self-closing — write {% img /%}');
    });

    it('the set applies per tag NAME, leaving other tags alone', async () => {
      const problems = await h.lint('{% img %}\n\n{% other %}\ntext\n');
      expect(problems.map((problem) => problem.message)).toEqual([
        '"img" is self-closing — write {% img /%}',
        '"other" is opened here but never closed before the document ends',
      ]);
    });
  });
});
