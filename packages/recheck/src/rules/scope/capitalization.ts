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

// Fallback when a programmatically-built rule has no `message` (validate()
// requires one). %s slots: the segment's first line, then the `match` value.
const FALLBACK_MESSAGE = '"%s" should use %s capitalization.';

const DOLLAR_STYLES = new Set(['$title', '$sentence', '$lower', '$upper']);
type DollarStyle = '$title' | '$sentence' | '$lower' | '$upper';

// Inline code spans (e.g. '## the `configFile` option') must never be
// flagged or rewritten by the `$`-styles: they're masked out with the
// shared, length-preserving maskInlineCode/restoreInlineCode pair
// (core/inline-code.ts) -- see there for the CommonMark span-recognition
// and offset-preservation contract. Segments here are always single-line
// by the time masking runs (see collectSites' multi-line skip below),
// matching BACKTICK_SPAN_RE's own single-line content restriction.

// $sentence
//
// Sentence case doesn't need AP/Chicago's stopword lists, so it isn't
// implemented via title-case.ts's apTitleCase/chicagoTitleCase: only the
// FIRST word is capitalized, every other word is lowercased -- unless it's an
// exception (as-written) or already ALL-CAPS (left alone), the same carve-outs
// those two use.
//
// It does share title-case.ts's tokenization and exception handling, though:
// `buildExceptionPlan` is the SAME exception decision apTitleCase/
// chicagoTitleCase make (see its doc comment for why this must not be a second
// independent map -- a dotted/multi-word entry like 'Node.js' or 'VS Code'
// cannot survive per-word splitting under either style, so both must agree on
// treating it as a phrase), and `recaseWords` is the same tokenizer, which is
// what makes each phrase ONE token that counts toward word position. $sentence
// only supplies its own per-word casing rule below.
// Follows `startsSentence`, not `index === 0`: a heading can carry more than
// one sentence (`Step 1. Configure the project`). recaseWords decides where.
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
  // The text the segment SHOULD be; equals `segment.content` for
  // detection-only sites (see collectSites).
  corrected: string;
  fixable: boolean;
}

// Shared by execute() and fix() so problems and fixes can never disagree
// about which segments are flagged.
//
// Multi-line segments are skipped by BOTH for the `$`-styles, not just by
// fix(): a `Fix` can only rewrite one line, so a flagged multi-line segment
// would have no corresponding fix. Custom regex `match` mode never produces
// a fix regardless, so multi-line segments are still checked there.
function collectSites(rule: NormalizedRule, ctx: ScopeRuleContext): CapitalizationSite[] {
  const options = (rule.assertions['capitalization'] ?? {}) as CapitalizationAssertion;
  const sites: CapitalizationSite[] = [];

  if (!DOLLAR_STYLES.has(options.match)) {
    // Custom regex: the WHOLE segment text must satisfy it. Detection-only
    // -- there's no transform to derive a fix from.
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
  // Users should not re-author the industry's proper-noun list in every
  // config; the built-ins are UNIONED with the rule's own `exceptions`
  // (rather than the rule's list replacing them) so a preset-configured list
  // and a user list compose, and a user override of `exceptions` can never
  // accidentally drop the common vocabulary. `builtinVocabulary: false`
  // opts back into the pre-built-in strict/closed behavior. See
  // ../../data/proper-nouns.ts for the vocabulary and its inclusion bar.
  const exceptions =
    options.builtinVocabulary === false
      ? (options.exceptions ?? [])
      : [...TECHNICAL_PROPER_NOUNS, ...(options.exceptions ?? [])];

  for (const segment of ctx.segments) {
    // Multi-line: symmetric skip, see doc comment above.
    if (segment.startLine !== segment.endLine) continue;

    const masked = maskInlineCode(segment.content);
    const transformedMasked = applyDollarStyle(style, masked, titleStyle, exceptions);

    // Non-length-preserving case mapping (e.g. 'ß'.toUpperCase() === 'SS'):
    // restoreInlineCode's splice assumes casing-only changes, so shifted
    // offsets would splice masked spans back at the wrong position. A length
    // change still proves a violation, so report it -- detection-only, no fix.
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
    // Report the source, not the prose view: a segment whose markdoc tags were
    // masked out carries a run of blanks where `{% partial /%}` sits in the
    // file, and echoing that back in `match` or the message would show the user
    // a hole in their own heading. `sourceText` is the verbatim slice and is the
    // same length as `content`, so nothing else shifts. Detection still runs on
    // `content`, so a tag influences the report but never the casing decision.
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
