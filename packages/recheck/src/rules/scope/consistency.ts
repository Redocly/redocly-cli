import { applyMatchCase } from '../../core/case-preserve.js';
import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { NormalizedRule, Problem, Fix, ConsistencyAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// One occurrence of the LOSING variant, at its absolute source position,
// plus the winner it should be rewritten to. execute() and fix() both
// consume this exact list, so they agree by construction.
interface ConsistencySite {
  line: number; // absolute source line
  column: number; // absolute source column
  text: string; // the losing match, as written in the source
  lineText: string; // the full segment-content line containing the match
  winner: string; // the first-seen variant, AS WRITTEN in the `either` config
  // Same-word-count guard (see wordCount() below): false means this PAIR's
  // key/value cross a word-count boundary, so fix() must skip this site even
  // though execute() still reports it. Carried per-site (not just per-pair)
  // so fix() can filter the shared collectMatches() output with no
  // re-derivation.
  fixable: boolean;
}

// Mechanical proxy for "is this pair a same-word normalization (safe to
// rewrite blindly) or a substitution that can expand ambiguously (not
// safe)?" -- same shape as applyMatchCase's multi-word guard in
// case-preserve.ts: a checkable structural property (word count) that
// correlates with the semantic hazard, rather than an attempt to
// understand the words themselves. `colour`/`color` is one word either
// way. `it's`/`it is` is one word vs. two -- and that word-count jump is
// exactly where the ambiguity lives: `it's` expands to EITHER "it is" OR
// "it has", so picking "it is" as the winner and rewriting every "it's" to
// it is flat wrong whenever the source meant "it has" (see this file's
// fix() doc comment and the bug this guard closes: "It is fine. ... it's
// been growing for hours." -> "it is been growing for hours."). Splitting
// on whitespace is deliberately simple -- like applyMatchCase's `/\s/`
// check, it does not try to be a linguistic word tokenizer, just a cheap,
// reliable signal for "the replacement isn't shaped like the match
// any more."
//
// KNOWN EDGE, not fixed here (false positive, accepted cost): this guard
// cannot distinguish "crosses a word boundary AND is ambiguous" (`it's` ->
// EITHER "it is" or "it has") from "crosses a word boundary but has only
// ONE possible expansion" (`don't` -> always "do not", never anything
// else). `microsoft/contraction-consistency` ships exactly this shape
// alongside `it's`/`it is`: `don't`/`do not`, `won't`/`will not`, and
// `isn't`/`is not` are each a single, unambiguous contraction/expansion
// pair (1 word vs. 2), and this guard blocks fixing all three, same as it
// blocks `it's`/`it is` -- even though, unlike `it's`, none of them has a
// second meaning a blind rewrite could pick wrong. `can't`/`cannot` is the
// one pair in that same rule the guard does NOT block, only because
// "cannot" happens to be written as one word rather than two ("can not"
// would trip the guard identically, despite being just as unambiguous as
// "do not"). Word count is a proxy for "may be ambiguous," not a test of
// ambiguity itself, so it necessarily also catches unambiguous pairs that
// merely happen to differ in word count -- the same shape as
// applyMatchCase's own accepted edge (a hyphen-only replacement counts as
// "one word" and still gets shouted). Narrowing further (e.g. a hand-listed
// exception for "known-unambiguous" contractions) would repeat the exact
// per-pair-criterion pattern this whole change retires elsewhere in this
// package -- so the false positive is accepted, not patched, and recorded
// here so it is a known trade-off rather than an undocumented side effect.
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// On the segment's first line, segment.content starts mid-source-line (e.g.
// a heading's content excludes the '## ' marker), so segment.startColumn
// must be added -- see pattern.ts's toSourceColumn.
function toSourceColumn(segment: { startColumn: number }, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

// Fallback when a programmatically-built rule has no `message` (validate()
// requires one). %s slots: matched text, then the first-seen winner.
const FALLBACK_MESSAGE = 'Inconsistent spelling: "%s" conflicts with first-seen "%s".';

// Shared by execute() and fix(). For each `either` pair, scans ALL segments
// for BOTH variants (regex-escaped literals with \b word boundaries, like
// `swap` keys), maps every match to its absolute source position, then:
//
// 1. Dedupes by `line:column:variant` BEFORE deciding the winner:
//    overlapping scopes (e.g. `[paragraph, sentence]`) match the same
//    source occurrence once per covering segment, double-counting it and
//    scrambling which variant looks 'first'.
// 2. Sorts by (line, column): the winner is the first match in SOURCE
//    ORDER, file-wide -- not collection order, which scans the pair's key
//    before its value and would always crown the key.
//
// Every later match of the OTHER (losing) variant yields one site.
function collectMatches(rule: NormalizedRule, ctx: ScopeRuleContext): ConsistencySite[] {
  const options = (rule.assertions['consistency'] ?? {}) as ConsistencyAssertion;
  const flags = options.ignoreCase ? 'gi' : 'g';
  const sites: ConsistencySite[] = [];

  for (const [key, value] of Object.entries(options.either ?? {})) {
    // Same-word-count guard, computed once per PAIR (not per occurrence):
    // whichever variant wins first-seen, a fix is only offered when the key
    // and value are the same number of words. See wordCount()'s doc comment
    // above for why a word-count mismatch (e.g. `it's` vs. `it is`) is
    // exactly where a contraction's ambiguous expansion lives.
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
      // An empty variant (only reachable when a caller bypasses validate())
      // would escape to the zero-width `\b\b`, matching nearly every
      // position and spuriously winning as "first-seen". Skip it.
      if (variant.length === 0) continue;

      // Same escaping as swap keys: variants are literals, so regex
      // metacharacters (e.g. 'e.g.') must not act as syntax.
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, flags);
      for (const segment of ctx.segments) {
        // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF content.
        const contentLines = segment.content.split(newLineRe);
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(segment.content)) !== null) {
          // No zero-width guard needed (unlike swap/conditional/repetition):
          // the empty-variant skip above guarantees `escaped` is a non-empty
          // literal, and \b...\b only adds zero-width assertions around it,
          // so `match[0]` can never be empty here.
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

  // Pairs are processed one at a time, so multi-pair results arrive grouped
  // by pair; re-sort so problems/fixes read in source order.
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
  // Same-word-count guard (see wordCount()'s doc comment above): a
  // different-word-count pair (e.g. `it's`/`it is`) still gets REPORTED by
  // execute() above -- collectMatches() doesn't distinguish the two
  // functions -- but must never be auto-fixed, so it's filtered out here,
  // after collection, rather than skipped during collection itself.
  return collectMatches(rule, ctx)
    .filter((site) => site.fixable)
    .map((site) => ({
      file,
      ruleName: rule.name,
      lineNumber: site.line,
      editColumn: site.column,
      deleteCount: site.text.length,
      // Apply the MATCHED text's observed casing to the winner, not the
      // winner as authored in config: with `ignoreCase: true`, a
      // sentence-initial 'Behaviour' would otherwise be replaced by the
      // literal (lowercase-first) authored winner 'behavior', silently
      // lowercasing the start of the sentence -- the exact hazard
      // applyMatchCase exists to prevent, and swap.ts:177 already guards
      // against for the `swap` assertion. `consistency` shares the same
      // ignoreCase/fix shape, so it needs the same guard.
      insertText: applyMatchCase(site.text, site.winner),
    }));
};

export const consistency: ScopeRule = { id: 'consistency', fixable: true, execute, fix };
