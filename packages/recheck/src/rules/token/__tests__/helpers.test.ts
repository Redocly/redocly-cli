import { describe, expect, it } from 'vitest';

import { parseMarkdown, filterByTypes } from '../../../parser/index.js';
import {
  clearHtmlCommentText,
  ellipsify,
  escapeForRegExp,
  frontMatterHasTitle,
  getBlockQuotePrefixText,
  getHeadingLevel,
  getHeadingText,
  hasOverlap,
  isBlankLine,
  toWellFormedString,
} from '../helpers.js';

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
  it('extracts atx heading text across inline formatting, keeping markers (upstream only strips htmlText)', () => {
    const tree = parseMarkdown('# Title *em* text\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(getHeadingText(heading)).toBe('Title *em* text');
  });

  it('collapses internal newlines in a multi-line setext heading to spaces', () => {
    const tree = parseMarkdown('Title\ncontinued\n=====\n');
    const [heading] = filterByTypes(tree, ['setextHeading']);
    expect(getHeadingText(heading)).toBe('Title continued');
  });
});

describe('getBlockQuotePrefixText', () => {
  it('returns the "> " prefix text for a line inside a blockquote', () => {
    const tree = parseMarkdown('> a\n> b\n> c\n');
    expect(getBlockQuotePrefixText(tree, 2)).toBe('>\n');
  });

  it('returns just a newline for a line outside any blockquote (upstream always appends "\\n")', () => {
    const tree = parseMarkdown('a\nb\n');
    // There is no prefix, but a newline is still appended.
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
  it('replaces comment content characters with the safe "." character, preserving spaces and length', () => {
    const input = '<!-- hello world -->';
    const cleared = clearHtmlCommentText(input);
    expect(cleared).toBe('<!-- ..... ..... -->');
    expect(cleared.length).toBe(input.length);
  });

  it('preserves plain (non-trailing) spaces but clears trailing-space-before-newline runs', () => {
    const input = '<!--\n   \nreal content\n-->';
    const cleared = clearHtmlCommentText(input);
    // Spaces before a newline are replaced too, so they are not trailing whitespace.
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
    // A comment alone on its line is always cleared.
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

  // The pattern is tested on each line, so it cannot match across lines.
  it('never matches a pattern whose literal \\n would bridge two lines', () => {
    const tree = parseMarkdown('---\ntitle: X\ndescription: Y\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, 'title:.*\\ndescription')).toBe(false);
  });

  it('never lets \\s* absorb a line ending to bridge two lines', () => {
    const tree = parseMarkdown('---\nauthor: X\ntitle: My Document\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, 'author:.*\\s*title')).toBe(false);
  });

  it('tests the delimiter fence lines too (upstream frontMatterLines include them)', () => {
    const tree = parseMarkdown('---\nauthor: A\n---\n\nBody\n');
    expect(frontMatterHasTitle(tree, '^---$')).toBe(true);
  });
});

describe('hasOverlap', () => {
  const range = (startLine: number, startColumn: number, endLine: number, endColumn: number) => ({
    startLine,
    startColumn,
    endLine,
    endColumn,
  });

  it('is true for ranges that share a position, in either argument order', () => {
    expect(hasOverlap(range(1, 1, 1, 5), range(1, 5, 1, 9))).toBe(true);
    expect(hasOverlap(range(1, 5, 1, 9), range(1, 1, 1, 5))).toBe(true);
  });

  it('is false for disjoint ranges, in either argument order', () => {
    expect(hasOverlap(range(1, 1, 1, 4), range(1, 5, 1, 9))).toBe(false);
    expect(hasOverlap(range(1, 5, 1, 9), range(1, 1, 1, 4))).toBe(false);
  });

  it('compares lines before columns for ranges on different lines', () => {
    expect(hasOverlap(range(1, 9, 3, 2), range(2, 1, 2, 3))).toBe(true);
    expect(hasOverlap(range(1, 9, 1, 12), range(2, 1, 2, 3))).toBe(false);
  });
});

describe('ellipsify', () => {
  const long = 'abcdefghijklmnopqrstuvwxyz0123456789';

  it('leaves text of 30 characters or fewer untouched and truncates from 31', () => {
    expect(ellipsify('a'.repeat(30), true, true)).toBe('a'.repeat(30));
    expect(ellipsify('a'.repeat(31))).toBe('a'.repeat(30) + '...');
  });

  it('keeps the start by default, the end when only `end` is set, and both ends when both are set', () => {
    expect(ellipsify(long)).toBe('abcdefghijklmnopqrstuvwxyz0123...');
    expect(ellipsify(long, false, true)).toBe('...' + 'ghijklmnopqrstuvwxyz0123456789');
    expect(ellipsify(long, true, true)).toBe('abcdefghijklmno...vwxyz0123456789');
  });
});

describe('escapeForRegExp', () => {
  it('escapes every regex metacharacter so the result matches the input literally', () => {
    const input = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o-p/q';
    expect(new RegExp(`^${escapeForRegExp(input)}$`).test(input)).toBe(true);
    expect(new RegExp(escapeForRegExp('a.c')).test('abc')).toBe(false);
  });
});

describe('toWellFormedString', () => {
  it('replaces lone surrogates with U+FFFD and keeps valid surrogate pairs', () => {
    expect(toWellFormedString('a\uD800b')).toBe('a\uFFFDb');
    expect(toWellFormedString('a\uDC00b')).toBe('a\uFFFDb');
    expect(toWellFormedString('a\u{1F600}b')).toBe('a\u{1F600}b');
  });
});
