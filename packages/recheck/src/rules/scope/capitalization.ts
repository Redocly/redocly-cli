import { maskInlineCode, restoreInlineCode } from '../../core/inline-code.js';
import { newLineRe } from '../../core/line-endings.js';
import { TECHNICAL_PROPER_NOUNS } from '../../data/proper-nouns.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { NormalizedRule, Problem, Fix, CapitalizationAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';
import {
  apTitleCase,
  chicagoTitleCase,
  keepsOwnCasing,
  buildExceptionPlan,
  recaseWords,
} from './title-case.js';

// Used when the rule has no `message`. The two `%s` are the segment's first line
// and the `match` value.
const FALLBACK_MESSAGE = '"%s" should use %s capitalization.';

const DOLLAR_STYLES = new Set(['$title', '$sentence', '$lower', '$upper']);
type DollarStyle = '$title' | '$sentence' | '$lower' | '$upper';

// Inline code spans (like `configFile` in a heading) are masked out so the `$`
// styles never flag or change them.

// Sentence case: only the first word of each sentence is capitalized and the rest
// is lowercased. Words that are exceptions or already ALL-CAPS are left as they are.
// Uses the same exception handling and word splitting as the title case styles.
function sentenceCase(text: string, exceptions: string[]): string {
  const { wordMap, phrases } = buildExceptionPlan(exceptions);
  return recaseWords(text, phrases, (word, _index, _total, startsSentence) => {
    const exceptionHit = wordMap.get(word.toLowerCase());
    if (exceptionHit !== undefined) return exceptionHit;
    if (keepsOwnCasing(word)) return word;
    if (startsSentence) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return word.toLowerCase();
  });
}

function applyDollarStyle(
  style: DollarStyle,
  text: string,
  titleStyle: 'ap' | 'chicago',
  exceptions: string[]
): string {
  switch (style) {
    case '$title':
      return titleStyle === 'chicago'
        ? chicagoTitleCase(text, exceptions)
        : apTitleCase(text, exceptions);
    case '$sentence':
      return sentenceCase(text, exceptions);
    case '$lower':
      return text.toLowerCase();
    case '$upper':
      return text.toUpperCase();
  }
}

interface CapitalizationSite {
  segment: ScopedSegment;
  // The text the segment should have. Same as `segment.content` when there is no fix.
  corrected: string;
  fixable: boolean;
}

// Shared by execute() and fix() so they flag the same segments. The `$` styles skip
// multi-line segments because a fix can only change one line. A custom regex
// `match` never has fixes, so it checks multi-line segments too.
function collectSites(rule: NormalizedRule, ctx: ScopeRuleContext): CapitalizationSite[] {
  const options = (rule.assertions['capitalization'] ?? {}) as CapitalizationAssertion;
  const sites: CapitalizationSite[] = [];

  if (!DOLLAR_STYLES.has(options.match)) {
    // Custom regex: the whole segment text must match. There is no fix for this.
    let regex: RegExp;
    try {
      regex = new RegExp(options.match ?? '');
    } catch {
      return []; // ignore invalid regex
    }
    for (const segment of ctx.segments) {
      if (regex.test(segment.content)) continue;
      sites.push({ segment, corrected: segment.content, fixable: false });
    }
    return sites;
  }

  const style = options.match as DollarStyle;
  const titleStyle = options.style ?? 'ap';
  // The built-in proper nouns are added to the rule's own `exceptions`.
  // `builtinVocabulary: false` turns them off.
  const exceptions =
    options.builtinVocabulary === false
      ? (options.exceptions ?? [])
      : [...TECHNICAL_PROPER_NOUNS, ...(options.exceptions ?? [])];

  for (const segment of ctx.segments) {
    // Skip multi-line segments, see above.
    if (segment.startLine !== segment.endLine) continue;

    const masked = maskInlineCode(segment.content);
    const transformedMasked = applyDollarStyle(style, masked, titleStyle, exceptions);

    // Some case changes alter the length (like 'ß' to 'SS'), which would break
    // `restoreInlineCode`. Report the problem without a fix.
    if (transformedMasked.length !== masked.length) {
      sites.push({ segment, corrected: segment.content, fixable: false });
      continue;
    }

    const corrected = restoreInlineCode(segment.content, transformedMasked);
    if (corrected === segment.content) continue;

    sites.push({ segment, corrected, fixable: true });
  }
  return sites;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const options = (rule.assertions['capitalization'] ?? {}) as CapitalizationAssertion;
  return collectSites(rule, ctx).map(({ segment, fixable }) => {
    // Report the original text. `content` has blanks where Markdoc tags were
    // masked out, and the message should not show those.
    const sourceText = segment.sourceText ?? segment.content;
    // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF content.
    const firstLine = sourceText.split(newLineRe)[0] ?? '';
    return {
      file,
      line: segment.startLine,
      column: segment.startColumn,
      text: firstLine,
      match: sourceText,
      ruleName: rule.name,
      severity: rule.severity,
      message: formatTemplate(rule.message ?? FALLBACK_MESSAGE, firstLine, options.match),
      fixable,
    };
  });
};

const fix = async (rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]> => {
  const fixes: Fix[] = [];
  for (const site of collectSites(rule, ctx)) {
    if (!site.fixable) continue;
    fixes.push({
      file,
      ruleName: rule.name,
      lineNumber: site.segment.startLine,
      editColumn: site.segment.startColumn,
      deleteCount: site.segment.content.length,
      insertText: site.corrected,
    });
  }
  return fixes;
};

export const capitalization: ScopeRule = { id: 'capitalization', fixable: true, execute, fix };
