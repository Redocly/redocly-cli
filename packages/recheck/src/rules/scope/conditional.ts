import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { NormalizedRule, Problem, ConditionalAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// On the first line, `segment.content` can start in the middle of the source line
// (a heading's content skips the '## '), so add `startColumn`.
function toSourceColumn(segment: { startColumn: number }, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

// Used when the rule has no `message`. The two `%s` are the `first` match and the
// `second` pattern.
const FALLBACK_MESSAGE = '"%s" appears but "%s" was never introduced.';

interface ConditionalSite {
  line: number; // absolute source line
  column: number; // absolute source column
  text: string; // the `first` match, as written in the source
  lineText: string; // the full segment-content line containing the match
  second: string; // the `second` pattern the site was checked against
}

// Empty matches (like from 'x*') do not count, because they match at every
// position even when the text is not there.
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

// If `first` matches in the scoped segments, `second` must appear somewhere in the
// whole file (`ctx.content`, even outside the scope). Otherwise every `first` match
// is a problem. Matches found twice through overlapping scopes are reported once.
// `first` and `second` are regexes; an invalid one produces no problems.
function collectMatches(rule: NormalizedRule, ctx: ScopeRuleContext): ConditionalSite[] {
  const options = (rule.assertions['conditional'] ?? {}) as ConditionalAssertion;
  const flags = options.ignoreCase ? 'gi' : 'g';

  let secondRe: RegExp;
  try {
    secondRe = new RegExp(options.second ?? '', flags);
  } catch {
    return [];
  }
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
      // Skip empty matches and move on, or the loop never ends.
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
