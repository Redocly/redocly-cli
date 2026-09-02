import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../../index.js';
import { computeMarkdocPairing, type PairingOptions } from '../pairing.js';

const pairing = (src: string, options?: PairingOptions) =>
  computeMarkdocPairing(parseMarkdown(src, { markdoc: true }), options);

describe('computeMarkdocPairing', () => {
  it('matches a well-formed pair at depth 0', () => {
    const result = pairing('{% a %}\nx\n{% /a %}\n');
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].open.text).toBe('{% a %}');
    expect(result.pairs[0].close.text).toBe('{% /a %}');
    expect(result.pairs[0].depth).toBe(0);
    expect(result.unclosed).toEqual([]);
    expect(result.orphaned).toEqual([]);
    expect(result.crossed).toEqual([]);
    expect(result.voidMissingSlash).toEqual([]);
  });

  it('matches nested same-name tags innermost-first', () => {
    const result = pairing('{% a %}\n{% a %}\nx\n{% /a %}\n{% /a %}\n');
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[0].open.startLine).toBe(2);
    expect(result.pairs[0].close.startLine).toBe(4);
    expect(result.pairs[0].depth).toBe(1);
    expect(result.pairs[1].open.startLine).toBe(1);
    expect(result.pairs[1].close.startLine).toBe(5);
    expect(result.pairs[1].depth).toBe(0);
    expect(result.crossed).toEqual([]);
  });

  it('interleaved tags land both pairs in crossed, none in pairs', () => {
    const result = pairing('{% a %}{% b %}{% /a %}{% /b %}\n');
    expect(result.pairs).toEqual([]);
    expect(result.crossed).toHaveLength(2);
    expect(result.crossed.map((pair) => [pair.open.text, pair.close.text])).toEqual([
      ['{% a %}', '{% /a %}'],
      ['{% b %}', '{% /b %}'],
    ]);
    expect(result.unclosed).toEqual([]);
    expect(result.orphaned).toEqual([]);
  });

  it('crossed pairs keep the depth their open was pushed at, not its match-time stack position', () => {
    // `/b` jumps over `c`, so both pairs are crossed. By match time `c` sits
    // lower in the reshuffled stack, but it was pushed at depth 2.
    const result = pairing('{% a %}\n{% b %}\n{% c %}\n{% /b %}\n{% /c %}\n{% /a %}\n');
    expect(result.crossed.map((pair) => [pair.open.text, pair.depth])).toEqual([
      ['{% b %}', 1],
      ['{% c %}', 2],
    ]);
    expect(result.pairs.map((pair) => [pair.open.text, pair.depth])).toEqual([['{% a %}', 0]]);
    expect(result.orphaned).toEqual([]);
    expect(result.unclosed).toEqual([]);
  });

  it('a same-name self-closing tag between an open and its close does not steal the close', () => {
    const result = pairing('{% a %}\n{% a /%}\n{% /a %}\n');
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].open.startLine).toBe(1);
    expect(result.pairs[0].close.startLine).toBe(3);
    expect(result.pairs[0].depth).toBe(0);
    expect(result.crossed).toEqual([]);
    expect(result.unclosed).toEqual([]);
    expect(result.orphaned).toEqual([]);
  });

  it('an open with no close is unclosed', () => {
    const result = pairing('{% admonition %}\ntext\n');
    expect(result.unclosed).toHaveLength(1);
    expect(result.unclosed[0].text).toBe('{% admonition %}');
    expect(result.pairs).toEqual([]);
    expect(result.crossed).toEqual([]);
    expect(result.voidMissingSlash).toEqual([]);
  });

  it('a close with no open is orphaned', () => {
    const result = pairing('{% /a %}\ntext\n');
    expect(result.orphaned).toHaveLength(1);
    expect(result.orphaned[0].text).toBe('{% /a %}');
    expect(result.pairs).toEqual([]);
    expect(result.unclosed).toEqual([]);
  });

  describe('schema-aware self-closing (voidMissingSlash)', () => {
    const selfClosingTags = new Set(['img']);

    it('an unclosed schema-void tag lands in voidMissingSlash, not unclosed', () => {
      const result = pairing('{% img %}\ntext\n', { selfClosingTags });
      expect(result.voidMissingSlash).toHaveLength(1);
      expect(result.voidMissingSlash[0].text).toBe('{% img %}');
      expect(result.unclosed).toEqual([]);
    });

    it('a properly self-closed void tag pairs into nothing at all', () => {
      const result = pairing('{% img /%}\ntext\n', { selfClosingTags });
      expect(result.pairs).toEqual([]);
      expect(result.crossed).toEqual([]);
      expect(result.unclosed).toEqual([]);
      expect(result.orphaned).toEqual([]);
      expect(result.voidMissingSlash).toEqual([]);
    });

    it('a non-void unclosed tag stays in unclosed even when other names are self-closing', () => {
      const result = pairing('{% admonition %}\ntext\n', { selfClosingTags });
      expect(result.unclosed).toHaveLength(1);
      expect(result.unclosed[0].text).toBe('{% admonition %}');
      expect(result.voidMissingSlash).toEqual([]);
    });

    it('defaults to an empty self-closing set when options are omitted', () => {
      const result = pairing('{% img %}\ntext\n');
      expect(result.unclosed).toHaveLength(1);
      expect(result.voidMissingSlash).toEqual([]);
    });
  });

  describe('kind exemptions', () => {
    it('annotation, variable, function, and self-closing kinds never enter the stack', () => {
      const result = pairing('{% #id %}\n{% $var %}\n{% equals(1,1) %}\n{% x /%}\n');
      expect(result.pairs).toEqual([]);
      expect(result.crossed).toEqual([]);
      expect(result.unclosed).toEqual([]);
      expect(result.orphaned).toEqual([]);
      expect(result.voidMissingSlash).toEqual([]);
    });

    it('a bare function span (name: null) is exempt exactly like a variable', () => {
      const result = pairing('{% equals(1,1) %}\n');
      expect(result.pairs).toEqual([]);
      expect(result.unclosed).toEqual([]);
      expect(result.orphaned).toEqual([]);
    });

    it('exempt kinds sitting between a real pair do not add to its nesting depth', () => {
      const result = pairing('{% a %}\n{% $var %}\n{% b %}\nx\n{% /b %}\n{% /a %}\n');
      expect(result.pairs).toHaveLength(2);
      const bPair = result.pairs.find((pair) => pair.open.text === '{% b %}');
      const aPair = result.pairs.find((pair) => pair.open.text === '{% a %}');
      expect(bPair?.depth).toBe(1);
      expect(aPair?.depth).toBe(0);
    });
  });

  it('a malformed open (blockquote multi-line limitation) does not corrupt surrounding well-formed pairs', () => {
    // A multi-line tag inside a blockquote comes out `malformed`: the token
    // text picks up the literal `> ` prefix from each continuation line.
    // Pairing has to skip malformed spans rather than guess at them.
    const src =
      '{% before %}\nx\n{% /before %}\n\n' +
      '> {% multi\n> attr="a" %}\n> body\n> {% /multi %}\n\n' +
      '{% after %}\nx\n{% /after %}\n';
    const tree = parseMarkdown(src, { markdoc: true });
    const malformedTag = tree.flat.find(
      (t) => t.type === 'markdocTag' && t.markdocKind === 'malformed'
    );
    expect(malformedTag).toBeDefined(); // guards the fixture against a future parser fix silently changing shape

    const result = computeMarkdocPairing(tree);
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs.map((pair) => [pair.open.text, pair.close.text])).toEqual([
      ['{% before %}', '{% /before %}'],
      ['{% after %}', '{% /after %}'],
    ]);
    // Only the open was mangled, so the close is a normal tag-close with
    // nothing left to match.
    expect(result.orphaned).toHaveLength(1);
    expect(result.orphaned[0].text).toBe('{% /multi %}');
    expect(result.crossed).toEqual([]);
    expect(result.unclosed).toEqual([]);
  });

  it('digit-leading tag names pair like any other name', () => {
    const result = pairing('{% 1x %}\nx\n{% /1x %}\n');
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].open.text).toBe('{% 1x %}');
    expect(result.pairs[0].close.text).toBe('{% /1x %}');
  });

  it('does not assume tree.flat holds markdocTag tokens in document order', () => {
    // Synthesized children are appended to the end of `tree.flat`, so array
    // order is not document order. Feeding the same tokens back in reversed
    // proves the position sort, not array order, drives the match.
    const tree = parseMarkdown('{% a %}\n{% $var %}\n{% b %}\nx\n{% /b %}\n{% /a %}\n', {
      markdoc: true,
    });
    const tags = tree.flat.filter((t) => t.type === 'markdocTag');
    const scrambled = { children: [], flat: [...tags].reverse() };

    const result = computeMarkdocPairing(scrambled);
    expect(result.pairs).toHaveLength(2);
    const bPair = result.pairs.find((pair) => pair.open.text === '{% b %}');
    const aPair = result.pairs.find((pair) => pair.open.text === '{% a %}');
    expect(bPair?.depth).toBe(1);
    expect(aPair?.depth).toBe(0);
    expect(result.crossed).toEqual([]);
    expect(result.unclosed).toEqual([]);
    expect(result.orphaned).toEqual([]);
  });
});
