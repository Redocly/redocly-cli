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

// Includes block HTML so that `inHtmlFlow` is set on some tokens.
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

// Indented text and indented tags. The Markdoc option turns off indented code.
const INDENTED = [
  'Before.',
  '',
  '    just some indented text',
  '',
  '{% cards %}',
  '    {% card title="One" %}',
  '    Body copy.',
  '    {% /card %}',
  '{% /cards %}',
  '',
  'After.',
  '',
].join('\n');

interface ShapeNode {
  type: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
  inHtmlFlow?: boolean;
  markdocKind?: string;
  children: ShapeNode[];
}

// Drops `parent` so the trees can be compared. Keeps `inHtmlFlow` and `markdocKind`.
function shape(tree: ReturnType<typeof parseMarkdown>): ShapeNode[] {
  const strip = (t: any): ShapeNode => ({
    type: t.type,
    startLine: t.startLine,
    startColumn: t.startColumn,
    endLine: t.endLine,
    endColumn: t.endColumn,
    text: t.text,
    inHtmlFlow: t.inHtmlFlow,
    markdocKind: t.markdocKind,
    children: t.children.map(strip),
  });
  return tree.children.map(strip);
}

function flatten(nodes: ShapeNode[]): ShapeNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

// Copy of the nodes with one field cleared on every node.
function cleared(nodes: ShapeNode[], field: 'inHtmlFlow' | 'markdocKind'): ShapeNode[] {
  return nodes.map((node) => ({
    ...node,
    [field]: undefined,
    children: cleared(node.children, field),
  }));
}

describe('markdoc flag plumbing', () => {
  it('flag omitted and flag false produce byte-identical trees', () => {
    expect(shape(parseMarkdown(TAGGED))).toEqual(shape(parseMarkdown(TAGGED, { markdoc: false })));
  });

  it("flag off: tag lines remain ordinary paragraph text (today's shape)", () => {
    const flat = parseMarkdown(TAGGED).flat;
    expect(flat.some((t) => t.type === 'markdocTag')).toBe(false);
  });

  it('sanity: flag on is NOT byte-identical to flag off', () => {
    expect(shape(parseMarkdown(TAGGED))).not.toEqual(
      shape(parseMarkdown(TAGGED, { markdoc: true }))
    );
  });

  // The test above could pass on `type` alone, so check the two optional fields too.
  it('the comparator genuinely compares inHtmlFlow and markdocKind', () => {
    const tagged = shape(parseMarkdown(TAGGED, { markdoc: true }));
    const nodes = flatten(tagged);
    expect(nodes.filter((node) => node.inHtmlFlow === true).length).toBeGreaterThan(0);
    expect(nodes.filter((node) => node.markdocKind !== undefined).length).toBeGreaterThan(0);
    expect(tagged).not.toEqual(cleared(tagged, 'inHtmlFlow'));
    expect(tagged).not.toEqual(cleared(tagged, 'markdocKind'));
  });

  // Markdoc turns off indented code, but that must not affect a parse without the option.
  describe('indented content: the disable is confined to the flag-on path', () => {
    it('flag omitted and flag false stay byte-identical', () => {
      expect(shape(parseMarkdown(INDENTED))).toEqual(
        shape(parseMarkdown(INDENTED, { markdoc: false }))
      );
    });

    it('flag off still produces codeIndented for the indented lines', () => {
      const flat = parseMarkdown(INDENTED, { markdoc: false }).flat;
      expect(flat.filter((token) => token.type === 'codeIndented').length).toBeGreaterThan(0);
      expect(flat.some((token) => token.type === 'markdocTag')).toBe(false);
    });

    it('flag on produces no codeIndented at all, and pairs the indented tags', () => {
      const flat = parseMarkdown(INDENTED, { markdoc: true }).flat;
      expect(flat.filter((token) => token.type === 'codeIndented')).toHaveLength(0);
      expect(
        flat.filter((token) => token.type === 'markdocTag').map((token) => token.markdocKind)
      ).toEqual(['tag-open', 'tag-open', 'tag-close', 'tag-close']);
    });
  });

  // Same for setext headings, which Markdoc also turns off.
  describe('setext headings: the disable is confined to the flag-on path', () => {
    const SETEXT = 'Title\n=====\n\nTitle\n-----\n';

    it('flag omitted and flag false stay byte-identical', () => {
      expect(shape(parseMarkdown(SETEXT))).toEqual(
        shape(parseMarkdown(SETEXT, { markdoc: false }))
      );
    });

    it('flag off still produces setextHeading tokens', () => {
      const flat = parseMarkdown(SETEXT, { markdoc: false }).flat;
      expect(flat.filter((token) => token.type === 'setextHeading')).toHaveLength(2);
    });

    it('flag on produces no setextHeading at all', () => {
      const flat = parseMarkdown(SETEXT, { markdoc: true }).flat;
      expect(flat.filter((token) => token.type === 'setextHeading')).toHaveLength(0);
      expect(flat.filter((token) => token.type === 'paragraph')).toHaveLength(2);
      expect(flat.filter((token) => token.type === 'thematicBreak')).toHaveLength(1);
    });
  });
});
