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

// When matches from different pairs overlap, keep the longest one (then the
// earliest). Otherwise 'he/she' and the keys 'he' and 'she' would all match,
// and --fix would turn 'he/she' into 'they/they'.
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

// Matches that overlap code spans or markdoc tags (`excluded`) are skipped, so
// `git checkout master` is not flagged. The regex runs on the original content
// because a key like `[^\s,]+` could match through masked text.
function findMatches(
  content: string,
  excluded: Array<{ start: number; end: number }>,
  options: SwapAssertion
): SwapMatch[] {
  const raw: RawSwapMatch[] = [];
  const pairs = options.pairs || {};
  for (const [from, to] of Object.entries(pairs)) {
    // An empty key would match at every position, so skip it.
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
      // Ignore an invalid regex key; the other pairs still run.
      continue;
    }
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      // Skip empty matches (e.g. `a*`) and advance lastIndex so the loop does not hang.
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
    // offsetToLineColumn also handles CR-only line endings.
    const { line, column } = offsetToLineColumn(content, index);
    return { line, column, match, replacement };
  });
}

// On the first line, `segment.content` can start mid-line (a heading excludes
// its '## '), so add `startColumn` to get the real column.
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
        // Copy the matched text's capitalization, so "Behaviour" becomes "Behavior".
        insertText: applyMatchCase(found.match, found.replacement),
      });
    }
  }
  return fixes;
};

export const swap: ScopeRule = { id: 'swap', fixable: true, execute, fix };
