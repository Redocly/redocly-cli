import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../../parser/index.js';
import { parseDirectives } from '../directives.js';

const known = new Set(['recheck/oxford-comma', 'recheck/us-spelling']);
const parse = (md: string) => parseDirectives(parseMarkdown(md), 'test.md', known);

describe('parseDirectives', () => {
  it('disable with no names suppresses all rules from that line on', () => {
    const d = parse('line one\n\n<!-- recheck-disable -->\n\nafter\n');
    expect(d.isSuppressed('recheck/oxford-comma', 1)).toBe(false);
    expect(d.isSuppressed('recheck/oxford-comma', 5)).toBe(true);
    expect(d.isSuppressed('anything-even-unconfigured', 5)).toBe(true);
  });
  it('disable with names suppresses only those; short and full names both work', () => {
    const d = parse('<!-- recheck-disable oxford-comma -->\ntext\n');
    expect(d.isSuppressed('recheck/oxford-comma', 2)).toBe(true);
    expect(d.isSuppressed('oxford-comma', 2)).toBe(true);
    expect(d.isSuppressed('recheck/us-spelling', 2)).toBe(false);
  });
  it('enable re-enables; per-rule enable only re-enables listed', () => {
    const d = parse('<!-- recheck-disable -->\na\n<!-- recheck-enable oxford-comma -->\nb\n');
    expect(d.isSuppressed('recheck/oxford-comma', 4)).toBe(false);
    expect(d.isSuppressed('recheck/us-spelling', 4)).toBe(true);
  });
  it('disable-next-line affects exactly the next line', () => {
    const d = parse(
      '<!-- recheck-disable-next-line oxford-comma -->\nflagged line\nnot this one\n'
    );
    expect(d.isSuppressed('recheck/oxford-comma', 2)).toBe(true);
    expect(d.isSuppressed('recheck/oxford-comma', 3)).toBe(false);
  });
  it('disable-file works from any position', () => {
    const d = parse('text\n\n<!-- recheck-disable-file -->\n');
    expect(d.fileDisabled).toBe(true);
  });
  it('directive inside a fenced code block is inert', () => {
    const d = parse('```\n<!-- recheck-disable -->\n```\nafter\n');
    expect(d.isSuppressed('recheck/oxford-comma', 4)).toBe(false);
  });
  it('unknown rule name produces a warning problem at the directive line', () => {
    const d = parse('a\n<!-- recheck-disable no-such-rule -->\n');
    expect(d.warnings).toHaveLength(1);
    expect(d.warnings[0]).toMatchObject({
      line: 2,
      severity: 'warn',
      ruleName: 'recheck-directive',
    });
    expect(d.warnings[0].message).toContain('no-such-rule');
  });

  describe('directive line anchoring inside a multi-line htmlFlow token', () => {
    // An HTML block (e.g. a `<div>` wrapper) swallows every line up to the
    // next blank line into ONE htmlFlow token, so a directive on the
    // token's second line used to inherit token.startLine -- anchoring it a
    // line too early: disable-next-line suppressed its OWN line instead of
    // the one after it.
    it('disable-next-line on the second line of an HTML block suppresses the line after it', () => {
      const d = parse(
        '<div>\n<!-- recheck-disable-next-line oxford-comma -->\nflagged text\n</div>\n'
      );
      expect(d.isSuppressed('recheck/oxford-comma', 3)).toBe(true);
      expect(d.isSuppressed('recheck/oxford-comma', 2)).toBe(false);
      expect(d.isSuppressed('recheck/oxford-comma', 4)).toBe(false);
    });

    it('anchors correctly with CRLF line endings (a \\r\\n pair counts as one break)', () => {
      const d = parse(
        '<div>\r\n<!-- recheck-disable-next-line oxford-comma -->\r\nflagged text\r\n</div>\r\n'
      );
      expect(d.isSuppressed('recheck/oxford-comma', 3)).toBe(true);
      expect(d.isSuppressed('recheck/oxford-comma', 2)).toBe(false);
    });

    it('unknown-rule warning inside an HTML block points at the directive line, not the block start', () => {
      const d = parse('<div>\n<!-- recheck-disable no-such-rule -->\n</div>\n');
      expect(d.warnings).toHaveLength(1);
      expect(d.warnings[0].line).toBe(2);
    });
  });

  // Plain CRLF coverage (no multi-line block involved): the directive
  // machinery itself must be line-ending agnostic.
  it('disable-next-line works in a CRLF file', () => {
    const d = parse('<!-- recheck-disable-next-line oxford-comma -->\r\nflagged\r\nnot this\r\n');
    expect(d.isSuppressed('recheck/oxford-comma', 2)).toBe(true);
    expect(d.isSuppressed('recheck/oxford-comma', 3)).toBe(false);
  });
});
