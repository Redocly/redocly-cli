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
    // The tokenizer only recognizes the `{%` / `%}` boundaries. The interior
    // fails to parse here, and that is pinned as 'malformed' rather than
    // throwing or keeping a partial name.
    const tag = types('{% img =broken %}\n')[0];
    expect(tag.markdocKind).toBe('malformed');
    expect(tag.children.some((c) => c.type === 'markdocTagName')).toBe(false);
    expect(tag.children.some((c) => c.type === 'markdocAttribute')).toBe(false);
    // Markers survive a failed interior parse because they come from the raw
    // text's fixed-width delimiters. The filter is needed because micromark's
    // own children coexist untouched in the same array.
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
    // Positions are real, not both collapsed onto the tag's own start.
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

  // A multi-line token's text is sliced by absolute document offsets, so a
  // blockquote's literal `> ` continuation prefixes land inside the token
  // text, where they read as attribute garbage and classify the whole span
  // 'malformed'. This affects any multi-line construct, not just markdocTag,
  // and predates markdoc support. List items are unaffected: their
  // continuation is plain indentation, which is invisible here.
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
  // HTML comments are opaque to every sibling construct, markdoc included.
  // In block position the parser's htmlFlow reparse skips comments entirely
  // and never adds markdoc syntax; inline, micromark's htmlText construct
  // consumes the whole comment as one atomic run.
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
    // The tag is a real positioned token, not a same-length mask, so the
    // trailing data starts exactly where the tag ends.
    const tag = types(source)[0];
    expect(after?.startColumn).toBe(tag.endColumn);
  });
});

describe('long tags: no scan-length ceiling', () => {
  // Any fixed per-attempt scan cap would silently detokenize a long tag. The
  // sizes below are modelled on the largest tags in this repo's docs (a
  // 317-character single-line one, a 1,895-character multi-line one) but are
  // synthesized, so editing the docs cannot move the goalposts.
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
  // The token's text must always end with a literal `%}`: the span parser
  // gates on exactly that, and the close marker is sliced off the last two
  // characters. A token carrying `"...%} "` would classify malformed and
  // emit a `"} "` marker child.
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
      // Flow, not inline: a block tag is a top-level sibling of the tree,
      // never nested inside a paragraph.
      expect(tree.children.some((t) => t.type === 'markdocTag')).toBe(true);
    });
  }
});

// Markdoc's own tokenizer disables indented code unconditionally, so a
// 4-space-indented tag line is a tag when Realm compiles it and indented
// prose is a paragraph -- never a code block. Without matching that, an
// indented opener never tokenizes and its less-indented close orphans.
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

// Markdoc's tokenizer disables setext underlines unconditionally too, so
// setext headings do not exist in Markdoc at all -- Realm renders a would-be
// setext heading as ordinary paragraph text.
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
  // Micromark retries the construct at every `{`, and a retry that only gives
  // up at line-end/EOF has by then rescanned everything from its own start --
  // O(n^2) unless hopeless candidates are rejected up front, which is what
  // the `%}` index in syntax.ts is for.
  //
  // These assert RATIOS, never absolute milliseconds: under parallel vitest
  // workers the machine is contended and any wall-clock ceiling is a coin
  // flip. Two choices keep the ratio itself stable enough for CI:
  //
  //   1. The large input is 4x the small one, so a linear parser lands near a
  //      ratio of 4 and a quadratic one near 16. A ceiling of 10 sits clear
  //      of both; tighter ceilings were seen to flake under machine load.
  //   2. Each side's time is the MINIMUM over several runs. Scheduler noise
  //      can only inflate a CPU-bound measurement, never deflate it, so the
  //      min is the best estimator of the true cost.
  const RATIO_CEILING = 10;

  // Even the min-of-runs estimator fails on runner load in the contended PR
  // pipeline (12 test processes on 8 cores). The ratio tests run on every
  // local `pnpm test` and, uncontended, in the nightly recheck-perf
  // workflow (RECHECK_PERF=1). The call-stack test below stays gating: it
  // asserts behavior, not time.
  const skipTimingInCI = Boolean(process.env.CI) && !process.env.RECHECK_PERF;

  function minQuadruplingRatio(small: string, large: string, runs = 5): number {
    const time = (source: string) => {
      const started = performance.now();
      parseMarkdown(source, { markdoc: true });
      return performance.now() - started;
    };
    time(small); // warm the JIT so the first run isn't an outlier
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
      // Every block attempt reaches a real `%}`, so "is there a close at all"
      // is not enough to reject these: the index has to know that this close is
      // unusable in block position because it has trailing content.
      const build = (lines: number) => `${'{%\n'.repeat(lines)}%} trailing\n`;
      expect(minQuadruplingRatio(build(4000), build(16000))).toBeLessThan(RATIO_CEILING);
    }
  );

  it('tens of thousands of real tags parse without throwing', () => {
    // Pushing the synthesized children onto `tree.flat` with a spread blows
    // the call stack. This count sits past where that starts failing (a
    // spread push survives 30,000 tags and dies at 40,000), so the test
    // really reproduces the crash rather than just being big.
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
