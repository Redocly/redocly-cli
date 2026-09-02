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
 * A rule matches a `--rule`/`--exclude-rule` value when the value equals its
 * full config key (`recheck/us-spelling`) or its `shortName` -- the exact
 * string the report prints, so you can filter by what you just read.
 *
 * `shortName` removes only the `recheck/` prefix (see config/validate.ts), so
 * a rule from another namespace keeps that namespace: `google/passive-voice`
 * stays `google/passive-voice`. Do not match on the last path segment
 * instead. Preset rule keys share 20 bare names -- `no-trailing-punctuation`
 * exists in `recheck/`, `google/`, and `microsoft/` -- so one bare name would
 * select three different rules at once.
 */
function matchesRuleName(rule: NormalizedRule, name: string): boolean {
  return rule.name === name || rule.shortName === name;
}

/**
 * Restricts the run to the named rules. Unknown names throw rather than
 * silently narrowing to nothing: a typo'd `--rule` that reported "no issues"
 * would read exactly like a clean run.
 */
export function filterByRuleNames(rules: NormalizedRule[], names: string[]): NormalizedRule[] {
  if (!names.length) return rules;
  const unknown = names.filter((name) => !rules.some((rule) => matchesRuleName(rule, name)));
  if (unknown.length > 0) {
    throw new UnknownRuleNameError(
      unknown,
      rules.map((rule) => rule.name)
    );
  }
  return rules.filter((rule) => names.some((name) => matchesRuleName(rule, name)));
}

/** Inverse of `filterByRuleNames`, with the same name matching and typo check. */
export function excludeByRuleNames(rules: NormalizedRule[], names: string[]): NormalizedRule[] {
  if (!names.length) return rules;
  const unknown = names.filter((name) => !rules.some((rule) => matchesRuleName(rule, name)));
  if (unknown.length > 0) {
    throw new UnknownRuleNameError(
      unknown,
      rules.map((rule) => rule.name)
    );
  }
  return rules.filter((rule) => !names.some((name) => matchesRuleName(rule, name)));
}

const SEVERITY_LEVELS: Record<string, number> = {
  off: -1,
  info: 0,
  warn: 1,
  warning: 1,
  error: 2,
};

/**
 * Filter out disabled rules (severity: 'off')
 */
export function filterEnabledRules(rules: NormalizedRule[]): {
  enabled: NormalizedRule[];
  disabledCount: number;
} {
  const enabled = rules.filter((rule) => rule.severity !== 'off');
  const disabledCount = rules.length - enabled.length;
  return { enabled, disabledCount };
}

/**
 * Filter rules by minimum severity level
 */
export function filterBySeverity(rules: NormalizedRule[], minSeverity: string): NormalizedRule[] {
  const minLevel = SEVERITY_LEVELS[minSeverity];
  if (minLevel === undefined) return rules;

  return rules.filter((rule) => {
    // A legacy config value ('warning') outside the current RuleSeverity union.
    const ruleSeverity = (rule.severity as string) === 'warning' ? 'warn' : rule.severity;
    const ruleLevel = SEVERITY_LEVELS[ruleSeverity];
    return ruleLevel >= minLevel;
  });
}

/**
 * Filter rules by tags
 */
export function filterByTags(rules: NormalizedRule[], tags: (string | number)[]): NormalizedRule[] {
  if (!tags.length) return rules;

  return rules.filter((rule) => rule.tags?.some((tag) => tags.includes(tag as string)));
}

/**
 * Apply all filters to rules
 */
export function applyFilters(
  rules: NormalizedRule[],
  options: FilterOptions
): {
  filtered: NormalizedRule[];
  disabledCount: number;
} {
  // Filter out disabled rules first
  const { enabled, disabledCount } = filterEnabledRules(rules);
  let filtered = enabled;

  // Filter by severity if specified
  if (options.severity) {
    filtered = filterBySeverity(filtered, options.severity);
  }

  // Filter by tags if specified
  if (options.tags?.length) {
    filtered = filterByTags(filtered, options.tags);
  }

  // Name filters run last so they can narrow whatever the broader filters left.
  if (options.rules?.length) {
    filtered = filterByRuleNames(filtered, options.rules);
  }

  if (options.excludeRules?.length) {
    filtered = excludeByRuleNames(filtered, options.excludeRules);
  }

  return { filtered, disabledCount };
}
