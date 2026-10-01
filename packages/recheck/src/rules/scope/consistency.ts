import { applyMatchCase } from '../../core/case-preserve.js';
import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { NormalizedRule, Problem, Fix, ConsistencyAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// One occurrence of the losing variant, with the winner it should become.
// Used by both execute() and fix().
interface ConsistencySite {
  line: number; // absolute source line
  column: number; // absolute source column
  text: string; // the losing match, as written in the source
  lineText: string; // the full segment-content line containing the match
  winner: string; // the first-seen variant, as written in the `either` config
  // False when the pair has a different number of words on each side (see
  // wordCount()). The problem is reported but not fixed.
  fixable: boolean;
}

// Counts words so we can skip fixing pairs like `it's` / `it is`. `it's` can mean
// "it is" or "it has", so a blind rewrite can be wrong. This also blocks safe pairs
// like `don't` / `do not`; that is accepted.
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// On the first line, `segment.content` can start in the middle of the source line
// (a heading's content skips the '## '), so add `startColumn`.
function toSourceColumn(segment: { startColumn: number }, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

// Used when the rule has no `message`. The two `%s` are the matched text and the
// first-seen variant.
const FALLBACK_MESSAGE = 'Inconsistent spelling: "%s" conflicts with first-seen "%s".';

// Shared by execute() and fix(). For each `either` pair, finds both variants in all
// segments. The variant that appears first in the file wins, and every later
// match of the other variant is a site. Matches found twice through overlapping
// scopes are counted once.
function collectMatches(rule: NormalizedRule, ctx: ScopeRuleContext): ConsistencySite[] {
  const options = (rule.assertions['consistency'] ?? {}) as ConsistencyAssertion;
  const flags = options.ignoreCase ? 'gi' : 'g';
  const sites: ConsistencySite[] = [];

  for (const [key, value] of Object.entries(options.either ?? {})) {
    // Only offer a fix when both sides have the same number of words.
    const fixable = wordCount(key) === wordCount(String(value));

    interface VariantMatch {
      line: number;
      column: number;
      text: string;
      lineText: string;
      variant: string;
    }
    const seen = new Set<string>();
    const matches: VariantMatch[] = [];

    for (const variant of [key, String(value)]) {
      // An empty variant would match almost everywhere. Skip it.
      if (variant.length === 0) continue;

      // Variants are plain text, so escape regex characters like the dots in 'e.g.'.
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, flags);
      for (const segment of ctx.segments) {
        // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF content.
        const contentLines = segment.content.split(newLineRe);
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(segment.content)) !== null) {
          const local = offsetToLineColumn(segment.content, match.index);
          const line = segment.startLine + local.line - 1;
          const column = toSourceColumn(segment, local.line, local.column);
          const positionKey = `${line}:${column}:${variant}`;
          if (seen.has(positionKey)) continue; // overlapping segments, same source occurrence
          seen.add(positionKey);
          matches.push({
            line,
            column,
            text: match[0],
            lineText: contentLines[local.line - 1] ?? '',
            variant,
          });
        }
      }
    }

    if (matches.length === 0) continue;
    matches.sort((a, b) => a.line - b.line || a.column - b.column);
    const winner = matches[0].variant;
    for (const found of matches) {
      if (found.variant !== winner) {
        sites.push({
          line: found.line,
          column: found.column,
          text: found.text,
          lineText: found.lineText,
          winner,
          fixable,
        });
      }
    }
  }

  // Sites are grouped by pair, so sort them into source order.
  sites.sort((a, b) => a.line - b.line || a.column - b.column);
  return sites;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  return collectMatches(rule, ctx).map((site) => ({
    file,
    line: site.line,
    column: site.column,
    text: site.lineText,
    match: site.text,
    ruleName: rule.name,
    severity: rule.severity,
    message: formatTemplate(rule.message ?? FALLBACK_MESSAGE, site.text, site.winner),
    fixable: site.fixable,
  }));
};

const fix = async (rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]> => {
  // Pairs with a different word count are reported by execute() but not fixed.
  return collectMatches(rule, ctx)
    .filter((site) => site.fixable)
    .map((site) => ({
      file,
      ruleName: rule.name,
      lineNumber: site.line,
      editColumn: site.column,
      deleteCount: site.text.length,
      // Keep the casing of the matched text, so with `ignoreCase` a sentence-initial
      // 'Behaviour' becomes 'Behavior', not 'behavior'.
      insertText: applyMatchCase(site.text, site.winner),
    }));
};

export const consistency: ScopeRule = { id: 'consistency', fixable: true, execute, fix };
