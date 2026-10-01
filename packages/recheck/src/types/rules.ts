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
  // Optional: `validate` fills a token rule's message from its `defaults`.
  // The schema then requires a message, so a scope rule must set one.
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
  // `validate` always sets it. A caller that builds rules for `runRules` can
  // omit it; a token rule then uses its `defaults.message`.
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
 * A config as a user writes it: rule entries keyed by rule name, plus the engine-level keys
 * that are not rules. A rule entry is `Partial<BaseRule>` because a config that `extends` a
 * preset can set only some fields of a preset rule. `severity`, `message` and `assertions`
 * are required on the merged rule (the JSON schema checks this). Rule names always contain a
 * `/` and engine-level keys never do, which the index signature relies on.
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
