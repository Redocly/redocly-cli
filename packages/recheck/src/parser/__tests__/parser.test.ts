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
    // Regression: upstream markdownlint reparses every htmlFlow (block
    // HTML) token's raw text as inline content (see its
    // lib/micromark-parse.mjs shim), splicing in real `htmlText` tokens
    // for each tag -- e.g. so MD033 no-inline-html sees `<details>` even
    // though it's a block-level HTML element, not inline. Recheck's parser
    // previously left `htmlFlow` tokens with only `htmlFlowData` children
    // (raw, untagged text), which made `no-inline-html` (and any other
    // rule filtering for `htmlText`) blind to an entire class of common
    // real-world HTML (<details>, <summary>, <div align="center">, etc.).
    //
    // `filterByTypes`'s third argument (`includeHtmlFlow`) must be `true`
    // to see this reparsed content -- it defaults to `false`, matching
    // upstream's own `filterByTypes(tokens, types, htmlFlow)` default, so
    // that rules NOT explicitly opting in (e.g. MD038 no-space-in-code)
    // don't spuriously match synthetic content from inside an HTML block
    // (a code span's backticks inside <details> is not a "real" inline
    // code span the same way a top-level one is) -- see the dedicated
    // `filterByTypes includeHtmlFlow` suite below for that default itself.

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

    it('does not throw and produces no htmlText for a document with no HTML', () => {
      const tree = parseMarkdown('# Just markdown\n\nNo HTML here.\n');
      expect(filterByTypes(tree, ['htmlText'], true)).toHaveLength(0);
    });
  });

  describe('filterByTypes includeHtmlFlow default (excludes htmlFlow-reparsed content unless opted in)', () => {
    it('excludes htmlText inside an htmlFlow block by default', () => {
      const tree = parseMarkdown('<div align="center">\n\nBody\n\n</div>\n');
      expect(filterByTypes(tree, ['htmlText'])).toHaveLength(0);
      expect(filterByTypes(tree, ['htmlText'], true).length).toBeGreaterThan(0);
    });

    it('excludes a codeText span inside an htmlFlow block by default (regression: MD038 false positive)', () => {
      // A backtick code span inside a <details> block was wrongly flagged by
      // MD038 no-space-in-code once the parser started reparsing htmlFlow
      // content. Upstream's own MD038 uses `filterByTypesCached(['codeText'])`
      // with no `true` flag, so it never sees code spans inside HTML blocks.
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
      // One HTML block of tens of thousands of lines reparses into a flat list
      // too large to append via spread arguments, which overflows the call
      // stack somewhere between 30k and 40k lines. The parser must fall back to
      // a slower append rather than throw.
      const huge = '<div>\n' + '<span>x</span>\n'.repeat(45_000) + '</div>\n';
      const tree = parseMarkdown(huge);
      expect(filterByTypes(tree, ['htmlText'], true).length).toBeGreaterThan(0);
    }, 30_000);
  });
});
