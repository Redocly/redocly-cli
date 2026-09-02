import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../index.js';

// The block-HTML region is here so `inHtmlFlow` is genuinely populated
// somewhere in the compared shape, not merely absent on both sides.
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

// 4-space-indented prose and a tag pair: the construct the flag-on extension
// changes by disabling `codeIndented`. Flag-off must still see it unchanged.
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

// Strips parent back-references so deep-equal comparison terminates. The
// optional `inHtmlFlow` and `markdocKind` fields are included so identity
// comparisons actually cover them.
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

/** Deep clone differing from its input in exactly one field, cleared everywhere. */
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

  // The test above would pass on `type` alone, so it says nothing about the
  // two optional fields. This one requires each to be populated in the fixture
  // and requires clearing it -- and nothing else -- to change the comparison.
  it('the comparator genuinely compares inHtmlFlow and markdocKind', () => {
    const tagged = shape(parseMarkdown(TAGGED, { markdoc: true }));
    const nodes = flatten(tagged);
    expect(nodes.filter((node) => node.inHtmlFlow === true).length).toBeGreaterThan(0);
    expect(nodes.filter((node) => node.markdocKind !== undefined).length).toBeGreaterThan(0);
    expect(tagged).not.toEqual(cleared(tagged, 'inHtmlFlow'));
    expect(tagged).not.toEqual(cleared(tagged, 'markdocKind'));
  });

  // The flag-on extension disables `codeIndented` because Markdoc's own
  // tokenizer disables indented code unconditionally. That must not leak into
  // a flagless parse.
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

  // Likewise `setextUnderline`, because Markdoc's tokenizer disables
  // `lheading` unconditionally alongside indented code.
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
