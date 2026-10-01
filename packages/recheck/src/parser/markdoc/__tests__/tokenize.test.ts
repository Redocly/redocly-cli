import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../../index.js';

const md = (s: string) => parseMarkdown(s, { markdoc: true });
const types = (s: string) => md(s).flat.filter((t) => t.type === 'markdocTag');

describe('markdoc tokenization', () => {
  it('block tag splits the merged paragraph into siblings', () => {
    const tree = md('{% admonition type="info" %}\nBe careful.\n{% /admonition %}\n');
    const top = tree.children.map((t) => t.type);
    expect(top.filter((t) => t === 'markdocTag')).toHaveLength(2);
    const para = tree.flat.find((t) => t.type === 'paragraph');
    expect(para?.text).toBe('Be careful.');
  });

  it('inline tag is an atomic token inside the paragraph', () => {
    const tags = types('Inline {% partial file="x.md" /%} tag.\n');
    expect(tags).toHaveLength(1);
    expect(tags[0].markdocKind).toBe('tag-self-closing');
    expect(tags[0].text).toBe('{% partial file="x.md" /%}');
  });

  it('synthesizes name and attribute children with real positions', () => {
    const tag = types('{% admonition type="info" %}\nx\n{% /admonition %}\n')[0];
    const name = tag.children.find((c) => c.type === 'markdocTagName');
    expect(name?.text).toBe('admonition');
    expect(name?.startLine).toBe(1);
    expect(name?.startColumn).toBe(4);
    const attr = tag.children.find((c) => c.type === 'markdocAttribute');
    expect(attr?.children.map((c) => c.type)).toEqual([
      'markdocAttributeName',
      'markdocAttributeValue',
    ]);
    expect(attr?.children[0].text).toBe('type');
    expect(attr?.children[1].text).toBe('"info"');
  });

  it('markers are their own children, marker text includes the trim variant', () => {
    const tag = types('{%- admonition -%}\nx\n{%- /admonition -%}\n')[0];
    const markers = tag.children.filter((c) => c.type === 'markdocTagMarker');
    expect(markers.map((m) => m.text)).toEqual(['{%-', '-%}']);
  });

  it('multiline block opener tokenizes to one tag', () => {
    const tags = types('{% code-snippet\n   file="a.ts"\n   language="ts" %}\n');
    expect(tags).toHaveLength(1);
    expect(tags[0].endLine).toBe(3);
    const attrs = tags[0].children.filter((c) => c.type === 'markdocAttribute');
    expect(attrs.map((a) => a.startLine)).toEqual([2, 3]);
    expect(attrs.map((a) => a.text)).toEqual(['file="a.ts"', 'language="ts"']);
  });

  it('NEGATIVE: fenced code, inline code, frontmatter never tokenize', () => {
    expect(types('```\n{% admonition %}\n```\n')).toHaveLength(0);
    expect(types('Use `{% partial /%}` here.\n')).toHaveLength(0);
    expect(types('---\ntitle: "{% x %}"\n---\n\nBody.\n')).toHaveLength(0);
  });

  it('annotations, variables, and function calls tokenize with their kinds', () => {
    expect(types('# Head {% #main %}\n')[0]?.markdocKind).toBe('annotation');
    expect(types('Hello {% $name %}.\n')[0]?.markdocKind).toBe('variable');
    expect(types('Hello {% equals(1,1) %}.\n')[0]?.markdocKind).toBe('function');
  });

  it('flag off: no markdocTag anywhere (byte-identity guard)', () => {
    expect(
      parseMarkdown('{% admonition %}\nx\n{% /admonition %}\n').flat.some(
        (t) => t.type === 'markdocTag'
      )
    ).toBe(false);
  });
});

describe('all six MarkdocTagKind values, plus malformed', () => {
  it('tag-open / tag-close / tag-self-closing', () => {
    expect(types('{% t %}\nx\n{% /t %}\n')[0].markdocKind).toBe('tag-open');
    expect(types('{% t %}\nx\n{% /t %}\n')[1].markdocKind).toBe('tag-close');
    expect(types('{% partial file="x.md" /%}\n')[0].markdocKind).toBe('tag-self-closing');
  });

  it('annotation, variable, function (name stays absent)', () => {
    for (const [src, kind] of [
      ['# H {% #main %}\n', 'annotation'],
      ['a {% $x %}.\n', 'variable'],
      ['a {% fn(1) %}.\n', 'function'],
    ] as const) {
      const tag = types(src)[0];
      expect(tag.markdocKind).toBe(kind);
      expect(tag.children.some((c) => c.type === 'markdocTagName')).toBe(false);
    }
  });

  it('malformed interior span: markdocKind is malformed, no name/attribute children synthesized', () => {
    // The interior fails to parse, so the span is malformed instead of throwing or keeping a
    // partial name.
    const tag = types('{% img =broken %}\n')[0];
    expect(tag.markdocKind).toBe('malformed');
    expect(tag.children.some((c) => c.type === 'markdocTagName')).toBe(false);
    expect(tag.children.some((c) => c.type === 'markdocAttribute')).toBe(false);
    // The `{%` and `%}` markers are still there. The filter skips micromark's own children.
    expect(tag.children.filter((c) => c.type.startsWith('markdoc')).map((c) => c.type)).toEqual([
      'markdocTagMarker',
      'markdocTagMarker',
    ]);
  });
});

describe('attribute value kinds (spot check -- span.test.ts covers the parser exhaustively)', () => {
  it('number, boolean, null, array, object, variable, function, bareword all synthesize a value child', () => {
    const tag = types('{% t n=1 b=true z=null a=[1,2] o={x: 1} v=$x f=fn(1) w=star %}\n')[0];
    const values = tag.children
      .filter((c) => c.type === 'markdocAttribute')
      .map((a) => a.children.find((c) => c.type === 'markdocAttributeValue')?.text);
    expect(values).toEqual(['1', 'true', 'null', '[1,2]', '{x: 1}', '$x', 'fn(1)', 'star']);
  });
});

describe('primary value and shortcut synthesis (amended token model)', () => {
  it('markdocTagPrimary wraps the positional value after the tag name', () => {
    const tag = types('{% if $flag %}\nx\n{% /if %}\n')[0];
    const primary = tag.children.find((c) => c.type === 'markdocTagPrimary');
    expect(primary?.text).toBe('$flag');
  });

  it('no markdocTagPrimary child when the tag has no primary value', () => {
    const tag = types('{% admonition type="info" %}\nx\n{% /admonition %}\n')[0];
    expect(tag.children.some((c) => c.type === 'markdocTagPrimary')).toBe(false);
  });

  it('markdocShortcut is synthesized per class/id shortcut, in source order, with correct offsets', () => {
    const tag = types('{% if $flag .wide #main %}\nx\n{% /if %}\n')[0];
    const shortcuts = tag.children.filter((c) => c.type === 'markdocShortcut');
    expect(shortcuts.map((s) => s.text)).toEqual(['.wide', '#main']);
    // The two shortcuts have different positions.
    expect(shortcuts[0].startColumn).not.toBe(shortcuts[1].startColumn);
  });

  it('no markdocShortcut children when the tag has none', () => {
    const tag = types('{% admonition type="info" %}\nx\n{% /admonition %}\n')[0];
    expect(tag.children.some((c) => c.type === 'markdocShortcut')).toBe(false);
  });
});

describe('boundaries and adjacency', () => {
  it('adjacent tags with no separator are two distinct tokens', () => {
    const tags = types('{% a %}{% b %}\n');
    expect(tags).toHaveLength(2);
    expect(tags.map((t) => t.text)).toEqual(['{% a %}', '{% b %}']);
  });

  it('a lone tag at file start/end with no surrounding newline still tokenizes', () => {
    const tags = types('{% a %}');
    expect(tags).toHaveLength(1);
    expect(tags[0].markdocKind).toBe('tag-open');
  });

  it('tokenizes inside a list item, at the correct column past the list marker', () => {
    const tags = types('- {% a %}\n- item\n');
    expect(tags).toHaveLength(1);
    expect(tags[0].startColumn).toBe(3);
  });

  it('a single-line tag inside a blockquote tokenizes correctly', () => {
    const tags = types('> {% a %}\n> more\n');
    expect(tags).toHaveLength(1);
    expect(tags[0].startColumn).toBe(3);
    expect(tags[0].markdocKind).toBe('tag-open');
  });

  // The text of a multi-line token includes the `> ` at the start of each blockquote line,
  // so the tag is malformed. This is not specific to Markdoc. List items are fine,
  // because their continuation is only indentation.
  it('a MULTI-LINE tag inside a blockquote is classified malformed (inherited from buildTree slicing -- see comment above)', () => {
    const tag = types('> {% code-snippet\n> file="a.ts"\n> language="ts" %}\n')[0];
    expect(tag.text).toContain('> file');
    expect(tag.markdocKind).toBe('malformed');
  });

  it('a MULTI-LINE tag inside a list item tokenizes correctly (list continuation is plain indentation)', () => {
    const tag = types('- {% code-snippet\n  file="a.ts"\n  language="ts" %}\n')[0];
    expect(tag.markdocKind).toBe('tag-open');
    expect(tag.children.filter((c) => c.type === 'markdocAttribute')).toHaveLength(2);
  });

  it('tokenizes inside a table cell', () => {
    const tags = types('| a | b |\n| - | - |\n| {% x %} | y |\n');
    expect(tags).toHaveLength(1);
  });
});

describe('HTML comments containing Markdoc-like text', () => {
  // Nothing inside an HTML comment is tokenized, including Markdoc tags.
  it('block-position HTML comment: {% %} inside it does not tokenize', () => {
    expect(types('<!-- {% admonition %} -->\n')).toHaveLength(0);
  });

  it('inline-position HTML comment: {% %} inside it does not tokenize', () => {
    expect(types('Text <!-- {% admonition %} --> more.\n')).toHaveLength(0);
  });
});

describe('position stability around inline tags (the #25610 regression class)', () => {
  it('data siblings before/after an inline tag keep their own real positions (not shifted or masked)', () => {
    const source = 'One two {% partial file="x.md" /%} three four.\n';
    const tree = md(source);
    const flatData = tree.flat.filter((t) => t.type === 'data');
    const before = flatData.find((t) => t.text === 'One two ');
    const after = flatData.find((t) => t.text === ' three four.');
    expect(before?.startColumn).toBe(1);
    // The text after the tag starts right where the tag ends.
    const tag = types(source)[0];
    expect(after?.startColumn).toBe(tag.endColumn);
  });
});

describe('long tags: no scan-length ceiling', () => {
  // A scan length limit would stop long tags from being tokenized. These sizes are similar to the
  // longest real tags.
  const attributes = (count: number, indent = '') =>
    Array.from(
      { length: count },
      (_, i) => `${indent}attribute-number-${i}="a reasonably long value ${i}"`
    );

  it('a single-line tag well over 1000 characters tokenizes, with round-tripping positions', () => {
    const tag = `{% code-walkthrough ${attributes(24).join(' ')} %}`;
    expect(tag.length).toBeGreaterThan(1000);
    const source = `${tag}\n`;
    const tags = types(source);
    expect(tags).toHaveLength(1);
    expect(tags[0].markdocKind).toBe('tag-open');
    expect(tags[0].text).toBe(tag);
    expect([tags[0].startLine, tags[0].startColumn]).toEqual([1, 1]);
    expect([tags[0].endLine, tags[0].endColumn]).toEqual([1, tag.length + 1]);
    expect(tags[0].children.filter((c) => c.type === 'markdocAttribute')).toHaveLength(24);
  });

  it('a 30+-line multi-line opener totalling well over 600 characters tokenizes', () => {
    const lines = attributes(32, '  ');
    const tag = `{% code-walkthrough\n${lines.join('\n')} %}`;
    expect(tag.length).toBeGreaterThan(600);
    expect(tag.split('\n')).toHaveLength(33);
    const tags = types(`${tag}\n`);
    expect(tags).toHaveLength(1);
    expect(tags[0].markdocKind).toBe('tag-open');
    expect(tags[0].endLine).toBe(33);
    const attrs = tags[0].children.filter((c) => c.type === 'markdocAttribute');
    expect(attrs).toHaveLength(32);
    expect(attrs.map((a) => a.startLine)).toEqual(lines.map((_, i) => i + 2));
  });

  it('a ~1900-character multi-line tag (the longest shape in this repo) tokenizes', () => {
    const lines = attributes(40, '  ');
    const tag = `{% openapi-response-example\n${lines.join('\n')} %}`;
    expect(tag.length).toBeGreaterThan(1895);
    const tags = types(`Intro.\n\n${tag}\n\nOutro.\n`);
    expect(tags).toHaveLength(1);
    expect(tags[0].markdocKind).toBe('tag-open');
    expect(tags[0].text).toBe(tag);
  });
});

describe('trailing whitespace after the close marker stays outside the tag token', () => {
  // The token text must end with `%}`. If it ended with `%} `, the tag would be malformed.
  for (const [label, source] of [
    ['one trailing space', '{% a %} \n'],
    ['a trailing tab', '{% a %}\t\n'],
    ['several trailing spaces', '{% a %}   \n'],
    ['trailing spaces at EOF, no newline', '{% a %}  '],
  ] as const) {
    it(`${label}: still a block tag with clean markers and positions`, () => {
      const tree = md(source);
      const tags = tree.flat.filter((t) => t.type === 'markdocTag');
      expect(tags).toHaveLength(1);
      expect(tags[0].text).toBe('{% a %}');
      expect(tags[0].markdocKind).toBe('tag-open');
      expect(
        tags[0].children.filter((c) => c.type === 'markdocTagMarker').map((c) => c.text)
      ).toEqual(['{%', '%}']);
      expect([tags[0].startColumn, tags[0].endColumn]).toEqual([1, 8]);
      // A block tag is at the top level, not inside a paragraph.
      expect(tree.children.some((t) => t.type === 'markdocTag')).toBe(true);
    });
  }
});

// Markdoc has no indented code, so an indented tag is still a tag and indented text is a paragraph.
describe('indented tags (Markdoc has no indented code blocks)', () => {
  it('a 4-space-indented tag tokenizes, with the column past the indentation', () => {
    const tags = types('Before.\n\n    {% card %}\n    Body.\n    {% /card %}\n');
    expect(tags.map((t) => t.markdocKind)).toEqual(['tag-open', 'tag-close']);
    expect([tags[0].startLine, tags[0].startColumn]).toEqual([3, 5]);
    expect([tags[1].startLine, tags[1].startColumn]).toEqual([5, 5]);
    expect(tags[0].text).toBe('{% card %}');
    expect(tags[1].text).toBe('{% /card %}');
  });

  it('positions round-trip: each tag text is exactly the document slice at its position', () => {
    const source = 'Before.\n\n        {% card title="Deep" %}\n        Body.\n  {% /card %}\n';
    const lines = source.split('\n');
    const tags = types(source);
    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      const start = tag.startColumn - 1;
      expect(lines[tag.startLine - 1].slice(start, start + tag.text.length)).toBe(tag.text);
      expect(lines[tag.endLine - 1].slice(tag.endColumn - 3, tag.endColumn - 1)).toBe('%}');
    }
  });

  it('4-space-indented prose is ordinary paragraph content, not a code block', () => {
    const tree = md('Before.\n\n    just some indented text\n\nAfter.\n');
    expect(tree.flat.filter((t) => t.type === 'codeIndented')).toHaveLength(0);
    expect(tree.flat.filter((t) => t.type === 'paragraph').map((t) => t.text)).toEqual([
      'Before.',
      'just some indented text',
      'After.',
    ]);
  });

  it('a deeper-indented opener pairs with a shallower close', () => {
    const tags = types(
      [
        '{% cards %}',
        '  {% card title="A" %}',
        '  Body A.',
        '  {% /card %}',
        '',
        '    {% card title="B" %}',
        '    Body B.',
        '  {% /card %}',
        '{% /cards %}',
        '',
      ].join('\n')
    );
    expect(tags.map((t) => t.markdocKind)).toEqual([
      'tag-open',
      'tag-open',
      'tag-close',
      'tag-open',
      'tag-close',
      'tag-close',
    ]);
  });

  it('an indented MULTI-LINE tag tokenizes across its lines', () => {
    const tags = types('Before.\n\n    {% img\n      src="a.png"\n    /%}\n');
    expect(tags).toHaveLength(1);
    expect(tags[0].markdocKind).toBe('tag-self-closing');
    expect([tags[0].startLine, tags[0].startColumn]).toEqual([3, 5]);
  });

  it('fenced code blocks still hide their contents', () => {
    const tree = md('```\n    {% card %}\n```\n');
    expect(tree.flat.filter((t) => t.type === 'markdocTag')).toHaveLength(0);
    expect(tree.flat.some((t) => t.type === 'codeFenced')).toBe(true);
  });
});

// Markdoc has no setext headings, so they become plain paragraphs.
describe('setext headings (Markdoc has no setext headings)', () => {
  it('flag off: "Title\\n=====\\n" still yields a real setextHeading (byte-identity guard)', () => {
    const flat = parseMarkdown('Title\n=====\n').flat;
    expect(flat.some((t) => t.type === 'setextHeading')).toBe(true);
  });

  it('flag on: the "=" underline becomes ordinary paragraph text, never a heading', () => {
    const tree = md('Title\n=====\n');
    expect(tree.flat.some((t) => t.type === 'setextHeading')).toBe(false);
    const para = tree.flat.find((t) => t.type === 'paragraph');
    expect(para?.text).toBe('Title\n=====');
  });

  it('flag on: the "-" underline still ends the paragraph, but as a thematicBreak, never a heading', () => {
    const tree = md('Title\n-----\n');
    expect(tree.flat.some((t) => t.type === 'setextHeading')).toBe(false);
    expect(tree.flat.some((t) => t.type === 'thematicBreak')).toBe(true);
    const para = tree.flat.find((t) => t.type === 'paragraph');
    expect(para?.text).toBe('Title');
  });

  it('a paragraph line immediately followed by `---`', () => {
    const tree = md(
      'Shall be removed by the support representative once the issue is closed/released and the customer has been notified accordingly.\n---\n'
    );
    expect(tree.flat.some((t) => t.type === 'setextHeading')).toBe(false);
    expect(tree.flat.some((t) => t.type === 'thematicBreak')).toBe(true);
    const para = tree.flat.find((t) => t.type === 'paragraph');
    expect(para?.text).toBe(
      'Shall be removed by the support representative once the issue is closed/released and the customer has been notified accordingly.'
    );
  });
});

describe('adversarial performance: thousands of unterminated `{%` stay linear', () => {
  // Micromark tries the tag syntax at every `{`. Without the `%}` index in syntax.ts,
  // each try could scan to the end of the file, which is quadratic.
  //
  // These tests compare timings instead of using fixed limits, because machine load varies.
  // The large input is 4x the small one, so linear code gives a ratio near 4 and quadratic
  // code near 16. Each time is the fastest of several runs.
  const RATIO_CEILING = 10;

  // On shared CI runners these timings are too noisy, so they are skipped there
  // unless RECHECK_PERF is set.
  const skipTimingInCI = Boolean(process.env.CI) && !process.env.RECHECK_PERF;

  function minQuadruplingRatio(small: string, large: string, runs = 5): number {
    const time = (source: string) => {
      const started = performance.now();
      parseMarkdown(source, { markdoc: true });
      return performance.now() - started;
    };
    time(small); // warm up
    time(large);
    const smallTimes: number[] = [];
    const largeTimes: number[] = [];
    for (let i = 0; i < runs; i++) {
      smallTimes.push(time(small));
      largeTimes.push(time(large));
    }
    return Math.min(...largeTimes) / Math.max(Math.min(...smallTimes), 0.001);
  }

  it.skipIf(skipTimingInCI)('single-line: 4x the count of bare `{%` costs ~4x, never ~16x', () => {
    expect(minQuadruplingRatio('{%'.repeat(8000), '{%'.repeat(32000))).toBeLessThan(RATIO_CEILING);
  });

  it.skipIf(skipTimingInCI)(
    'multi-line: 4x the count of bare `{%` lines costs ~4x, never ~16x',
    () => {
      expect(minQuadruplingRatio('{%\n'.repeat(4000), '{%\n'.repeat(16000))).toBeLessThan(
        RATIO_CEILING
      );
    }
  );

  it.skipIf(skipTimingInCI)(
    'a document whose only `%}` is unusable for a block tag also stays linear',
    () => {
      // Every attempt finds a `%}`, but it has trailing text, so it can't close a block tag.
      const build = (lines: number) => `${'{%\n'.repeat(lines)}%} trailing\n`;
      expect(minQuadruplingRatio(build(4000), build(16000))).toBeLessThan(RATIO_CEILING);
    }
  );

  it('tens of thousands of real tags parse without throwing', () => {
    // Spreading this many children into `tree.flat` overflows the call stack
    // (it fails between 30,000 and 40,000 tags).
    const tagCount = 45000;
    const source = `${Array.from({ length: tagCount }, (_, i) => `{% tag-${i} %}`).join('\n')}\n`;
    let tree: ReturnType<typeof md> | undefined;
    expect(() => {
      tree = md(source);
    }).not.toThrow();
    expect(tree?.flat.filter((t) => t.type === 'markdocTag')).toHaveLength(tagCount);
    expect(tree?.flat.filter((t) => t.type === 'markdocTagMarker')).toHaveLength(tagCount * 2);
  });
});

// Time limits for large inputs. The limit is generous; it only checks that parsing does not blow
// up.
const ABSOLUTE_CEILING_MS = 2000;

// Skipped on shared CI runners, where timings are too noisy, unless RECHECK_PERF is set.
const SKIP_TIMING_IN_CI = Boolean(process.env.CI) && !process.env.RECHECK_PERF;

describe.skipIf(SKIP_TIMING_IN_CI)('adversarial performance: absolute ceilings', () => {
  it('5,000 unterminated `{%` openers stay well under the ceiling', () => {
    // There is no `%}` in the document, so the `%}` index in syntax.ts must stop each `{%` from
    // scanning to the end.
    const source = `${Array.from(
      { length: 5000 },
      (_, i) => `{% opener-${i} still not closed`
    ).join('\n')}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.some((t) => t.type === 'markdocTag')).toBe(false);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  it('5,000 adjacent tags on one line stay well under the ceiling', () => {
    const source = `${'{% t %}'.repeat(5000)}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.filter((t) => t.type === 'markdocTag')).toHaveLength(5000);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  it('a 100KB single-line span candidate stays well under the ceiling', () => {
    // One huge tag, which tests the string scanning of the span parser.
    const hugeValue = 'x'.repeat(100_000);
    const source = `{% a value="${hugeValue}" %}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    const tag = tree.flat.find((t) => t.type === 'markdocTag');
    expect(tag?.markdocKind).toBe('tag-open');
    expect(tag?.text).toBe(source.trimEnd());
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  it('a 100KB single-line candidate that NEVER closes also stays well under the ceiling', () => {
    // The repeated `%` never forms a `%}`, so the tag is rejected.
    const source = `{% ${'%'.repeat(100_000)}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.some((t) => t.type === 'markdocTag')).toBe(false);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  // Many tiny tags with nothing between them, the kind of input that would expose a scanner that
  // gets stuck.
  it('thousands of minimal empty-bodied tags never stall (zero-width-loop impossibility by construction)', () => {
    const source = `${'{%%}'.repeat(5000)}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.filter((t) => t.type === 'markdocTag')).toHaveLength(5000);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });
});
