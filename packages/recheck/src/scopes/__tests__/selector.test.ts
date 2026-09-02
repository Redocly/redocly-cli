import { describe, expect, it } from 'vitest';

import { compileSelector, wholeDocumentKeywordProblems } from '../selector.js';
import type { ScopedSegment } from '../types.js';
import { BASE_SCOPES } from '../vocabulary.js';

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
    // scope: ['all'] must mean the same thing as scope: all — extractScopes
    // never emits segments named 'all'/'raw', so compiling them into name
    // predicates would silently match nothing.
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

// 'all'/'raw' are whole-document keywords, not segment names — extractScopes
// never emits segments with those scopes. As a conjunction term
// ('heading & all') they'd compile to a predicate that can never match, so
// the rule silently reports nothing; negated ('~all', '~raw') they'd match
// EVERY segment, silently meaning "everything" when the set-theoretic
// reading of ~all is "nothing". Config-driven entry points reject these at
// validation, but direct runRules callers skip validation — compileSelector
// must fail loudly rather than hand back a silently-wrong predicate (same
// rationale as normalizing ['all'] to null instead of a name predicate).
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

// Terms outside the scope vocabulary can only compile to silently-wrong
// predicates: an unknown conjunct ('heading & ALL' — case typo) never
// matches, so the whole rule lints nothing; a double negation ('~~code' —
// after the single ~-strip the term is '~code', unknown) matches EVERY
// segment, including the code it tried to exclude. Config-driven callers
// are protected by validation's unknown-scope check, but direct runRules
// callers skip validation — compileSelector must fail loudly, exactly as
// it already does for all/raw keyword misuse above.
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

// A selector that repeats the same mistake per clause ('all & all',
// 'bogus & bogus') must not report the identical message once per clause —
// problem lists are deduplicated order-preserving within a single selector.
describe('selector problem messages are deduplicated', () => {
  it('reports "all & all" once, not once per clause', () => {
    expect(wholeDocumentKeywordProblems('all & all')).toHaveLength(1);
  });

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

// Lock the FULL valid surface so the unknown-term rejection can never
// over-reach: every name the vocabulary considers valid — every BASE_SCOPES
// entry (including the 'default' alias and dotted 'table.*' forms), every
// heading.h1-h6 level, their negations and conjunctions — must keep
// compiling. Iterates the exported vocabulary itself so a scope name added
// to BASE_SCOPES later cannot silently break compilation.
describe('compileSelector — every vocabulary term compiles', () => {
  const aliasTargets: Record<string, string> = { default: 'summary' };
  const headingLevels = [
    'heading.h1',
    'heading.h2',
    'heading.h3',
    'heading.h4',
    'heading.h5',
    'heading.h6',
  ];
  const namedScopes = [...BASE_SCOPES.filter((s) => s !== 'all' && s !== 'raw'), ...headingLevels];

  /** Selectors from `selectors(scope)` that fail to compile, tagged by scope. */
  const failingToCompile = (
    scopes: string[],
    selectors: (scope: string) => (string | string[])[]
  ) =>
    scopes.flatMap((scope) =>
      selectors(scope).filter((selector) => {
        try {
          compileSelector(selector);
          return false;
        } catch {
          return true;
        }
      })
    );

  it('compiles every base scope bare and as a single-element array', () => {
    const failures = failingToCompile([...BASE_SCOPES, ...headingLevels], (scope) => [
      scope,
      [scope],
    ]);
    expect(failures).toEqual([]);
  });

  it('compiles every named scope negated and in a conjunction', () => {
    const failures = failingToCompile(namedScopes, (scope) => [
      `~${scope}`,
      `${scope} & ~${scope === 'code' ? 'heading' : 'code'}`,
    ]);
    expect(failures).toEqual([]);
  });

  it('matches every named scope against its own (alias-resolved) segment', () => {
    const nonMatching = namedScopes.filter((scope) => {
      const predicate = compileSelector(scope);
      if (predicate === null) throw new Error(`Expected non-null predicate for ${scope}`);
      return !predicate(seg(aliasTargets[scope] ?? scope));
    });
    expect(nonMatching).toEqual([]);
  });
});
