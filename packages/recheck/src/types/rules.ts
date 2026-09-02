import type { AssertionConfig } from './assertions.js';

export type RuleSeverity = 'off' | 'info' | 'warn' | 'error';

export type RuleScope =
  | 'all'
  | 'heading'
  | 'sentence'
  | 'paragraph'
  | 'code'
  | 'default'
  | 'raw'
  | string
  | string[];

export interface BaseRule {
  severity: RuleSeverity;
  // Optional at the type level only: token rules fall back to their own
  // `defaults.message` (see formatTokenMessage in rules/token/messages.ts)
  // when a config entry omits it. The config schema (schema.ts) still lists
  // `message` under `required` for user-facing validation — scope rules have
  // no default-message mechanism and still need it enforced there. This
  // narrower type-level change only lets code (e.g. the token-rule test
  // harness and preset registration) construct a rule without a message
  // without fighting the compiler.
  message?: string;
  tags?: string[];
  description?: string;
  link?: string;
  scope?: RuleScope;
  appliesTo?: string[];
  excludes?: string[];
  exceptions?: {
    files?: string[];
    lines?: string[];
  };
  fix?: boolean;
  assertions: Record<string, AssertionConfig>;
}

export interface NormalizedRule {
  name: string;
  shortName: string;
  severity: RuleSeverity;
  // See BaseRule.message — optional at the type level for the same reason.
  message?: string;
  tags?: string[];
  description?: string;
  link?: string;
  scope?: RuleScope;
  appliesTo?: string[];
  excludes?: string[];
  exceptions?: {
    files?: string[];
    lines?: string[];
  };
  fix?: boolean;
  assertions: Record<string, AssertionConfig>;
}

export interface RecheckConfig {
  [key: string]: BaseRule;
}
