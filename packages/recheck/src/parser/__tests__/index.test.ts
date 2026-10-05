import { describe, expect, it } from 'vitest';

import { filterByTypes, parseMarkdown } from '../index.js';

describe('parseMarkdown', () => {
  it('parses headings with exact positions', () => {
    const tree = parseMarkdown('# Title\n\nBody text.\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(heading).toBeDefined();
    expect(heading.startLine).toBe(1);
    expect(heading.text).toBe('# Title');
  });

  it('parses fenced code with language info token', () => {
    const tree = parseMarkdown('```js\nconst a = 1;\n```\n');
    const [fence] = filterByTypes(tree, ['codeFenced']);
    expect(fence.startLine).toBe(1);
    expect(fence.endLine).toBe(3);
    const [info] = filterByTypes(tree, ['codeFencedFenceInfo']);
    expect(info.text).toBe('js');
  });

  it('parses YAML frontmatter as a token', () => {
    const tree = parseMarkdown('---\ntitle: Hi\n---\n\n# H\n');
    const [fm] = filterByTypes(tree, ['yaml']);
    expect(fm.startLine).toBe(1);
    expect(fm.endLine).toBe(3);
  });

  it('parses GFM tables', () => {
    const tree = parseMarkdown('| a | b |\n| - | - |\n| 1 | 2 |\n');
    expect(filterByTypes(tree, ['table']).length).toBe(1);
  });

  it('never throws on malformed input', () => {
    expect(() => parseMarkdown('```unclosed\n<div><em>[[')).not.toThrow();
  });

  it('maintains parent/child links and a flat list', () => {
    const tree = parseMarkdown('# T\n');
    const [heading] = filterByTypes(tree, ['atxHeading']);
    expect(heading.children.length).toBeGreaterThan(0);
    expect(heading.children[0].parent).toBe(heading);
    expect(tree.flat).toContain(heading);
  });

  describe('htmlFlow reparse (block HTML exposes htmlText tags, like upstream)', () => {
    // Tags inside block HTML only show up when `filterByTypes` is called with `includeHtmlFlow` set
    // to true.

    it('exposes a single-line htmlFlow block tag as an htmlText token', () => {
      const tree = parseMarkdown('<div align="center">\n\nBody\n\n</div>\n');
      const htmlTexts = filterByTypes(tree, ['htmlText'], true);
      expect(htmlTexts.map((t) => t.text)).toContain('<div align="center">');
    });

    it('exposes multiple tags within one multi-line htmlFlow block, at correct positions', () => {
      const tree = parseMarkdown('<details>\n<summary>Label</summary>\n\nBody\n</details>\n');
      const htmlTexts = filterByTypes(tree, ['htmlText'], true);
      const texts = htmlTexts.map((t) => t.text);
      expect(texts).toEqual(
        expect.arrayContaining(['<details>', '<summary>', '</summary>', '</details>'])
      );
      const summaryOpen = htmlTexts.find((t) => t.text === '<summary>');
      expect(summaryOpen?.startLine).toBe(2);
      expect(summaryOpen?.startColumn).toBe(1);
      const closeDetails = htmlTexts.find((t) => t.text === '</details>');
      expect(closeDetails?.startLine).toBe(5);
    });

    it('does not reparse an htmlFlow HTML comment block into tags', () => {
      const tree = parseMarkdown('<!-- a comment with <fake> tag-like text -->\n\nBody\n');
      const htmlTexts = filterByTypes(tree, ['htmlText'], true);
      expect(htmlTexts).toHaveLength(0);
      expect(filterByTypes(tree, ['htmlFlow'])[0]?.text).toBe(
        '<!-- a comment with <fake> tag-like text -->'
      );
    });

    it('leaves genuinely inline HTML (already htmlText) unaffected', () => {
      const tree = parseMarkdown('Some <em>text</em> with inline HTML.\n');
      const htmlTexts = filterByTypes(tree, ['htmlText'], true);
      expect(htmlTexts.map((t) => t.text)).toEqual(['<em>', '</em>']);
    });
  });

  describe('filterByTypes includeHtmlFlow default (excludes htmlFlow-reparsed content unless opted in)', () => {
    it('excludes htmlText inside an htmlFlow block by default', () => {
      const tree = parseMarkdown('<div align="center">\n\nBody\n\n</div>\n');
      expect(filterByTypes(tree, ['htmlText'])).toHaveLength(0);
      expect(filterByTypes(tree, ['htmlText'], true).length).toBeGreaterThan(0);
    });

    it('excludes a codeText span inside an htmlFlow block by default (regression: MD038 false positive)', () => {
      // The padded code span inside <details> must not be reported by no-space-in-code.
      const tree = parseMarkdown('<details>\n<summary>` padded `</summary>\n</details>\n');
      expect(filterByTypes(tree, ['codeText'])).toHaveLength(0);
      expect(filterByTypes(tree, ['codeText'], true).length).toBeGreaterThan(0);
    });

    it('still includes genuinely top-level tokens regardless of the flag', () => {
      const tree = parseMarkdown('# Heading\n\nBody\n');
      expect(filterByTypes(tree, ['atxHeading'])).toHaveLength(1);
      expect(filterByTypes(tree, ['atxHeading'], true)).toHaveLength(1);
    });

    it('does not throw on a huge contiguous htmlFlow block (argument-spread stack limit)', () => {
      // Spreading this many tokens into `push` overflows the call stack (somewhere between 30k and
      // 40k lines).
      const huge = '<div>\n' + '<span>x</span>\n'.repeat(45_000) + '</div>\n';
      const tree = parseMarkdown(huge);
      expect(filterByTypes(tree, ['htmlText'], true).length).toBeGreaterThan(0);
    }, 30_000);
  });
});

// Includes block HTML, which the flag-off parse must leave as plain text.
const TAGGED = [
  '{% admonition type="info" %}',
  'Be careful here.',
  '{% /admonition %}',
  '',
  'Inline {% partial file="x.md" /%} tag.',
  '',
  '<div class="wrapper">',
  '<span>Block HTML with a `code` span.</span>',
  '</div>',
  '',
].join('\n');

// Markdoc turns off indented code and setext headings, but that must not affect a parse without the
// option.
describe('markdoc flag off', () => {
  it('tag lines remain ordinary paragraph text', () => {
    const flat = parseMarkdown(TAGGED, { markdoc: false }).flat;
    expect(flat.some((t) => t.type === 'markdocTag')).toBe(false);
  });

  it('still produces codeIndented for indented lines', () => {
    const flat = parseMarkdown('Before.\n\n    just some indented text\n', { markdoc: false }).flat;
    expect(flat.filter((token) => token.type === 'codeIndented')).toHaveLength(1);
  });

  it('still produces setextHeading tokens', () => {
    const flat = parseMarkdown('Title\n=====\n\nTitle\n-----\n', { markdoc: false }).flat;
    expect(flat.filter((token) => token.type === 'setextHeading')).toHaveLength(2);
  });
});
