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
    tokenRulesByName.set(rule.name, rule);
    for (const alias of rule.aliases ?? []) {
      tokenRulesByName.set(alias, rule);
    }
  }
}

export function resolveAssertion(id: string): ResolvedAssertion {
  const scopeRule = scopeRules[id];
  if (scopeRule) return { kind: 'scope', rule: scopeRule };
  const rule = tokenRulesByName.get(id);
  if (rule) return { kind: 'token', rule };
  throw new Error(`Unknown assertion: ${id}`);
}

// Make all token rules available to the CLI and the library API.
registerTokenRules(allTokenRules);
