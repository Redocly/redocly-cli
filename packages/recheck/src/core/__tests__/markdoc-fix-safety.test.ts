import { describe, expect, it } from 'vitest';

import { parseMarkdown } from '../../parser/index.js';
import type { Fix, NormalizedRule } from '../../types/index.js';
import { markdocTagSpans, protectMarkdocTags } from '../markdoc-tags.js';
import { runRules } from '../runner.js';

// Under `markdoc: true` prose scope content is masked, which broke the
// precondition whole-span rewriters relied on: `ScopedSegment.content` used to
// be a verbatim source slice, so a whole-span rewrite wrote the mask back over
// the real source and deleted the tag.

const capitalization = (scope: string): NormalizedRule =>
  ({
    name: 'probe/cap',
    severity: 'error',
    scope,
    message: 'capitalize: %s',
    assertions: { capitalization: { match: '$title' } },
  }) as unknown as NormalizedRule;

const swap = (scope: string): NormalizedRule =>
  ({
    name: 'probe/swap',
    severity: 'error',
    scope,
    message: 'use %s instead of %s',
    assertions: { swap: { pairs: { colour: 'color' } } },
  }) as unknown as NormalizedRule;

async function runFix(md: string, rule: NormalizedRule, markdoc = true) {
  const result = await runRules([{ path: 'f.md', content: md }], [rule], { fix: true, markdoc });
  return { ...result, fixed: result.fixedFiles.get('f.md') ?? md };
}

// One entry per prose container shape a tag can sit in. `tag` is the exact
// byte sequence that must survive; every fixture also holds "colour", which
// both rules must still rewrite — so no test can pass by refusing to fix.
const SHAPES: Array<{ name: string; scope: string; md: string; tag: string }> = [
  {
    name: 'heading',
    scope: 'heading.h1',
    md: '# head colour text {% #main %}\n',
    tag: '{% #main %}',
  },
  {
    name: 'paragraph',
    scope: 'paragraph',
    md: 'alpha colour {% partial file="x" /%} beta gamma.\n',
    tag: '{% partial file="x" /%}',
  },
  {
    name: 'sentence',
    scope: 'sentence',
    md: 'alpha colour {% partial file="x" /%} beta gamma.\n',
    tag: '{% partial file="x" /%}',
  },
  { name: 'list-item', scope: 'list-item', md: '- item colour {% x /%} text\n', tag: '{% x /%}' },
  {
    name: 'blockquote',
    scope: 'blockquote',
    md: '> quoted colour {% x /%} text\n',
    tag: '{% x /%}',
  },
  {
    name: 'table.cell',
    scope: 'table.cell',
    md: '| a |\n| - |\n| left colour {% x /%} right |\n',
    tag: '{% x /%}',
  },
];

describe('--fix never rewrites a markdoc tag', () => {
  for (const shape of SHAPES) {
    it(`${shape.name}: a whole-segment capitalization fix keeps the tag byte-identical`, async () => {
      const { fixed } = await runFix(shape.md, capitalization(shape.scope));
      expect(fixed).toContain(shape.tag);
      // The tag was restored into the rewrite, not spared by skipping the fix.
      expect(fixed).toContain('Colour');
      expect(fixed).not.toBe(shape.md);
    });

    it(`${shape.name}: a per-match swap fix keeps the tag byte-identical`, async () => {
      const { fixed } = await runFix(shape.md, swap(shape.scope));
      expect(fixed).toContain(shape.tag);
      expect(fixed).toContain('color');
      expect(fixed).not.toContain('colour');
    });
  }

  it('restores a tag sitting between two words a title-case fix rewrites', async () => {
    const { fixed } = await runFix(
      '# the {% partial file="x" /%} guide\n',
      capitalization('heading.h1')
    );
    expect(fixed).toBe('# The {% partial file="x" /%} Guide\n');
  });

  it('handles several tags in one segment', async () => {
    const md = '# alpha {% a %} beta {% b %} gamma\n';
    const { fixed } = await runFix(md, capitalization('heading.h1'));
    expect(fixed).toBe('# Alpha {% a %} Beta {% b %} Gamma\n');
  });

  it('leaves a document with no tags byte-identical to the flag-off run', async () => {
    const md = '# the plain colour guide\n\nalpha colour beta.\n';
    const on = await runFix(md, capitalization('summary'), true);
    const off = await runFix(md, capitalization('summary'), false);
    expect(on.fixed).toBe(off.fixed);
  });
});

describe('an edit merely abutting a tag is not mistaken for one that overlaps it', () => {
  // Overlap is a half-open-interval comparison, so an edit that merely touches
  // a tag at either boundary shares no character with it and must still apply.
  // The SHAPES fixtures above all straddle the tag or sit well clear of it, so
  // neither boundary is exercised there.
  const boundarySwap = (): NormalizedRule =>
    ({
      name: 'probe/boundary-swap',
      severity: 'error',
      scope: 'paragraph',
      message: 'use %s instead of %s',
      assertions: { swap: { pairs: { zzz: 'yyy' } } },
    }) as unknown as NormalizedRule;

  it("an edit ending exactly at a tag's start column still applies (editEnd === span.startColumn)", async () => {
    const { fixed } = await runFix('zzz{% x /%} qqq\n', boundarySwap());
    expect(fixed).toBe('yyy{% x /%} qqq\n');
    expect(fixed).toContain('{% x /%}');
  });

  it("an edit starting exactly at a tag's end column still applies (editColumn === span.endColumn)", async () => {
    const { fixed } = await runFix('qqq {% x /%}zzz\n', boundarySwap());
    expect(fixed).toBe('qqq {% x /%}yyy\n');
    expect(fixed).toContain('{% x /%}');
  });
});

describe('a swap key cannot match across a masked tag', () => {
  // The mask is length-preserving blanks, so `alpha\s+beta` used to match
  // straight across `alpha {% partial /%} beta`, reporting a phantom problem
  // and collapsing the tag out of the document on --fix. Matches overlapping a
  // masked range are now rejected by range instead.
  const acrossRule = (key: string): NormalizedRule =>
    ({
      name: 'probe/across',
      severity: 'error',
      scope: 'paragraph',
      message: 'use %s instead of %s',
      assertions: { swap: { pairs: { [key]: 'MERGED' }, keysAreRegex: true } },
    }) as unknown as NormalizedRule;

  const md = 'alpha {% partial file="x" /%} beta.\n';

  it('a whitespace-spanning key does not match across a tag', async () => {
    const result = await runFix(md, acrossRule('alpha\\s+beta'));
    expect(result.problems).toEqual([]);
    expect(result.fixed).toBe(md);
  });

  it('a negated-class key does not match across a tag either', async () => {
    // A sentinel mask character could not have stopped this one: `[^.]+`
    // treats any mask character as ordinary content and walks through it.
    const result = await runFix(md, acrossRule('alpha[^.]+beta'));
    expect(result.problems).toEqual([]);
    expect(result.fixed).toBe(md);
  });

  it('the same key still matches when no tag is in the way', async () => {
    const plain = 'alpha    beta.\n';
    const result = await runFix(plain, acrossRule('alpha\\s+beta'));
    expect(result.problems).toHaveLength(1);
    expect(result.fixed).toBe('MERGED.\n');
  });

  it('flag off, the tag text is ordinary prose and the key matches as it always did', async () => {
    const result = await runFix(md, acrossRule('alpha[^.]+beta'), false);
    expect(result.problems).toHaveLength(1);
  });
});

describe('capitalization reports quote real source, not mask characters', () => {
  it('match and message carry the tag verbatim', async () => {
    const md = '# head text {% #main %}\n';
    const { problems } = await runFix(md, capitalization('heading.h1'));
    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('head text {% #main %}');
    expect(problems[0].text).toBe('head text {% #main %}');
    expect(problems[0].message).toContain('{% #main %}');
    expect(problems[0].match).not.toMatch(/ {3}/); // no run of blanks where the tag is
  });

  it('a sentence segment carved out of masked prose quotes its own source slice', async () => {
    const md = 'alpha {% x /%} beta. Second one.\n';
    const { problems } = await runFix(md, capitalization('sentence'));
    expect(problems.map((problem) => problem.match)).toContain('alpha {% x /%} beta.');
  });
});

describe('protectMarkdocTags (the fix-layer choke point)', () => {
  const md = 'alpha {% x /%} beta\n';
  const spansFor = (content: string) =>
    markdocTagSpans(parseMarkdown(content, { markdoc: true }), content);
  const fix = (over: Partial<Fix>): Fix => ({
    file: 'f.md',
    ruleName: 'r',
    lineNumber: 1,
    editColumn: 1,
    deleteCount: 0,
    insertText: '',
    ...over,
  });

  it('reports one span per line for a tag that spans lines', () => {
    const multi = '{% table\n  x=1 %}\n\ntext\n';
    expect(spansFor(multi)).toEqual([
      { line: 1, startColumn: 1, endColumn: 9, text: '{% table' },
      { line: 2, startColumn: 1, endColumn: 9, text: '  x=1 %}' },
    ]);
  });

  it('is a pass-through when the document has no tags (the flag-off path)', () => {
    const proposed = [fix({ deleteCount: 5, insertText: 'ALPHA' })];
    const result = protectMarkdocTags(proposed, [], md);
    expect(result.fixes).toBe(proposed); // same array, untouched
    expect(result.dropped).toEqual([]);
  });

  it('passes a fix that does not reach the tag straight through', () => {
    const proposed = [fix({ editColumn: 1, deleteCount: 5, insertText: 'ALPHA' })];
    const result = protectMarkdocTags(proposed, spansFor(md), md);
    expect(result.fixes).toEqual(proposed);
    expect(result.dropped).toEqual([]);
  });

  it('splices the tag back into a length-preserving replacement that covers it', () => {
    const proposed = [fix({ editColumn: 1, deleteCount: 19, insertText: 'ALPHA          BETA' })];
    const result = protectMarkdocTags(proposed, spansFor(md), md);
    expect(result.dropped).toEqual([]);
    expect(result.fixes[0].insertText).toBe('ALPHA {% x /%} BETA');
  });

  it('drops a length-CHANGING replacement that covers a tag', () => {
    const proposed = [fix({ editColumn: 1, deleteCount: 19, insertText: 'MERGED' })];
    const result = protectMarkdocTags(proposed, spansFor(md), md);
    expect(result.fixes).toEqual([]);
    expect(result.dropped).toEqual(proposed);
  });

  it('drops a fix that would cut a tag in half', () => {
    const proposed = [fix({ editColumn: 1, deleteCount: 9, insertText: 'ALPHA {% ' })];
    const result = protectMarkdocTags(proposed, spansFor(md), md);
    expect(result.dropped).toEqual(proposed);
  });

  it('drops a whole-line rewrite on a line holding a tag', () => {
    const proposed = [fix({ deleteCount: -1, insertText: 'replaced' })];
    const result = protectMarkdocTags(proposed, spansFor(md), md);
    expect(result.dropped).toEqual(proposed);
  });

  it('drops a fix that changes nothing once its tag is restored', () => {
    // Only mask characters changed, so restoring the tag makes the edit
    // byte-identical to what is already there; applying it would report a file
    // as fixed when it is not.
    const proposed = [fix({ editColumn: 7, deleteCount: 8, insertText: '        ' })];
    const result = protectMarkdocTags(proposed, spansFor(md), md);
    expect(result.fixes).toEqual([]);
    expect(result.dropped).toEqual(proposed);
  });

  // Neither `swap` nor `capitalization` can reach the runner's drop path:
  // `swap` rejects matches overlapping a masked range before proposing a fix,
  // and `capitalization` always proposes a length-preserving whole-segment
  // replacement, which gets spliced rather than dropped. `no-hard-tabs` scans
  // lines directly and is markdoc-unaware, so it fixes a tab inside a tag's
  // attribute value; at `spacesPerTab: 2` that replacement changes length and
  // cannot be spliced, so it has to be dropped.
  const tabRule = {
    name: 'probe/hard-tabs',
    severity: 'error',
    scope: 'all',
    message: 'Hard tabs',
    assertions: { 'no-hard-tabs': { spacesPerTab: 2 } },
  } as unknown as NormalizedRule;
  const tabbedTag = 'alpha {% partial file="a\tb" /%} beta\n';

  it('reports a dropped fix through the runner as skipped, not applied', async () => {
    const result = await runRules([{ path: 'f.md', content: tabbedTag }], [tabRule], {
      fix: true,
      markdoc: true, // flag on: the tag's bytes must survive
    });
    expect(result.fixedFiles.get('f.md')).toBeUndefined();
    expect(result.fixes).toEqual([]);
    expect(result.skippedFixes).toHaveLength(1);
    expect(result.skippedFixes[0].ruleName).toBe('probe/hard-tabs');
  });

  it('flag off, the same fix is unprotected and lands (the byte-identity companion)', async () => {
    const result = await runRules([{ path: 'f.md', content: tabbedTag }], [tabRule], {
      fix: true,
      markdoc: false, // flag off: there is no protection to apply
    });
    expect(result.fixedFiles.get('f.md')).toBe('alpha {% partial file="a  b" /%} beta\n');
    expect(result.skippedFixes).toEqual([]);
  });
});
