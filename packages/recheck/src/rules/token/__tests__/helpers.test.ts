import { describe, expect, it } from 'vitest';

import { parseMarkdown, filterByTypes } from '../../../parser/index.js';
import {
  addRangeToSet,
  clearHtmlCommentText,
  filterByPredicate,
  frontMatterHasTitle,
  getBlockQuotePrefixText,
  getDescendantsByType,
  getHeadingLevel,
  getHeadingText,
  getParentOfType,
  isBlankLine,
} from '../helpers.js';

describe('filterByPredicate', () => {
  it('collects all tokens matching a predicate, depth-first', () => {
    const tree = parseMarkdown('# Title\n\nBody *em* text\n');
    const dataTokens = filterByPredicate(tree, (token) => token.type === 'data');
    expect(dataTokens.map((t) => t.text)).toEqual(['Title', 'Body ', 'em', ' text']);
  });

  it('returns an empty array when nothing matches', () => {
    const tree = parseMarkdown('# Title\n');
    expect(filterByPredicate(tree, (token) => token.type === 'table')).toEqual([]);
  });

  it('descends into nested children (blockquote inside list)', () => {
    const tree = parseMarkdown('- > quoted\n');
    const markers = filterByPredicate(tree, (token) => token.type === 'blockQuoteMarker');
    expect(markers).toHaveLength(1);
    expect(markers[0].text).toBe('>');
  });
});

describe('getDescendantsByType', () => {
  it('finds direct children by type', () => {
    const tree = parseMarkdown('# Title\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    const sequences = getDescendantsByType(heading, ['atxHeadingSequence']);
    expect(sequences).toHaveLength(1);
    expect(sequences[0].text).toBe('#');
  });

  it('walks a multi-level type path to nested descendants', () => {
    const tree = parseMarkdown('# Title\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    const data = getDescendantsByType(heading, ['atxHeadingText', 'data']);
    expect(data.map((t) => t.text)).toEqual(['Title']);
  });

  it('returns an empty array when the path does not match', () => {
    const tree = parseMarkdown('# Title\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(getDescendantsByType(heading, ['setextHeadingText'])).toEqual([]);
  });
});

describe('getParentOfType', () => {
  it('finds the nearest ancestor of one of the given types', () => {
    const tree = parseMarkdown('> # Heading\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    const parent = getParentOfType(heading, ['blockQuote']);
    expect(parent?.type).toBe('blockQuote');
  });

  it('looks past intermediate ancestors that do not match', () => {
    const tree = parseMarkdown('- > quoted text\n');
    const [data] = filterByTypes(tree, ['data']);
    // data -> paragraph -> content -> blockQuote -> content -> listItem -> listUnordered
    const parent = getParentOfType(data, ['listUnordered']);
    expect(parent?.type).toBe('listUnordered');
  });

  it('returns null when no ancestor matches', () => {
    const tree = parseMarkdown('# Heading\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(getParentOfType(heading, ['blockQuote'])).toBeNull();
  });
});

describe('getHeadingLevel', () => {
  it('reads atx heading level from the sequence length', () => {
    const tree = parseMarkdown('### Title\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(getHeadingLevel(heading)).toBe(3);
  });

  it('caps atx heading level at 6', () => {
    const tree = parseMarkdown('###### Title\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(getHeadingLevel(heading)).toBe(6);
  });

  it('reads setext "=" underline as level 1', () => {
    const tree = parseMarkdown('Title\n=====\n');
    const [heading] = filterByTypes(tree, ['setextHeading']);
    expect(getHeadingLevel(heading)).toBe(1);
  });

  it('reads setext "-" underline as level 2', () => {
    const tree = parseMarkdown('Title\n-----\n');
    const [heading] = filterByTypes(tree, ['setextHeading']);
    expect(getHeadingLevel(heading)).toBe(2);
  });
});

describe('getHeadingText', () => {
  it('extracts plain atx heading text', () => {
    const tree = parseMarkdown('# Title\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(getHeadingText(heading)).toBe('Title');
  });

  it('extracts atx heading text across inline formatting, keeping markers (upstream only strips htmlText)', () => {
    const tree = parseMarkdown('# Title *em* text\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    // getHeadingText joins the raw .text of each non-htmlText child of
    // atxHeadingText; it does not recursively strip inline emphasis
    // markers, matching upstream's behavior exactly (verified against
    // markdownlint's micromark-helpers.cjs getHeadingText).
    expect(getHeadingText(heading)).toBe('Title *em* text');
  });

  it('extracts setext heading text', () => {
    const tree = parseMarkdown('Title\n=====\n');
    const [heading] = filterByTypes(tree, ['setextHeading']);
    expect(getHeadingText(heading)).toBe('Title');
  });

  it('collapses internal newlines in a multi-line setext heading to spaces', () => {
    const tree = parseMarkdown('Title\ncontinued\n=====\n');
    const [heading] = filterByTypes(tree, ['setextHeading']);
    expect(getHeadingText(heading)).toBe('Title continued');
  });
});

describe('addRangeToSet', () => {
  it('adds an inclusive range of numbers', () => {
    const set = new Set<number>();
    addRangeToSet(set, 2, 5);
    expect([...set]).toEqual([2, 3, 4, 5]);
  });

  it('adds a single number when start equals end', () => {
    const set = new Set<number>();
    addRangeToSet(set, 4, 4);
    expect([...set]).toEqual([4]);
  });

  it('merges into a pre-populated set without duplicating', () => {
    const set = new Set<number>([1, 3]);
    addRangeToSet(set, 2, 3);
    expect([...set].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});

describe('getBlockQuotePrefixText', () => {
  it('returns the "> " prefix text for a line inside a blockquote', () => {
    const tree = parseMarkdown('> a\n> b\n> c\n');
    expect(getBlockQuotePrefixText(tree, 2)).toBe('>\n');
  });

  it('returns just a newline for a line outside any blockquote (upstream always appends "\\n")', () => {
    const tree = parseMarkdown('a\nb\n');
    // No blockQuotePrefix/linePrefix tokens on line 1, so the joined prefix
    // text is '' — but upstream unconditionally concats '\n' afterward, so
    // the result is a bare newline rather than an empty string.
    expect(getBlockQuotePrefixText(tree, 1)).toBe('\n');
  });

  it('repeats the prefix text `count` times', () => {
    const tree = parseMarkdown('> a\n> b\n> c\n');
    expect(getBlockQuotePrefixText(tree, 2, 2)).toBe('>\n>\n');
  });
});

describe('isBlankLine', () => {
  it('treats the empty string as blank', () => {
    expect(isBlankLine('')).toBe(true);
  });

  it('treats a whitespace-only line as blank', () => {
    expect(isBlankLine('  ')).toBe(true);
  });

  it('treats a bare blockquote marker line as blank', () => {
    expect(isBlankLine('> ')).toBe(true);
  });

  it('treats a blockquote line with content as not blank', () => {
    expect(isBlankLine('>  x')).toBe(false);
  });

  it('treats a line with visible text as not blank', () => {
    expect(isBlankLine('text')).toBe(false);
  });
});

describe('clearHtmlCommentText', () => {
  // Task 12: found via the differential parity harness against
  // markdownlint on mdn-content -- MD009/no-trailing-spaces and
  // MD012/no-multiple-blanks were flagging trailing whitespace and blank
  // lines INSIDE an HTML comment block (e.g. embedded Mermaid diagram
  // source), which upstream never sees because it clears comment content
  // before any line-based rule scans `params.lines`.

  it('replaces comment content characters with the safe "." character, preserving spaces and length', () => {
    const input = '<!-- hello world -->';
    const cleared = clearHtmlCommentText(input);
    // Non-space, non-CRLF characters become '.'; plain (non-trailing)
    // spaces are left as real spaces.
    expect(cleared).toBe('<!-- ..... ..... -->');
    expect(cleared.length).toBe(input.length);
  });

  it('preserves plain (non-trailing) spaces but clears trailing-space-before-newline runs', () => {
    const input = '<!--\n   \nreal content\n-->';
    const cleared = clearHtmlCommentText(input);
    // Every space immediately before a newline is itself replaced (not
    // just the non-space characters), eliminating it as "trailing
    // whitespace" for line-scanning rules like MD009.
    expect(cleared).not.toMatch(/ +\n/);
    expect(cleared.split('\n')[1]).toBe('...');
  });

  it('never removes or inserts characters, and never touches newlines (line/column positions stay identical)', () => {
    const input = 'before\n<!--\nline with tabs\t\there\n-->\nafter\n';
    const cleared = clearHtmlCommentText(input);
    expect(cleared.length).toBe(input.length);
    expect(cleared.split('\n').length).toBe(input.split('\n').length);
    expect(cleared.split('\n')[0]).toBe('before');
    expect(cleared.split('\n')[4]).toBe('after');
  });

  it('leaves an unterminated comment untouched', () => {
    const input = '<!-- never closed';
    expect(clearHtmlCommentText(input)).toBe(input);
  });

  it('leaves an invalid CommonMark comment (body contains --) untouched when inline (not block)', () => {
    const input = 'text <!--a--b--> more';
    expect(clearHtmlCommentText(input)).toBe(input);
  });

  it('clears a block-level comment even when its body would otherwise look invalid', () => {
    // isBlock (comment is alone on its line, nothing but whitespace
    // precedes it) always wins over the >/->/-- validity checks.
    const input = '\n<!-- >still cleared -- as a block -->\n';
    const cleared = clearHtmlCommentText(input);
    expect(cleared).not.toContain('still cleared');
  });

  it('leaves an empty comment untouched (nothing to clear)', () => {
    const input = '<!---->';
    expect(clearHtmlCommentText(input)).toBe(input);
  });
});

describe('frontMatterHasTitle', () => {
  const defaultPattern = '^\\s*"?title"?\\s*[:=]';

  it('matches an unquoted YAML title key', () => {
    const tree = parseMarkdown('---\ntitle: My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, defaultPattern)).toBe(true);
  });

  it('matches a double-quoted title key', () => {
    const tree = parseMarkdown('---\n"title": My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, defaultPattern)).toBe(true);
  });

  it('matches a TOML-style `=` separator', () => {
    const tree = parseMarkdown('---\ntitle = "My Document"\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, defaultPattern)).toBe(true);
  });

  it('matches a title key on a later front matter line, case-insensitively', () => {
    const tree = parseMarkdown('---\nauthor: A\nTitle: My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, defaultPattern)).toBe(true);
  });

  it('returns false when front matter has no title key', () => {
    const tree = parseMarkdown('---\nauthor: A\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, defaultPattern)).toBe(false);
  });

  it('returns false when the document has no front matter', () => {
    const tree = parseMarkdown('# Heading\n\ntitle: not front matter\n');
    expect(frontMatterHasTitle(tree, defaultPattern)).toBe(false);
  });

  it('is disabled entirely by the empty-string pattern', () => {
    const tree = parseMarkdown('---\ntitle: My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, '')).toBe(false);
  });

  it('treats a nullish pattern as disabled', () => {
    const tree = parseMarkdown('---\ntitle: My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, undefined)).toBe(false);
    expect(frontMatterHasTitle(tree, null)).toBe(false);
  });

  // Upstream (helpers/helpers.cjs frontMatterHasTitle) builds the regex with
  // flag `i` only and tests it against each front matter LINE individually,
  // so no pattern can ever match across a line ending. Both fixtures below
  // are oracle-checked against live markdownlint (MD041 fires: no title).
  it('never matches a pattern whose literal \\n would bridge two lines', () => {
    const tree = parseMarkdown('---\ntitle: X\ndescription: Y\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, 'title:.*\\ndescription')).toBe(false);
  });

  it('never lets \\s* absorb a line ending to bridge two lines', () => {
    const tree = parseMarkdown('---\nauthor: X\ntitle: My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, 'author:.*\\s*title')).toBe(false);
  });

  it('tests the delimiter fence lines too (upstream frontMatterLines include them)', () => {
    // Oracle-checked: upstream's frontMatterLines are the whole regex-matched
    // block split on line endings, fences included, so `^---$` finds a title.
    const tree = parseMarkdown('---\nauthor: A\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, '^---$')).toBe(true);
  });
});
