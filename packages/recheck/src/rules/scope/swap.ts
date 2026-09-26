import { applyMatchCase } from '../../core/case-preserve.js';
import { overlapsAnyRange } from '../../core/inline-code.js';
import { offsetToLineColumn } from '../../core/line-endings.js';
import type { NormalizedRule, Problem, Fix, SwapAssertion } from '../../types/index.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';
import { nonProseRanges } from '../utils.js';

interface SwapMatch {
  line: number;
  column: number;
  match: string;
  replacement: string;
}

interface RawSwapMatch {
  index: number;
  match: string;
  replacement: string;
}

// De-overlap matches from DIFFERENT pairs by source span: when two matches
// overlap, keep the LONGER one (ties: the earlier-starting one; identical
// spans: first pair in config order, via the sort's stability). Without
// this, a compound pair like 'he/she' overlapping standalone keys ('he',
// 'she') emitted all three matches and --fix corrupted 'he/she' to
// 'they/they'. Zero-width matches have an empty span, so they never
// overlap anything and pass through unchanged.
function dropOverlappedShorterMatches(raw: RawSwapMatch[]): RawSwapMatch[] {
  const byPriority = [...raw].sort((a, b) => b.match.length - a.match.length || a.index - b.index);
  const kept: RawSwapMatch[] = [];
  for (const candidate of byPriority) {
    const overlapsKept = kept.some(
      (winner) =>
        candidate.index < winner.index + winner.match.length &&
        winner.index < candidate.index + candidate.match.length
    );
    if (!overlapsKept) kept.push(candidate);
  }
  return kept.sort((a, b) => a.index - b.index);
}

// Prose rules must not lint code: a swap like master -> primary would fire
// inside `git checkout master`, the usage Google's guide explicitly
// sanctions in code font. The same goes for a markdoc tag's span, which is
// markup, not prose.
//
// `content` is the original segment content -- the regex always runs against it
// directly, never against a masked stand-in, because an arbitrary user regex
// such as a negated-class `keysAreRegex` key like `[^\s,]+` can match straight
// through a masked run. A match whose span overlaps an `excluded` entry (inline
// code spans and masked markdoc tag spans -- see `nonProseRanges`) is skipped
// below rather than recorded.
function findMatches(
  content: string,
  excluded: Array<{ start: number; end: number }>,
  options: SwapAssertion
): SwapMatch[] {
  const raw: RawSwapMatch[] = [];
  const pairs = options.pairs || {};
  for (const [from, to] of Object.entries(pairs)) {
    // An empty pair key (only reachable when a caller bypasses validate())
    // would escape to a zero-width pattern matching nearly every position,
    // flooding every segment with problems. Skip it, same as
    // consistency.ts's empty-variant skip.
    if (String(from).length === 0) continue;

    const escaped = options.keysAreRegex
      ? from
      : String(from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = options.wordBoundary ? `\\b${escaped}\\b` : escaped;
    const flags = options.ignoreCase ? 'gi' : 'g';
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      // ignore an invalid regex key (reachable via keysAreRegex) -- this
      // pair only, so the rule's other pairs still run.
      continue;
    }
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      // A zero-width match (e.g. a `keysAreRegex` pattern like `a*`) never
      // advances lastIndex on its own -- bump it or the loop hangs. It's
      // also semantically meaningless for swap (there's no text to find or
      // replace), so skip recording it too -- otherwise --fix would turn
      // every such position into a zero-length insert, rewriting the file
      // at every character offset the pattern passes through.
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      const matchEnd = match.index + match[0].length;
      if (overlapsAnyRange(match.index, matchEnd, excluded)) {
        continue;
      }
      raw.push({
        index: match.index,
        match: content.slice(match.index, match.index + match[0].length),
        replacement: String(to),
      });
    }
  }
  return dropOverlappedShorterMatches(raw).map(({ index, match, replacement }) => {
    // offsetToLineColumn (never a bare '\n' split): on a CR-only file a
    // '\n'-based mapping kept every match on line 1 with a column
    // counted from the start of the content, so --fix edited the wrong
    // position entirely.
    const { line, column } = offsetToLineColumn(content, index);
    return { line, column, match, replacement };
  });
}

// A match's `column` from findMatches() is relative to its own line within
// segment.content. On the segment's first line, segment.content starts
// mid-source-line (e.g. a heading segment's content excludes the '## '
// marker), so segment.startColumn must be added to get the true source
// column. Matches on later lines start at source column 1, so they're
// unaffected.
function toSourceColumn(segment: { startColumn: number }, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const options = rule.assertions['swap'] as SwapAssertion;
  const problems: Problem[] = [];
  for (const segment of ctx.segments) {
    const excluded = nonProseRanges(segment, options.includeCode);
    for (const found of findMatches(segment.content, excluded, options)) {
      problems.push({
        file,
        line: segment.startLine + found.line - 1,
        column: toSourceColumn(segment, found.line, found.column),
        // Legacy convention (text === match), kept as-is to avoid changing
        // swap's reported output.
        text: found.match,
        match: found.match,
        ruleName: rule.name,
        severity: rule.severity,
        message: (rule.message ?? '').replace('%s', found.replacement).replace('%s', found.match),
      });
    }
  }
  return problems;
};

const fix = async (rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]> => {
  const options = rule.assertions['swap'] as SwapAssertion;
  const fixes: Fix[] = [];
  for (const segment of ctx.segments) {
    const excluded = nonProseRanges(segment, options.includeCode);
    for (const found of findMatches(segment.content, excluded, options)) {
      fixes.push({
        file,
        ruleName: rule.name,
        lineNumber: segment.startLine + found.line - 1,
        editColumn: toSourceColumn(segment, found.line, found.column),
        deleteCount: found.match.length,
        // Apply the MATCHED text's observed casing to the replacement,
        // not the configured replacement literally: with `ignoreCase:
        // true`, a sentence-initial "Behaviour" would otherwise be
        // replaced by literal "behavior", silently lowercasing the start
        // of the sentence. Works the same for a `keysAreRegex` key --
        // applyMatchCase reads the MATCHED string, not the key -- though a
        // regex key whose match has internal mixed case (e.g. "bEhAvIoUr")
        // falls into the "no confident inference" branch and inserts the
        // replacement exactly as configured, no guessing.
        insertText: applyMatchCase(found.match, found.replacement),
      });
    }
  }
  return fixes;
};

export const swap: ScopeRule = { id: 'swap', fixable: true, execute, fix };
