import { capitalization } from './scope/capitalization.js';
import { conditional } from './scope/conditional.js';
import { consistency } from './scope/consistency.js';
import { length } from './scope/length.js';
import { maxImageSize } from './scope/max-image-size.js';
import { metric } from './scope/metric.js';
import { occurrence } from './scope/occurrence.js';
import { pattern } from './scope/pattern.js';
import { repetition } from './scope/repetition.js';
import { semanticLineBreaks } from './scope/semantic-line-breaks.js';
import { spelling } from './scope/spelling.js';
import { swap } from './scope/swap.js';
import { allTokenRules } from './token/index.js';
import type { ScopeRule, TokenRule } from './types.js';

// `no-trailing-spaces` and `no-hard-tabs` are token rules with no legacy
// scope-rule entry under their own id, so `resolveAssertion` falls straight
// through to them with no alias needed. `single-h1`/`first-line-h1` each
// carry a permanent, warning-free `aliases` entry (`single-title`/
// `first-line-heading`) for their upstream markdownlint synonym — see
// TokenRule.aliases below and each rule's own file. That's the only
// remaining use of the alias mechanism: the pre-parity native rule ids this
// registry used to translate (`max-line-length`, `bullet-style`,
// `no-duplicate-headings`, `no-broken-fragment-links`) were removed
// entirely rather than kept as deprecated aliases (see PR #24801) — using
// one of those old ids in a config is now an unknown-assertion validation
// error, like any other unrecognized id.
export const scopeRules: Record<string, ScopeRule> = {
  swap,
  pattern,
  'semantic-line-breaks': semanticLineBreaks,
  'max-image-size': maxImageSize,
  occurrence,
  repetition,
  consistency,
  conditional,
  capitalization,
  metric,
  spelling,
  length,
};
export const tokenRules: TokenRule[] = [];

export function getScopeRule(id: string): ScopeRule {
  const rule = scopeRules[id];
  if (!rule) throw new Error(`Unknown assertion: ${id}`);
  return rule;
}

export type ResolvedAssertion =
  | { kind: 'scope'; rule: ScopeRule }
  | { kind: 'token'; rule: TokenRule };

const tokenRulesByName = new Map<string, TokenRule>();

export function registerTokenRules(rules: TokenRule[]): void {
  for (const rule of rules) {
    // Dedupe is by object identity — re-registering the same module is a no-op; two different objects sharing a name would both land in tokenRules (last one wins in the name map).
    if (!tokenRules.includes(rule)) tokenRules.push(rule);
    tokenRulesByName.set(rule.name, rule);
    for (const alias of rule.aliases ?? []) {
      tokenRulesByName.set(alias, rule);
    }
  }
}

export function clearTokenRulesForTests(): void {
  tokenRules.length = 0;
  tokenRulesByName.clear();
}

export function resolveAssertion(id: string): ResolvedAssertion {
  const scopeRule = scopeRules[id];
  if (scopeRule) return { kind: 'scope', rule: scopeRule };
  const rule = tokenRulesByName.get(id);
  if (rule) return { kind: 'token', rule };
  throw new Error(`Unknown assertion: ${id}`);
}

// Registers every ported markdownlint token rule (see ./token/index.ts) so
// production entry points (the CLI, the public library API) have the full
// rule set available without each one needing its own registration wiring
// — mirroring how `scopeRules` above is populated by direct imports in
// this same file. Runs once at module load, after registerTokenRules is
// defined; token/index.ts has no dependency back on this module (it only
// imports rule types), so this is a plain one-directional import, not a
// circular one.
registerTokenRules(allTokenRules);
