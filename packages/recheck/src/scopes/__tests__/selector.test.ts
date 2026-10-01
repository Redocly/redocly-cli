import { describe, expect, it } from 'vitest';

import { compileSelector } from '../selector.js';
import type { ScopedSegment } from '../types.js';

const seg = (scope: string): ScopedSegment => ({
  scope,
  content: '',
  startLine: 1,
  startColumn: 1,
  endLine: 1,
  endColumn: 1,
  tokens: [],
});

describe('compileSelector', () => {
  it('returns null for all/raw/undefined', () => {
    expect(compileSelector(undefined)).toBeNull();
    expect(compileSelector('all')).toBeNull();
    expect(compileSelector('raw')).toBeNull();
  });

  it('treats single-element array form of all/raw the same as the bare string', () => {
    // `scope: ['all']` must mean the same as `scope: all`.
    expect(compileSelector(['all'])).toBeNull();
    expect(compileSelector(['raw'])).toBeNull();
  });

  it('matches exact scopes and heading prefixes', () => {
    const exact = compileSelector('heading.h2');
    if (exact === null) throw new Error('Expected non-null predicate');
    expect(exact(seg('heading.h2'))).toBe(true);
    expect(exact(seg('heading.h3'))).toBe(false);
    const prefix = compileSelector('heading');
    if (prefix === null) throw new Error('Expected non-null predicate');
    expect(prefix(seg('heading.h1'))).toBe(true);
    expect(prefix(seg('heading.h6'))).toBe(true);
    expect(prefix(seg('paragraph'))).toBe(false);
  });

  it('treats arrays as OR', () => {
    const p = compileSelector(['heading.h1', 'heading.h2']);
    if (p === null) throw new Error('Expected non-null predicate');
    expect(p(seg('heading.h1'))).toBe(true);
    expect(p(seg('heading.h3'))).toBe(false);
  });

  it('supports negation and conjunction', () => {
    const p = compileSelector(['~blockquote & ~heading']);
    if (p === null) throw new Error('Expected non-null predicate');
    expect(p(seg('paragraph'))).toBe(true);
    expect(p(seg('blockquote'))).toBe(false);
    expect(p(seg('heading.h2'))).toBe(false);
  });

  it('aliases default to summary', () => {
    const p = compileSelector('default');
    if (p === null) throw new Error('Expected non-null predicate');
    expect(p(seg('summary'))).toBe(true);
  });
});

// 'all' and 'raw' are whole-document keywords. In a compound ('heading & all') they would never
// match, and negated ('~all') they would match every segment, so `compileSelector` must throw.
describe('compileSelector — all/raw as compound or negated terms', () => {
  it('throws for all/raw inside a conjunction', () => {
    expect(() => compileSelector('heading & all')).toThrow(/cannot be combined/);
    expect(() => compileSelector(['heading & all'])).toThrow(/cannot be combined/);
    expect(() => compileSelector('raw & code')).toThrow(/cannot be combined/);
  });

  it('throws for negated ~all/~raw, standalone or inside a conjunction', () => {
    expect(() => compileSelector('~all')).toThrow(/not meaningful/);
    expect(() => compileSelector(['~all'])).toThrow(/not meaningful/);
    expect(() => compileSelector('~raw')).toThrow(/not meaningful/);
    expect(() => compileSelector('~code & ~all')).toThrow(/not meaningful/);
  });

  it('still accepts the valid whole-document and compound forms', () => {
    expect(compileSelector('all')).toBeNull();
    expect(compileSelector('raw')).toBeNull();
    expect(compileSelector(['all'])).toBeNull();
    expect(compileSelector(['raw'])).toBeNull();
    const conj = compileSelector('heading & ~code');
    if (conj === null) throw new Error('Expected non-null predicate');
    expect(conj(seg('heading.h2'))).toBe(true);
    expect(conj(seg('code'))).toBe(false);
    const neg = compileSelector(['~code']);
    if (neg === null) throw new Error('Expected non-null predicate');
    expect(neg(seg('paragraph'))).toBe(true);
    expect(neg(seg('code'))).toBe(false);
  });
});

// Unknown terms must throw: 'heading & ALL' (typo) would never match, and '~~code' would match
// every segment, including code.
describe('compileSelector — unknown terms', () => {
  it('throws for an unknown term inside a conjunction (case typo)', () => {
    expect(() => compileSelector('heading & ALL')).toThrow(/unknown scope "ALL"/);
    expect(() => compileSelector(['heading & ALL'])).toThrow(/unknown scope "ALL"/);
  });

  it('throws for a double-negated term instead of matching everything', () => {
    expect(() => compileSelector('~~code')).toThrow(/unknown scope "~code"/);
    expect(() => compileSelector(['~~code'])).toThrow(/unknown scope "~code"/);
  });

  it('throws for bare and array-entry unknown scope names', () => {
    expect(() => compileSelector('headings')).toThrow(/unknown scope "headings"/);
    expect(() => compileSelector(['heading', 'bogus'])).toThrow(/unknown scope "bogus"/);
    expect(() => compileSelector('heading.h7')).toThrow(/unknown scope "heading.h7"/);
  });

  it('throws for empty clauses and a bare negation marker', () => {
    expect(() => compileSelector('heading & ')).toThrow(/empty clause/);
    expect(() => compileSelector('~')).toThrow(/missing scope name/);
  });
});

// A repeated mistake ('all & all', 'bogus & bogus') must be reported once, not once per clause.
describe('selector problem messages are deduplicated', () => {
  it('compileSelector error mentions each distinct problem once', () => {
    const count = (selector: string, pattern: RegExp): number => {
      try {
        compileSelector(selector);
      } catch (error) {
        return ((error as Error).message.match(pattern) ?? []).length;
      }
      throw new Error(`Expected compileSelector('${selector}') to throw`);
    };
    expect(count('all & all', /cannot be combined/g)).toBe(1);
    expect(count('bogus & bogus', /unknown scope "bogus"/g)).toBe(1);
  });
});
