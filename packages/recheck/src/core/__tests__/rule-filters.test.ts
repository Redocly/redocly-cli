import { describe, it, expect } from 'vitest';

import type { NormalizedRule } from '../../types/index.js';
import {
  applyFilters,
  filterByRuleNames,
  excludeByRuleNames,
  UnknownRuleNameError,
} from '../rule-filters.js';

function rule(name: string, overrides: Partial<NormalizedRule> = {}): NormalizedRule {
  return {
    name,
    // Same derivation config/validate.ts uses: strip only the `recheck/`
    // prefix, so a rule from another namespace keeps it.
    shortName: name.replace(/^recheck\//, ''),
    severity: 'error',
    message: 'm',
    assertions: {},
    ...overrides,
  } as NormalizedRule;
}

/** Returns the thrown error so assertions can stay out of a catch block. */
function captureError(fn: () => unknown): UnknownRuleNameError {
  try {
    fn();
  } catch (error) {
    return error as UnknownRuleNameError;
  }
  throw new Error('expected the call to throw, but it returned');
}

const RULES = [
  rule('recheck/us-spelling'),
  rule('recheck/no-gerund-headings'),
  rule('google/passive-voice', { tags: ['voice'] as never }),
];

describe('filterByRuleNames', () => {
  it('keeps only the named rule, matched by its full config key', () => {
    const kept = filterByRuleNames(RULES, ['recheck/us-spelling']);
    expect(kept.map((r) => r.name)).toEqual(['recheck/us-spelling']);
  });

  it('also matches the short name the report prints', () => {
    const kept = filterByRuleNames(RULES, ['us-spelling']);
    expect(kept.map((r) => r.name)).toEqual(['recheck/us-spelling']);
  });

  it('accepts several names at once and keeps config order', () => {
    const kept = filterByRuleNames(RULES, ['google/passive-voice', 'us-spelling']);
    expect(kept.map((r) => r.name)).toEqual(['recheck/us-spelling', 'google/passive-voice']);
  });

  it('a namespaced rule needs its namespace — the bare name does not match it', () => {
    // `shortName` strips only `recheck/`, so the report prints
    // "google/passive-voice". Matching the last path segment instead would
    // make one bare name select several rules: 20 bare names are shared
    // across the shipped presets (`no-trailing-punctuation` is in `recheck/`,
    // `google/`, and `microsoft/`).
    expect(() => filterByRuleNames(RULES, ['passive-voice'])).toThrow(UnknownRuleNameError);
  });

  it('a bare name selects only the recheck/ rule when other namespaces share it', () => {
    const shared = [
      rule('recheck/no-trailing-punctuation'),
      rule('google/no-trailing-punctuation'),
      rule('microsoft/no-trailing-punctuation'),
    ];
    const kept = filterByRuleNames(shared, ['no-trailing-punctuation']);
    expect(kept.map((r) => r.name)).toEqual(['recheck/no-trailing-punctuation']);
  });

  it('throws on a name no rule matches, naming it and what is available', () => {
    // A misspelled name must not narrow the run to nothing: a silent empty
    // run reports "no issues found", which looks the same as a clean document set.
    const call = () => filterByRuleNames(RULES, ['us-speling']);
    expect(call).toThrow(UnknownRuleNameError);

    const error = captureError(call);
    expect(error.unknown).toEqual(['us-speling']);
    expect(error.available).toContain('recheck/us-spelling');
    expect(error.message).toContain('us-speling');
  });

  it('is a no-op when no names are given', () => {
    expect(filterByRuleNames(RULES, [])).toHaveLength(3);
  });
});

describe('excludeByRuleNames', () => {
  it('drops the named rule and keeps the rest', () => {
    const kept = excludeByRuleNames(RULES, ['us-spelling']);
    expect(kept.map((r) => r.name)).toEqual(['recheck/no-gerund-headings', 'google/passive-voice']);
  });

  it('throws on an unknown name, same as the inclusive filter', () => {
    expect(() => excludeByRuleNames(RULES, ['nope'])).toThrow(UnknownRuleNameError);
  });
});

describe('applyFilters composition', () => {
  it('name filters narrow what the other filters left', () => {
    const { filtered } = applyFilters(RULES, { tags: ['voice'], rules: ['google/passive-voice'] });
    expect(filtered.map((r) => r.name)).toEqual(['google/passive-voice']);
  });

  it('a rule excluded by tags is not resurrected by --rule', () => {
    // --rule narrows; it never widens. Filtering to the `voice` tag drops
    // us-spelling, so naming it afterwards can only fail to match.
    expect(() => applyFilters(RULES, { tags: ['voice'], rules: ['us-spelling'] })).toThrow(
      UnknownRuleNameError
    );
  });

  it('--rule and --exclude-rule combine', () => {
    const { filtered } = applyFilters(RULES, {
      rules: ['us-spelling', 'no-gerund-headings'],
      excludeRules: ['no-gerund-headings'],
    });
    expect(filtered.map((r) => r.name)).toEqual(['recheck/us-spelling']);
  });

  it('severity: off rules are still dropped before name filtering', () => {
    const withOff = [...RULES, rule('recheck/disabled-one', { severity: 'off' })];
    const { disabledCount } = applyFilters(withOff, {});
    expect(disabledCount).toBe(1);
    expect(() => applyFilters(withOff, { rules: ['disabled-one'] })).toThrow(UnknownRuleNameError);
  });
});
