import type { NormalizedRule } from '../types/index.js';

export interface FilterOptions {
  severity?: 'off' | 'info' | 'warn' | 'warning' | 'error';
  tags?: (string | number)[];
  /** Run only these rules (see `matchesRuleName` for accepted spellings). */
  rules?: string[];
  /** Run everything except these rules. */
  excludeRules?: string[];
}

export class UnknownRuleNameError extends Error {
  constructor(
    readonly unknown: string[],
    readonly available: string[]
  ) {
    super(`no rule in this configuration matches ${unknown.map((n) => `"${n}"`).join(', ')}`);
    this.name = 'UnknownRuleNameError';
  }
}

/**
 * A rule matches when the value equals its full config key (`recheck/us-spelling`)
 * or its `shortName`, which is the name the report prints.
 *
 * `shortName` only drops the `recheck/` prefix, so `google/passive-voice` stays as is.
 * Don't match on the last path segment: `no-trailing-punctuation` exists in `recheck/`,
 * `google/` and `microsoft/`, so a bare name would select three rules.
 */
export function matchesRuleName(rule: NormalizedRule, name: string): boolean {
  return rule.name === name || rule.shortName === name;
}

/** Keeps only the named rules. Unknown names throw, so a typo is not mistaken for a clean run. */
export function filterByRuleNames(rules: NormalizedRule[], names: string[]): NormalizedRule[] {
  if (!names.length) return rules;
  assertRuleNamesKnown(rules, names);
  return rules.filter((rule) => names.some((name) => matchesRuleName(rule, name)));
}

/** Removes the named rules. Matches names the same way as `filterByRuleNames`. */
export function excludeByRuleNames(rules: NormalizedRule[], names: string[]): NormalizedRule[] {
  if (!names.length) return rules;
  assertRuleNamesKnown(rules, names);
  return rules.filter((rule) => !names.some((name) => matchesRuleName(rule, name)));
}

/**
 * Throws `UnknownRuleNameError` for a name that matches none of `rules`. The
 * available list names each rule once, so `rules` can join two rule sets.
 */
export function assertRuleNamesKnown(rules: NormalizedRule[], names: string[]): void {
  const unknown = names.filter((name) => !rules.some((rule) => matchesRuleName(rule, name)));
  if (unknown.length > 0) {
    throw new UnknownRuleNameError(unknown, [...new Set(rules.map((rule) => rule.name))]);
  }
}

const SEVERITY_LEVELS: Record<string, number> = {
  off: -1,
  info: 0,
  warn: 1,
  warning: 1,
  error: 2,
};

export function filterEnabledRules(rules: NormalizedRule[]): {
  enabled: NormalizedRule[];
  disabledCount: number;
} {
  const enabled = rules.filter((rule) => rule.severity !== 'off');
  const disabledCount = rules.length - enabled.length;
  return { enabled, disabledCount };
}

export function filterBySeverity(rules: NormalizedRule[], minSeverity: string): NormalizedRule[] {
  const minLevel = SEVERITY_LEVELS[minSeverity];
  if (minLevel === undefined) return rules;

  return rules.filter((rule) => {
    // 'warning' is an old spelling of 'warn'.
    const ruleSeverity = (rule.severity as string) === 'warning' ? 'warn' : rule.severity;
    const ruleLevel = SEVERITY_LEVELS[ruleSeverity];
    return ruleLevel >= minLevel;
  });
}

export function filterByTags(rules: NormalizedRule[], tags: (string | number)[]): NormalizedRule[] {
  if (!tags.length) return rules;

  return rules.filter((rule) => rule.tags?.some((tag) => tags.includes(tag as string)));
}

export function applyFilters(
  rules: NormalizedRule[],
  options: FilterOptions
): {
  filtered: NormalizedRule[];
  disabledCount: number;
} {
  const { enabled, disabledCount } = filterEnabledRules(rules);
  let filtered = enabled;

  if (options.severity) {
    filtered = filterBySeverity(filtered, options.severity);
  }

  if (options.tags?.length) {
    filtered = filterByTags(filtered, options.tags);
  }

  // Name filters run last, so they only narrow what the other filters kept.
  if (options.rules?.length) {
    filtered = filterByRuleNames(filtered, options.rules);
  }

  if (options.excludeRules?.length) {
    filtered = excludeByRuleNames(filtered, options.excludeRules);
  }

  return { filtered, disabledCount };
}
