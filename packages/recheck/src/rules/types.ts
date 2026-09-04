import type { MarkdocPairing } from '../parser/markdoc/pairing.js';
import type { MarkdocSchema } from '../parser/markdoc/schema.js';
import type { TokenTree } from '../parser/types.js';
import type { ScopedSegment } from '../scopes/types.js';
import type { Fix, NormalizedRule, Problem, RuleSeverity } from '../types/index.js';

export interface ScopeRuleContext {
  segments: ScopedSegment[]; // ALL segments matching the rule's scope (whole file)
  content: string; // full file content
  tree: TokenTree;
  fileMetadata?: { images: Map<string, { path: string; size: number; exists: boolean }> };
}

export interface ScopeRule {
  id: string; // assertion id, e.g. 'swap'
  fixable: boolean;
  execute(rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Problem[]>;
  fix?(rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]>;
}

export interface TokenRuleOnErrorInfo {
  line: number;
  column?: number;
  detail?: string;
  context?: string;
  fixInfo?: Omit<Fix, 'file' | 'ruleName'>;
  /**
   * Per-report severity override, unset almost everywhere: every other token
   * rule reports at the single severity its config entry specifies.
   * `markdoc-attributes` is the one rule that needs it, because the severity
   * belongs to the kind of violation rather than to the rule — a missing
   * required attribute or an enum violation is an error, while an unknown
   * attribute is only a warning — and one rule-level `severity` cannot express
   * both. Set only on the unknown-attribute reports, where it wins over
   * whatever severity the rule is configured at.
   *
   * Excludes `'off'`: this field may only lower a report to a severity that
   * still reports. Disabling a rule is `severity: 'off'` in the config, which
   * is rule-wide; letting a single report opt out of `off` would let a rule
   * keep reporting through a config that turned it off.
   */
  severity?: Exclude<RuleSeverity, 'off'>;
}

export interface TokenRuleContext {
  tree: TokenTree;
  lines: string[];
  /** Path of the file under check, for rules that resolve relative link targets. */
  filePath: string;
  config: Record<string, unknown>;
  onError(info: TokenRuleOnErrorInfo): void;
  /**
   * Markdoc schema and pairing, computed once per file by the runner the same
   * way `lines` is, and only when `RunnerOptions.markdoc` is on. Absent
   * entirely otherwise, in which case no `markdocTag` tokens exist for a rule
   * to look at either. `schema` is `null` when no schema is configured:
   * parsing and pairing still run, there is just nothing to check tag and
   * attribute names against.
   */
  markdoc?: {
    schema: MarkdocSchema | null;
    /**
     * Tag names the schema declares self-closing, computed once per run by the
     * runner and empty when no schema is configured. Provided so a rule that
     * needs the set — `markdoc-pairing`, for its check that a self-closing tag
     * wasn't given a closing tag — uses the same set the pairing pass was
     * given, rather than re-deriving it from `schema` on every file.
     */
    selfClosingTags: ReadonlySet<string>;
    pairing: MarkdocPairing;
  };
}

export interface TokenRule {
  name: string; // canonical name, e.g. 'heading-increment'
  aliases?: string[];
  tags: string[];
  fixable: boolean;
  defaults: Record<string, unknown>;
  check(ctx: TokenRuleContext): void;
}
