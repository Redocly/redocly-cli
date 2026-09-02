import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { NormalizedRule, Problem, ConditionalAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// On the segment's first line, segment.content starts mid-source-line (e.g.
// a heading's content excludes the '## ' marker), so segment.startColumn
// must be added -- see pattern.ts's toSourceColumn.
function toSourceColumn(segment: { startColumn: number }, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

// Fallback when a programmatically-built rule has no `message` (validate()
// requires one). %s slots: the `first` match, then the missing `second` pattern.
const FALLBACK_MESSAGE = '"%s" appears but "%s" was never introduced.';

interface ConditionalSite {
  line: number; // absolute source line
  column: number; // absolute source column
  text: string; // the `first` match, as written in the source
  lineText: string; // the full segment-content line containing the match
  second: string; // the `second` pattern the site was checked against
}

// `second` only counts as "present" via a real, non-empty match -- a bare
// `.test()`/`.exec()` truthiness check would also succeed on a zero-width
// match (e.g. a `second` pattern like 'x*', '.*', '\b'), which "matches"
// at every position even with no literal occurrence anywhere in the file,
// silently satisfying the rule. Mirrors the zero-width skip `first`'s own
// exec loop uses below: advance lastIndex past an empty match instead of
// treating it as a hit, or the loop would also hang.
function secondHasNonEmptyMatch(secondRe: RegExp, content: string): boolean {
  secondRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = secondRe.exec(content)) !== null) {
    if (match[0].length === 0) {
      secondRe.lastIndex++;
      continue;
    }
    return true;
  }
  return false;
}

// Vale-parity `conditional` check (detection-only): if `first` matches
// anywhere within the rule's scoped segments, `second` must exist somewhere
// in the whole file -- tested against `ctx.content` (the full raw file),
// NOT `ctx.segments`, so a `second` match outside the rule's own scope
// (e.g. inside a code block) still satisfies it. When `second` is absent
// file-wide, every `first` match becomes a problem, deduped by absolute
// source position: overlapping scopes (e.g. `[paragraph, sentence]`) match
// the same source occurrence once per covering segment.
//
// Both `first` and `second` are raw user regex patterns (like `pattern`'s
// `tokens`, not escaped literals); an invalid regex in either one silently
// produces zero problems rather than crashing the run.
function collectMatches(rule: NormalizedRule, ctx: ScopeRuleContext): ConditionalSite[] {
  const options = (rule.assertions['conditional'] ?? {}) as ConditionalAssertion;
  const flags = options.ignoreCase ? 'gi' : 'g';

  let secondRe: RegExp;
  try {
    secondRe = new RegExp(options.second ?? '', flags);
  } catch {
    return [];
  }
  // Tested against the whole file, not ctx.segments -- see doc comment above.
  if (secondHasNonEmptyMatch(secondRe, ctx.content)) return [];

  let firstRe: RegExp;
  try {
    firstRe = new RegExp(options.first ?? '', flags);
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const sites: ConditionalSite[] = [];

  for (const segment of ctx.segments) {
    // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF content.
    const contentLines = segment.content.split(newLineRe);
    firstRe.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = firstRe.exec(segment.content)) !== null) {
      // Zero-width match (e.g. a `first` pattern like `x*`): advance
      // lastIndex or the loop hangs, and skip recording it -- an empty-text
      // match has no real `first` occurrence to report, and without this
      // `continue` every position the pattern passed through became its own
      // spammy problem.
      if (match[0].length === 0) {
        firstRe.lastIndex++;
        continue;
      }
      const local = offsetToLineColumn(segment.content, match.index);
      const line = segment.startLine + local.line - 1;
      const column = toSourceColumn(segment, local.line, local.column);
      const positionKey = `${line}:${column}`;
      if (seen.has(positionKey)) continue; // overlapping segments, same source occurrence
      seen.add(positionKey);
      sites.push({
        line,
        column,
        text: match[0],
        lineText: contentLines[local.line - 1] ?? '',
        second: options.second ?? '',
      });
    }
  }

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
    message: formatTemplate(rule.message ?? FALLBACK_MESSAGE, site.text, site.second),
  }));
};

export const conditional: ScopeRule = { id: 'conditional', fixable: false, execute };
