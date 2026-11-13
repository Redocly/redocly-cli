import type { MarkdocPairing } from '../parser/markdoc/pairing.js';
import type { MarkdocSchema } from '../parser/markdoc/schema.js';
import type { TokenTree } from '../parser/types.js';
import type { ScopedSegment } from '../scopes/types.js';
import type { Fix, NormalizedRule, Problem, RuleSeverity } from '../types/index.js';

export interface ScopeRuleContext {
  segments: ScopedSegment[]; // all segments matching the rule's scope
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
   * Overrides the rule's severity for this report. Used by `markdoc-attributes` for unknown
   * attributes, which are only warnings. `'off'` is not allowed.
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
   * Markdoc schema and pairing for the file. Absent when markdoc parsing is off.
   * `schema` is `null` when no schema is configured.
   */
  markdoc?: {
    schema: MarkdocSchema | null;
    /** Tag names the schema declares self-closing. Empty when there is no schema. */
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
