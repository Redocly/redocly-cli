import { describe, expect, it } from 'vitest';

import { newLineRe } from '../../core/line-endings.js';
import { parseMarkdown } from '../../parser/index.js';
import { extractScopes } from '../extractor.js';

const extract = (md: string) => extractScopes(parseMarkdown(md), md);

const byScope = (segs: ReturnType<typeof extract>, scope: string) =>
  segs.filter((s) => s.scope === scope);

describe('extractScopes — block scopes', () => {
  it('emits heading segments with level scope and metadata', () => {
    const segs = extract('# One\n\n## Two\n');
    const h1 = byScope(segs, 'heading.h1');
    const h2 = byScope(segs, 'heading.h2');
    expect(h1).toHaveLength(1);
    expect(h1[0].content).toBe('One');
    expect(h1[0].startLine).toBe(1);
    expect(h1[0].metadata?.headingLevel).toBe(1);
    expect(h2[0].content).toBe('Two');
    expect(h2[0].startLine).toBe(3);
  });

  it('emits paragraph segments excluding headings and code', () => {
    const segs = extract('# H\n\nFirst para.\n\n```js\ncode();\n```\n\nSecond para.\n');
    const paras = byScope(segs, 'paragraph');
    expect(paras.map((p) => p.content)).toEqual(['First para.', 'Second para.']);
    expect(paras[0].startLine).toBe(3);
    expect(paras[1].startLine).toBe(9);
  });

  it('emits code segments with language metadata', () => {
    const segs = extract('```ts\nconst x = 1;\n```\n');
    const code = byScope(segs, 'code');
    expect(code).toHaveLength(1);
    expect(code[0].metadata?.codeLanguage).toBe('ts');
    expect(code[0].startLine).toBe(1);
    expect(code[0].endLine).toBe(3);
  });

  it('emits list-item segments with depth', () => {
    const segs = extract('- top\n  - nested\n');
    const items = byScope(segs, 'list-item');
    expect(items.map((i) => i.content)).toEqual(['top', 'nested']);
    expect(items[0].metadata?.listDepth).toBe(1);
    expect(items[1].metadata?.listDepth).toBe(2);
  });

  it('emits blockquote, frontmatter, html and comment segments', () => {
    const md = '---\ntitle: T\n---\n\n> quoted\n\n<div>x</div>\n\n<!-- note -->\n';
    const segs = extract(md);
    expect(byScope(segs, 'frontmatter')).toHaveLength(1);
    expect(byScope(segs, 'blockquote')[0].content).toContain('quoted');
    expect(byScope(segs, 'html')).toHaveLength(1);
    expect(byScope(segs, 'comment')[0].content).toContain('note');
  });

  it('emits table.header and table.cell segments', () => {
    const segs = extract('| a | b |\n| - | - |\n| 1 | 2 |\n');
    expect(byScope(segs, 'table.header').map((s) => s.content)).toEqual(['a', 'b']);
    expect(byScope(segs, 'table.cell').map((s) => s.content)).toEqual(['1', '2']);
  });

  it('classifies setext headings by underline character', () => {
    const segs = extract('Title One\n=========\n\nTitle Two\n---------\n');
    expect(byScope(segs, 'heading.h1').map((s) => s.content)).toEqual(['Title One']);
    expect(byScope(segs, 'heading.h2').map((s) => s.content)).toEqual(['Title Two']);
  });

  it('emits empty content for empty table cells', () => {
    const segs = extract('| a | b |\n| - | - |\n|   | 2 |\n');
    expect(byScope(segs, 'table.cell').map((s) => s.content)).toEqual(['', '2']);
  });

  // Regression: table cell segments set `content` to the cell's
  // trimmed text but took startColumn/endColumn from the FULL cell token
  // (which includes the leading '|' and padding), so scope rules mapping a
  // match index back through segment.startColumn (swap/pattern's
  // toSourceColumn) reported a column LEFT of the real text — and a swap
  // --fix then rewrote the pipe/padding instead of the matched word. Cell
  // segments must anchor on the trimmed content itself.
  describe('table cell segment positions anchor on the trimmed content', () => {
    it('anchors padded header and body cells on their text, not the pipe', () => {
      const segs = extract('| word   | colour |\n| ------ | ------ |\n| padded |  colour here |\n');
      const rows = (scope: string) =>
        byScope(segs, scope).map((s) => [
          s.startLine,
          s.startColumn,
          s.endLine,
          s.endColumn,
          s.content,
        ]);
      expect(rows('table.header')).toEqual([
        [1, 3, 1, 7, 'word'],
        [1, 12, 1, 18, 'colour'],
      ]);
      expect(rows('table.cell')).toEqual([
        [3, 3, 3, 9, 'padded'],
        [3, 13, 3, 24, 'colour here'],
      ]);
    });

    it('anchors an unpadded cell at the character after the pipe', () => {
      const segs = extract('|word|x|\n|-|-|\n|colour|y|\n');
      const cells = byScope(segs, 'table.cell');
      expect(cells.map((s) => [s.startLine, s.startColumn, s.content])).toEqual([
        [3, 2, 'colour'],
        [3, 9, 'y'],
      ]);
    });

    it('counts columns in UTF-16 code units for multi-byte text before the match', () => {
      // '😀' is one astral code point = TWO code units; micromark columns,
      // offsetToLineColumn, and Fix.editColumn all count code units, so the
      // segment start must too: 'a😀b colour' spans columns 3..14 (11 units).
      const segs = extract('| a😀b colour | z |\n| ----------- | - |\n| x | y |\n');
      const headers = byScope(segs, 'table.header');
      expect(headers[0].content).toBe('a😀b colour');
      expect([headers[0].startColumn, headers[0].endColumn]).toEqual([3, 14]);
    });

    it('keeps cell-token positions for empty and whitespace-only cells', () => {
      // No `tableContent` token exists, so there is no text to anchor on;
      // empty content trivially satisfies the alignment invariant at any
      // position, and no swap/pattern match can ever land inside ''.
      const segs = extract('| a | b |\n| - | - |\n|| x |\n|   | y |\n');
      const cells = byScope(segs, 'table.cell');
      expect(cells.map((s) => [s.startLine, s.startColumn, s.content])).toEqual([
        [3, 1, ''],
        [3, 4, 'x'],
        [4, 1, ''],
        [4, 7, 'y'],
      ]);
    });
  });
});

describe('extractScopes — nested code stays out of sentence scope', () => {
  it('excludes a fenced code block inside a blockquote from sentences', () => {
    const md = [
      '> First quoted sentence here.',
      '>',
      '> ```shell',
      '> CODE_ALPHA CODE_BETA CODE_GAMMA',
      '> ```',
      '>',
      '> Second quoted sentence here.',
      '',
    ].join('\n');
    const sentences = byScope(extract(md), 'sentence').map((s) => s.content);
    expect(sentences).toEqual(['First quoted sentence here.', 'Second quoted sentence here.']);
  });

  it('excludes fenced code inside a blockquote inside a list item', () => {
    const md = [
      '- `mountBranchName` - The branch name to mount the API definitions to.',
      '  > NOTE: Extract sensitive data from a secrets manager.',
      '  > The sensitive data can be referred to within other values:',
      '  >',
      '  > ```shell',
      '  > REDOCLY_APIS=CODE_ALPHA CODE_BETA CODE_GAMMA CODE_DELTA',
      '  > ```',
      '',
    ].join('\n');
    const sentences = byScope(extract(md), 'sentence').map((s) => s.content);
    for (const sentence of sentences) {
      expect(sentence).not.toContain('CODE_ALPHA');
      expect(sentence).not.toContain('```');
    }
    expect(sentences).toContain('NOTE: Extract sensitive data from a secrets manager.');
  });
});

// INVARIANT (content/position alignment): scope rules map a match found in
// segment.content back to the source through the segment's start position —
// swap.ts/pattern.ts compute `offsetToLineColumn(segment.content, matchIndex)`
// and then `toSourceColumn`: on content line 1 the source column is
// `startColumn + localColumn - 1`, on every later content line it is the
// local column itself. That arithmetic is only correct when, for every line
// of segment.content, the source text AT that position IS the content line:
//   - content line 1 appears in source line `startLine` starting at column
//     `startColumn`;
//   - content line k (k > 1) appears in source line `startLine + k - 1`
//     starting at column 1.
// Every segment kind must satisfy this, or a rule scoped to it reports
// columns off the real text and --fix edits the wrong bytes (this class of
// bug has now appeared three times: CRLF mapping, list-marker stripping,
// table-cell trimming).
//
// EXEMPTIONS: none, but there are two classes of conforming segment.
//
// (1) Verbatim: `content` is the source slice at the recorded position --
// paragraph, code, blockquote, list-item, frontmatter, html, comment, heading
// via its text token, alt/link via labelText, markdoc.tag, plus the
// trim-adjusted table.header/table.cell anchors and the start-adjusted
// sentence/summary spans.
//
// (2) Positional but masked: under `markdoc: true` a prose segment's `content`
// is the source slice with every markdoc tag span blanked in place. Masking is
// length- and line-preserving, which is what the arithmetic above needs: every
// character outside a blanked tag keeps its offset, line, and column. Such a
// segment carries the verbatim slice as `sourceText` and the blanked spans as
// `maskedRanges`, so the check below has two halves -- `sourceText ?? content`
// must align with the source exactly, and `content` may differ from
// `sourceText` only inside `maskedRanges` and only by being the mask character.
//
// A future semantic (non-positional) segment kind must be exempted HERE with
// a justification showing how rules consume its positions (the way
// semantic-line-breaks re-reads raw source lines itself instead of trusting
// segment content offsets).
const ALIGNMENT_EXEMPT_SCOPES = new Set<string>([]);

const MASK_CHAR = ' ';

function alignmentViolations(md: string, markdoc = false): string[] {
  const sourceLines = md.split(newLineRe);
  const violations: string[] = [];
  const segments = markdoc ? extractScopes(parseMarkdown(md, { markdoc: true }), md) : extract(md);
  for (const segment of segments) {
    if (ALIGNMENT_EXEMPT_SCOPES.has(segment.scope)) continue;
    const sourceView = segment.sourceText ?? segment.content;
    const contentLines = sourceView.split(newLineRe);
    for (let i = 0; i < contentLines.length; i++) {
      const contentLine = contentLines[i];
      const column = i === 0 ? segment.startColumn : 1;
      const sourceLine = sourceLines[segment.startLine - 1 + i] ?? '';
      const actual = sourceLine.slice(column - 1, column - 1 + contentLine.length);
      if (actual !== contentLine) {
        violations.push(
          `${segment.scope} at ${segment.startLine + i}:${column} — ` +
            `content ${JSON.stringify(contentLine)} but source has ${JSON.stringify(actual)}`
        );
      }
    }
    if (segment.sourceText === undefined) continue;
    if (segment.sourceText.length !== segment.content.length) {
      violations.push(`${segment.scope} at ${segment.startLine} — masking changed content length`);
      continue;
    }
    const ranges = segment.maskedRanges ?? [];
    for (let j = 0; j < segment.content.length; j++) {
      if (segment.content[j] === segment.sourceText[j]) continue;
      const inMask = ranges.some((range) => j >= range.start && j < range.end);
      if (!inMask || segment.content[j] !== MASK_CHAR) {
        violations.push(
          `${segment.scope} at ${segment.startLine} — offset ${j} differs from source ` +
            `(${JSON.stringify(segment.content[j])}) outside a declared mask range`
        );
      }
    }
  }
  return violations;
}

describe('extractScopes — content/position alignment invariant', () => {
  const md = [
    '---',
    'title: Alignment fixture',
    '---',
    '',
    '# Heading colour one',
    '',
    'First paragraph sentence. Second sentence with [link text](https://example.com).',
    'A soft-wrapped continuation line. With two sentences.',
    '',
    '> Blockquote first sentence. Blockquote second.',
    '> continued quote line.',
    '',
    '- item one',
    '  - nested item with ![alt text](img.png)',
    '',
    '1. ordered item',
    '',
    '| word   | colour  | héllo wörld |',
    '| ------ | ------- | ----------- |',
    '| padded |  middle | trailing    |',
    '|| x |   |',
    '|no-pad|multi   space|  a😀b end|',
    '',
    'Setext heading text',
    '-------------------',
    '',
    '<div>html block</div>',
    '',
    '<!-- comment text -->',
    '',
    '```js',
    'const fenced = 1;',
    '```',
    '',
    '    indented code line',
    '',
  ].join('\n');

  it('aligns every emitted segment with the source at its recorded position', () => {
    expect(alignmentViolations(md)).toEqual([]);
  });

  // The same invariant with `markdoc: true`, where the prose scopes carry
  // masked content. Every prose shape below holds a tag in a different position
  // — leading, medial, trailing, inside a soft-wrapped line, inside a table
  // cell — because each exercises a different piece of the offset arithmetic.
  const taggedMd = [
    '# Heading colour {% #anchor %} one',
    '',
    'First paragraph {% partial file="x" /%} sentence. Second one.',
    'A soft-wrapped {% partial file="y" /%} continuation line.',
    '',
    '> Blockquote {% x /%} first sentence.',
    '> continued {% y /%} quote line.',
    '',
    '- item one {% z /%} trailing',
    '  - nested {% w /%} item',
    '',
    '| word {% a %} | colour |',
    '| ------------ | ------ |',
    '| {% b %} lead | mid {% c %} dle |',
    '',
    '{% admonition type="info" %}',
    'Inside a block tag.',
    '{% /admonition %}',
    '',
  ].join('\n');

  it('aligns every emitted segment when markdoc masking is on', () => {
    expect(alignmentViolations(taggedMd, true)).toEqual([]);
  });

  it('and that flag-on run really is exercising masked segments, not passing vacuously', () => {
    const masked = extractScopes(parseMarkdown(taggedMd, { markdoc: true }), taggedMd).filter(
      (segment) => segment.sourceText !== undefined
    );
    expect(
      new Set(masked.map((segment) => segment.scope.replace(/^heading\..*/, 'heading')))
    ).toEqual(
      new Set([
        'heading',
        'paragraph',
        'blockquote',
        'list-item',
        'table.header',
        'table.cell',
        'summary',
        'sentence',
      ])
    );
  });

  it('still aligns the same tagged source with the flag off (nothing is masked)', () => {
    expect(alignmentViolations(taggedMd)).toEqual([]);
    for (const segment of extract(taggedMd)) {
      expect(segment.sourceText, `${segment.scope} must not be masked flag-off`).toBeUndefined();
    }
  });
});

describe('extractScopes — inline and derived scopes', () => {
  it('emits alt segments for image alt text', () => {
    const segs = extract('Look at ![a small cat](cat.png) here.\n');
    const alts = byScope(segs, 'alt');
    expect(alts).toHaveLength(1);
    expect(alts[0].content).toBe('a small cat');
    expect(alts[0].startLine).toBe(1);
  });

  it('emits link segments for link text', () => {
    const segs = extract('See [the docs](https://example.com) now.\n');
    const links = byScope(segs, 'link');
    expect(links).toHaveLength(1);
    expect(links[0].content).toBe('the docs');
  });

  // `summary` is the document's prose: every scope kind whose content is
  // human-readable text — paragraphs, list items, blockquotes, headings
  // (all levels), and table header/body cells.
  it('emits summary segments mirroring all prose scope kinds (paragraph, list-item, blockquote, heading, table cells)', () => {
    const segs = extract(
      '# H\n\nBody para.\n\n- item one\n\n> quoted\n\n| head |\n| --- |\n| cell |\n'
    );
    const summary = byScope(segs, 'summary');
    expect(summary.map((s) => s.content)).toEqual([
      'H',
      'Body para.',
      'item one',
      '> quoted',
      'head',
      'cell',
    ]);
  });

  it('summary segments cover every heading level (heading.h1-h6 all map to summary)', () => {
    const segs = extract('# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six\n');
    const summary = byScope(segs, 'summary');
    expect(summary.map((s) => s.content)).toEqual(['One', 'Two', 'Three', 'Four', 'Five', 'Six']);
  });

  it('emits sentence segments with file-accurate line numbers', () => {
    const segs = extract('# H\n\nOne here. Two there.\n');
    const sentences = byScope(segs, 'sentence');
    expect(sentences.map((s) => s.content)).toEqual(['One here.', 'Two there.']);
    expect(sentences[0].startLine).toBe(3);
    expect(sentences[1].startLine).toBe(3);
  });

  // Regression lock: sentence derivation stays sourced from EXACTLY
  // paragraph/list-item/blockquote. `summary` widening to headings/table
  // cells (SUMMARY vs SENTENCE source split) must never leak into the
  // sentence scope — `scope: sentence` rules (e.g. the repo's own
  // oxford-comma) depend on it.
  it('derives no sentence segments from headings or table cells', () => {
    const segs = extract('# One here. Two there.\n\n| Cell one. | Cell two. |\n| --- | --- |\n');
    expect(byScope(segs, 'sentence')).toEqual([]);
  });

  it('computes sentence end positions', () => {
    const segs = extract('# H\n\nOne here. Two there.\n');
    const sentences = byScope(segs, 'sentence');
    expect(sentences[0].startColumn).toBe(1);
    expect(sentences[0].endColumn).toBe(10);
    expect(sentences[1].startColumn).toBe(11);
    expect(sentences[1].endColumn).toBe(21);
    expect(sentences[1].endLine).toBe(3);
  });
});

// Locks the walker's exact segment ordering and positions on a fixture
// covering every scope kind: captured from the original recursive `walk`
// implementation, and must stay byte-identical after the explicit-stack
// (iterative) conversion — pre-order traversal, children in document order,
// derived summary/sentence segments appended in source order.
describe('extractScopes — full segment array on a rich fixture (ordering lock)', () => {
  const md = [
    '---',
    'title: Rich fixture',
    '---',
    '',
    '# Heading one',
    '',
    'First paragraph with [a link](https://example.com) and ![an image](./img.png).',
    '',
    '> Quoted text with *emphasis*.',
    '>',
    '> > Nested quote paragraph.',
    '',
    '- item one',
    '  - nested item with [inner](x.md)',
    '- item two',
    '',
    '1. ordered one',
    '2. ordered two',
    '',
    '```js',
    'const x = 1;',
    '```',
    '',
    '    indented code',
    '',
    '| H1 | H2 |',
    '| -- | -- |',
    '| c1 | c2 |',
    '',
    'Setext heading',
    '--------------',
    '',
    '<div>block html</div>',
    '',
    '<!-- a comment -->',
    '',
    'Last paragraph. Two sentences here.',
    '',
  ].join('\n');

  it('produces the exact segment sequence the recursive walker produced', () => {
    const rows = extract(md).map((s) => [
      s.scope,
      s.startLine,
      s.startColumn,
      s.endLine,
      s.endColumn,
      s.content,
    ]);
    expect(rows).toEqual([
      ['frontmatter', 1, 1, 3, 4, '---\ntitle: Rich fixture\n---'],
      ['heading.h1', 5, 3, 5, 14, 'Heading one'],
      [
        'paragraph',
        7,
        1,
        7,
        79,
        'First paragraph with [a link](https://example.com) and ![an image](./img.png).',
      ],
      ['link', 7, 23, 7, 29, 'a link'],
      ['alt', 7, 58, 7, 66, 'an image'],
      [
        'blockquote',
        9,
        1,
        11,
        28,
        '> Quoted text with *emphasis*.\n>\n> > Nested quote paragraph.',
      ],
      ['blockquote', 11, 3, 11, 28, '> Nested quote paragraph.'],
      ['list-item', 13, 3, 13, 11, 'item one'],
      ['list-item', 14, 5, 14, 35, 'nested item with [inner](x.md)'],
      ['link', 14, 23, 14, 28, 'inner'],
      ['list-item', 15, 3, 15, 11, 'item two'],
      ['list-item', 17, 4, 17, 15, 'ordered one'],
      ['list-item', 18, 4, 18, 15, 'ordered two'],
      ['code', 20, 1, 22, 4, '```js\nconst x = 1;\n```'],
      ['code', 24, 1, 24, 18, '    indented code'],
      // Table cell positions anchor on the trimmed cell text (see the
      // alignment-invariant suite below), not the full cell token — the
      // original recursive walker anchored on the cell token (its leading
      // '|'), which put scope-rule matches left of the real text.
      ['table.header', 26, 3, 26, 5, 'H1'],
      ['table.header', 26, 8, 26, 10, 'H2'],
      ['table.cell', 28, 3, 28, 5, 'c1'],
      ['table.cell', 28, 8, 28, 10, 'c2'],
      ['heading.h2', 30, 1, 30, 15, 'Setext heading'],
      ['html', 33, 1, 33, 22, '<div>block html</div>'],
      ['comment', 35, 1, 35, 19, '<!-- a comment -->'],
      ['paragraph', 37, 1, 37, 36, 'Last paragraph. Two sentences here.'],
      ['summary', 5, 3, 5, 14, 'Heading one'],
      [
        'summary',
        7,
        1,
        7,
        79,
        'First paragraph with [a link](https://example.com) and ![an image](./img.png).',
      ],
      ['summary', 9, 1, 11, 28, '> Quoted text with *emphasis*.\n>\n> > Nested quote paragraph.'],
      ['summary', 11, 3, 11, 28, '> Nested quote paragraph.'],
      ['summary', 13, 3, 13, 11, 'item one'],
      ['summary', 14, 5, 14, 35, 'nested item with [inner](x.md)'],
      ['summary', 15, 3, 15, 11, 'item two'],
      ['summary', 17, 4, 17, 15, 'ordered one'],
      ['summary', 18, 4, 18, 15, 'ordered two'],
      ['summary', 26, 3, 26, 5, 'H1'],
      ['summary', 26, 8, 26, 10, 'H2'],
      ['summary', 28, 3, 28, 5, 'c1'],
      ['summary', 28, 8, 28, 10, 'c2'],
      ['summary', 30, 1, 30, 15, 'Setext heading'],
      ['summary', 37, 1, 37, 36, 'Last paragraph. Two sentences here.'],
      [
        'sentence',
        7,
        1,
        7,
        79,
        'First paragraph with [a link](https://example.com) and ![an image](./img.png).',
      ],
      ['sentence', 9, 3, 9, 31, 'Quoted text with *emphasis*.'],
      ['sentence', 11, 5, 11, 28, 'Nested quote paragraph.'],
      ['sentence', 11, 5, 11, 28, 'Nested quote paragraph.'],
      ['sentence', 13, 3, 13, 11, 'item one'],
      ['sentence', 14, 5, 14, 35, 'nested item with [inner](x.md)'],
      ['sentence', 15, 3, 15, 11, 'item two'],
      ['sentence', 17, 4, 17, 15, 'ordered one'],
      ['sentence', 18, 4, 18, 15, 'ordered two'],
      ['sentence', 37, 1, 37, 16, 'Last paragraph.'],
      ['sentence', 37, 17, 37, 36, 'Two sentences here.'],
    ]);
  });
});

// Hardening: `walk` was call-stack recursive, so deeply nested input
// (micromark parses 10,000 nested blockquotes in well under 100ms, and
// survives 100,000+) blew the stack inside extractScopes long before
// micromark's own limits. The walker must be iterative.
describe('extractScopes — deeply nested input does not overflow the stack', () => {
  it('handles 10,000 nested blockquotes', () => {
    const md = '>'.repeat(10_000) + ' text\n';
    const segs = extract(md);
    expect(byScope(segs, 'blockquote')).toHaveLength(10_000);
  });
});

// Regression: the sentence position mapping split segment content
// with a bare '\n' (and measured the last piece's length for the column),
// so on a CR-only file a soft-wrapped paragraph's second sentence stayed on
// startLine 1 with a column counted straight through the '\r'. Sentence
// positions must be identical across LF / CRLF / CR twins.
describe('extractScopes — sentence positions across line endings', () => {
  for (const [label, ending] of [
    ['LF', '\n'],
    ['CRLF', '\r\n'],
    ['CR', '\r'],
  ] as const) {
    it(`maps a soft-wrapped paragraph's sentences identically on a ${label} file`, () => {
      const segs = extract(`First sentence here.${ending}Second one there.${ending}`);
      const sentences = byScope(segs, 'sentence');
      expect(sentences.map((s) => s.content)).toEqual([
        'First sentence here.',
        'Second one there.',
      ]);
      expect(sentences.map((s) => [s.startLine, s.startColumn])).toEqual([
        [1, 1],
        [2, 1],
      ]);
      expect(sentences.map((s) => [s.endLine, s.endColumn])).toEqual([
        [1, 21],
        [2, 18],
      ]);
    });
  }
});
