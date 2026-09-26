import { describe, expect, it } from 'vitest';

import { newLineRe } from '../../core/line-endings.js';
import { parseMarkdown } from '../../parser/index.js';
import { extractScopes, SUMMARY_BLOCK_SOURCES } from '../extractor.js';
import { compileSelector } from '../selector.js';
import { isKnownScopeTerm } from '../vocabulary.js';

const extractOn = (md: string) => extractScopes(parseMarkdown(md, { markdoc: true }), md);
const extractOff = (md: string) => extractScopes(parseMarkdown(md), md);
const byScope = (segs: ReturnType<typeof extractOn>, scope: string) =>
  segs.filter((s) => s.scope === scope);

describe('markdoc.tag scope', () => {
  it('is a recognized scope term the selector can compile', () => {
    expect(isKnownScopeTerm('markdoc.tag')).toBe(true);
    expect(compileSelector('markdoc.tag')).not.toBeNull();
  });

  it('yields one segment per tag, with exact text and real positions', () => {
    const open = '{% admonition type="info" %}';
    const close = '{% /admonition %}';
    const md = `${open}\nBe careful.\n${close}\n`;
    const tags = byScope(extractOn(md), 'markdoc.tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].content).toBe(open);
    expect([tags[0].startLine, tags[0].startColumn, tags[0].endLine, tags[0].endColumn]).toEqual([
      1,
      1,
      1,
      1 + open.length,
    ]);
    expect(tags[1].content).toBe(close);
    expect([tags[1].startLine, tags[1].startColumn, tags[1].endLine, tags[1].endColumn]).toEqual([
      3,
      1,
      3,
      1 + close.length,
    ]);
  });

  it('covers an inline (same-line) tag too, not just block tags', () => {
    const md = 'Inline {% partial file="x.md" /%} tag.\n';
    const tags = byScope(extractOn(md), 'markdoc.tag');
    expect(tags).toHaveLength(1);
    expect(tags[0].content).toBe('{% partial file="x.md" /%}');
    expect(tags[0].startColumn).toBe(8);
  });

  it('includes malformed spans — a pattern rule may target those too', () => {
    const md = '{% img =broken %}\n';
    const tags = byScope(extractOn(md), 'markdoc.tag');
    expect(tags).toHaveLength(1);
    expect(tags[0].content).toBe('{% img =broken %}');
  });

  it('reaches a tag nested inside a table cell, even though tableRow stops the main walk there', () => {
    const md = '| a | b |\n| - | - |\n| {% x %} y | z |\n';
    const tags = byScope(extractOn(md), 'markdoc.tag');
    expect(tags).toHaveLength(1);
    expect(tags[0].content).toBe('{% x %}');
  });

  it('yields zero segments when the markdoc flag is off (no markdocTag tokens exist)', () => {
    const md = '{% admonition %}\nx\n{% /admonition %}\n';
    expect(byScope(extractOff(md), 'markdoc.tag')).toEqual([]);
  });
});

describe('prose scopes structurally exclude markdoc tags', () => {
  it('block tag: paragraph/summary/sentence contain exactly the prose, no marker text', () => {
    const md = '{% admonition %}\nBe careful.\n{% /admonition %}\n';
    const segs = extractOn(md);
    expect(byScope(segs, 'paragraph').map((s) => s.content)).toEqual(['Be careful.']);
    expect(byScope(segs, 'summary').map((s) => s.content)).toEqual(['Be careful.']);
    expect(byScope(segs, 'sentence').map((s) => s.content)).toEqual(['Be careful.']);
  });

  it('inline tag: paragraph/summary/sentence blank the tag span instead of carrying its text', () => {
    const tagText = '{% partial file="x" /%}';
    const md = `Alpha ${tagText} beta gamma.\n`;
    const segs = extractOn(md);
    const expectedContent = `Alpha ${' '.repeat(tagText.length)} beta gamma.`;
    expect(byScope(segs, 'paragraph')[0].content).toBe(expectedContent);
    expect(byScope(segs, 'summary')[0].content).toBe(expectedContent);
    expect(byScope(segs, 'sentence')[0].content).toBe(expectedContent);
    // Blanked, not shortened: content length still matches the source slice,
    // so every later position in the segment stays aligned with the source.
    expect(expectedContent).toHaveLength(md.length - 1); // -1 for the trailing \n
    expect(byScope(segs, 'paragraph')[0].content).not.toContain('{%');
  });

  // A rule reporting "word N of the sentence" must name the same word whether
  // or not an inline tag precedes it: the tag holds position in the segment
  // without ever being read as prose.
  it('position stability: words/positions around an inline tag match the same sentence with an equal-width placeholder', () => {
    const tagText = '{% partial file="x" /%}';
    const tagged = `Alpha ${tagText} beta gamma.\n`;
    const placeholder = `Alpha ${' '.repeat(tagText.length)} beta gamma.\n`;

    const taggedSentence = byScope(extractOn(tagged), 'sentence')[0];
    const placeholderSentence = byScope(extractOff(placeholder), 'sentence')[0];

    expect(taggedSentence.content).toBe(placeholderSentence.content);
    expect(taggedSentence.content.split(/\s+/).filter(Boolean)).toEqual([
      'Alpha',
      'beta',
      'gamma.',
    ]);
    expect([taggedSentence.startLine, taggedSentence.startColumn]).toEqual([
      placeholderSentence.startLine,
      placeholderSentence.startColumn,
    ]);
    expect([taggedSentence.endLine, taggedSentence.endColumn]).toEqual([
      placeholderSentence.endLine,
      placeholderSentence.endColumn,
    ]);
    expect(taggedSentence.content.indexOf('beta')).toBe(
      placeholderSentence.content.indexOf('beta')
    );
    expect(taggedSentence.content.indexOf('gamma')).toBe(
      placeholderSentence.content.indexOf('gamma')
    );
  });

  it('table.cell content with an inline tag excludes the tag text the same way', () => {
    const md = '| a | b |\n| - | - |\n| {% x %} y | z |\n';
    const cells = byScope(extractOn(md), 'table.cell');
    expect(cells.map((s) => s.content)).toEqual(['y', 'z']);
    // 'y' still anchors on its own true column: masking then trimming folds the
    // blanked tag into the leading-trim count, exactly like real padding.
    const y = cells[0];
    expect(md.split(newLineRe)[y.startLine - 1].slice(y.startColumn - 1, y.endColumn - 1)).toBe(
      'y'
    );
  });

  it('table.cell with the tag in the middle keeps real text on both sides blanked-but-positioned', () => {
    const tagText = '{% x %}';
    const md = `| a |\n| - |\n| left ${tagText} right |\n`;
    const cells = byScope(extractOn(md), 'table.cell');
    expect(cells).toHaveLength(1);
    expect(cells[0].content).toBe(`left ${' '.repeat(tagText.length)} right`);
    expect(cells[0].content).not.toContain('{%');
  });

  it('heading: an annotation-kind tag attached to the heading text is excluded from heading.hN and summary', () => {
    const md = '# Head {% #main %}\n';
    const segs = extractOn(md);
    const heading = byScope(segs, 'heading.h1')[0];
    expect(heading.content.trim()).toBe('Head');
    expect(heading.content).not.toContain('{%');
    expect(byScope(segs, 'summary')[0].content).toBe(heading.content);
  });

  it('flag off: byte-identical to today for the same content minus the tag syntax (regression guard)', () => {
    const md = 'Alpha {% partial file="x" /%} beta gamma.\n';
    const segs = extractOff(md);
    // With the flag off there are no markdocTag tokens, so the tag syntax reads
    // as ordinary text and nothing is masked.
    expect(byScope(segs, 'paragraph')[0].content).toBe(md.trimEnd());
    expect(byScope(segs, 'markdoc.tag')).toEqual([]);
  });
});

// Masking is applied in one place, so this enumerates the extractor's own
// definition of prose — SUMMARY_BLOCK_SOURCES plus the heading levels — and
// demands a fixture for every member. Adding a prose scope without masking it
// fails here rather than shipping a scope that leaks tag syntax into summaries.
describe('every prose scope masks (enumerated from the extractor itself)', () => {
  const FIXTURES: Record<string, string> = {
    paragraph: 'alpha {% x /%} beta.\n',
    'list-item': '- item {% x /%} text\n',
    blockquote: '> quoted {% x /%} text\n',
    'table.header': '| head {% x %} er |\n| ---- |\n| body |\n',
    'table.cell': '| head |\n| ---- |\n| body {% x %} cell |\n',
    'heading.h1': '# head {% #a %} text\n',
    'heading.h2': '## head {% #a %} text\n',
    'heading.h3': '### head {% #a %} text\n',
    'heading.h4': '#### head {% #a %} text\n',
    'heading.h5': '##### head {% #a %} text\n',
    'heading.h6': '###### head {% #a %} text\n',
  };
  const PROSE_SCOPES = [
    ...SUMMARY_BLOCK_SOURCES,
    ...[1, 2, 3, 4, 5, 6].map((level) => `heading.h${level}`),
  ];

  it('has a fixture for every prose scope the extractor emits', () => {
    expect(PROSE_SCOPES.filter((scope) => FIXTURES[scope] === undefined)).toEqual([]);
  });

  for (const scope of PROSE_SCOPES) {
    it(`${scope} blanks the tag and records it`, () => {
      const md = FIXTURES[scope];
      const segment = byScope(extractOn(md), scope)[0];
      if (segment === undefined) throw new Error(`no ${scope} segment produced`);
      expect(segment.content).not.toContain('{%');
      expect(segment.content).not.toContain('%}');
      // Masked, not shortened, and the verbatim slice is carried alongside.
      expect(segment.sourceText).toBeDefined();
      expect(segment.sourceText).toContain('{%');
      expect(segment.sourceText?.length).toBe(segment.content.length);
      expect(segment.maskedRanges?.length).toBeGreaterThan(0);
    });
  }

  it('the derived scopes inherit masking from their sources', () => {
    const segs = extractOn('alpha {% x /%} beta.\n');
    for (const scope of ['summary', 'sentence']) {
      const segment = byScope(segs, scope)[0];
      expect(segment.content).not.toContain('{%');
      expect(segment.sourceText).toContain('{%');
      expect(segment.sourceText?.length).toBe(segment.content.length);
    }
  });
});

// `alt` and `link` are deliberate exceptions to masking. Pinned in both
// directions so the decision has to be re-made rather than drifted into.
describe('alt and link labels are deliberately NOT masked', () => {
  it('keeps a tag verbatim inside link text', () => {
    const segment = byScope(extractOn('[label {% x /%} more](https://e.com)\n'), 'link')[0];
    expect(segment.content).toBe('label {% x /%} more');
    expect(segment.sourceText).toBeUndefined();
    expect(segment.maskedRanges).toBeUndefined();
  });

  it('keeps a tag verbatim inside image alt text', () => {
    const segment = byScope(extractOn('![label {% x /%} more](i.png)\n'), 'alt')[0];
    expect(segment.content).toBe('label {% x /%} more');
    expect(segment.sourceText).toBeUndefined();
  });

  it('neither reaches summary, so no tag syntax leaks into the prose view', () => {
    const segs = extractOn('![label {% x /%} more](i.png)\n');
    for (const summary of byScope(segs, 'summary')) {
      expect(summary.content).not.toContain('{%');
    }
  });
});

// A prose segment whose whole text was a tag carries no prose at all. It used
// to be emitted inconsistently — a table cell trimmed itself to '' while a
// heading kept a run of blanks — and either way downstream rules were handed an
// empty segment whose `length` counted the invisible tag's characters.
describe('a segment masking leaves proseless is not emitted', () => {
  it('drops a heading that is nothing but a tag', () => {
    const segs = extractOn('# {% #anchor %}\n');
    expect(byScope(segs, 'heading.h1')).toEqual([]);
    expect(byScope(segs, 'summary')).toEqual([]);
    // The tag is still reachable: markdoc.tag is sourced from the token list,
    // not from the prose walk.
    expect(byScope(segs, 'markdoc.tag').map((s) => s.content)).toEqual(['{% #anchor %}']);
  });

  it('drops a table cell that is nothing but a tag, and a list item likewise', () => {
    const cells = extractOn('| a |\n| - |\n| {% x %} |\n');
    expect(byScope(cells, 'table.cell')).toEqual([]);
    expect(byScope(cells, 'table.header').map((s) => s.content)).toEqual(['a']);

    const items = extractOn('- {% x /%}\n- real item\n');
    expect(byScope(items, 'list-item').map((s) => s.content)).toEqual(['real item']);
  });

  it('produces no sentence segment for proseless prose', () => {
    expect(byScope(extractOn('- {% x /%}\n'), 'sentence')).toEqual([]);
  });

  it('still emits genuinely empty cells, which masking had nothing to do with', () => {
    // Suppression is gated on masking having happened, so an `||` cell keeps
    // the '' segment it has always produced.
    const segs = extractOn('| a | b |\n| - | - |\n|| x |\n');
    expect(byScope(segs, 'table.cell').map((s) => s.content)).toEqual(['', 'x']);
  });
});

// `lineColumnToOffset` has a multi-line branch — walking line endings to find
// the offset of a later line — that a single-line container never reaches.
describe('masking a tag on a later line of a multi-line container', () => {
  const maskOf = (md: string, scope: string) => byScope(extractOn(md), scope)[0];

  it('masks a tag on line 2 of a three-line paragraph, in place', () => {
    const md = 'first line here\nsecond {% x /%} line\nthird line here\n';
    const segment = maskOf(md, 'paragraph');
    expect(segment.content).toBe('first line here\nsecond          line\nthird line here');
    expect(segment.sourceText).toBe(md.trimEnd());
    expect(segment.maskedRanges).toEqual([{ start: 23, end: 31 }]);
  });

  it('masks a tag on line 3 of a four-line paragraph', () => {
    const md = 'one\ntwo\nthree {% xy /%} here\nfour\n';
    const segment = maskOf(md, 'paragraph');
    expect(segment.content).toBe('one\ntwo\nthree           here\nfour');
    expect(segment.content.split('\n')[2]).toBe('three           here');
  });

  it('masks a tag on a later line of a CRLF paragraph', () => {
    const md = 'first line here\r\nsecond {% x /%} line\r\nthird line here\r\n';
    const segment = maskOf(md, 'paragraph');
    expect(segment.content.split(newLineRe)[1]).toBe('second          line');
    expect(segment.content).not.toContain('{%');
    // Same offsets as the LF twin: '\r\n' is one line ending to newLineRe,
    // but two characters in the slice, so the range shifts by exactly one.
    expect(segment.maskedRanges).toEqual([{ start: 24, end: 32 }]);
  });

  it('masks a tag on a later line of a blockquote', () => {
    const md = '> quoted first line\n> second {% x /%} line\n';
    const segment = maskOf(md, 'blockquote');
    expect(segment.content).toBe('> quoted first line\n> second          line');
    expect(segment.content).not.toContain('{%');
  });

  it('positions surrounding words identically to an equal-width placeholder', () => {
    // Position stability again, but on a later line, where the offset comes
    // from the multi-line branch rather than plain column arithmetic.
    const tag = '{% x /%}';
    const tagged = `first line\nsecond ${tag} word\n`;
    const placeholder = `first line\nsecond ${' '.repeat(tag.length)} word\n`;
    const taggedPara = maskOf(tagged, 'paragraph');
    const plainPara = byScope(extractOff(placeholder), 'paragraph')[0];
    expect(taggedPara.content).toBe(plainPara.content);
    expect(taggedPara.content.indexOf('word')).toBe(plainPara.content.indexOf('word'));
  });
});

describe('markdoc.tag segment sourcing', () => {
  it('is ordered by source position across nesting levels', () => {
    const md = '# H {% #a %}\n\nPara {% b /%} text.\n\n| c |\n| - |\n| {% d %} e |\n';
    const tags = byScope(extractOn(md), 'markdoc.tag');
    expect(tags.map((s) => [s.startLine, s.startColumn])).toEqual([
      [1, 5],
      [3, 6],
      [7, 3],
    ]);
  });

  it('a tag written inside an HTML block produces no markdoc.tag segment today', () => {
    // `reparseHtmlFlow` re-tokenizes an htmlFlow block's own text without the
    // Markdoc syntax extension, so a `{% ... %}` span written inside a block
    // HTML region never becomes a `markdocTag` token at all. Pinning that here
    // means the assertion breaks if it ever starts recognizing them, forcing a
    // decision about whether `markdoc.tag` should include them.
    const segs = extractOn('<div>x {% a /%} y</div>\n');
    expect(byScope(segs, 'markdoc.tag')).toEqual([]);
  });
});
