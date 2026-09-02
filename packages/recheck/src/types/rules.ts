import type { MarkdocUserConfig } from '../parser/markdoc/schema.js';
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

/**
 * A config as a user writes it: rule entries keyed by rule name, plus the
 * four engine-level keys that are not rules. `config/schema.ts` lists those
 * four alongside the rule keys, and `config/validate.ts` reads and strips
 * them before rule iteration.
 *
 * A rule entry is `Partial<BaseRule>` because a config that `extends` a
 * preset may set one field of a preset rule and inherit the rest (see
 * `mergeRule` in config/presets/index.ts). `severity`, `message` and
 * `assertions` are required on the MERGED rule, which the JSON schema
 * enforces at load time.
 *
 * The index signature is keyed on a template literal, not `string`: every
 * rule name contains a `/` (namespace/rule) and no engine-level key does,
 * so this keeps a rule entry from typing as a bare string or array and
 * keeps a misspelled engine key from typing as a rule.
 */
export type RecheckConfig = {
  extends?: string[];
  excludes?: string[];
  baseline?: string;
  markdoc?: boolean | MarkdocUserConfig;
  [ruleName: `${string}/${string}`]: Partial<BaseRule>;
};

/** The rule entries of a config, with the engine-level keys removed. */
export type RecheckRules = Record<string, BaseRule>;
