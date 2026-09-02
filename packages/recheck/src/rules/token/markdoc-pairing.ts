// Detection-only Markdoc pairing validation, consuming the
// `computeMarkdocPairing` output the runner puts on `ctx.markdoc.pairing`.
// One report per entry in `unclosed`/`orphaned`/`crossed` (those buckets are
// disjoint, so nothing is double-reported), plus two self-closing checks that
// need the schema:
//
// - `voidMissingSlash`: an open written without `/%}` for a tag the schema
//   declares self-closing.
// - a self-closing tag used with an explicit close anyway
//   (`{% img %}...{% /img %}`). No pairing bucket covers this -- it is a
//   properly alternating pair, so it lands in `pairs` -- so this rule
//   cross-references `pairs` against `ctx.markdoc.selfClosingTags` itself.
//
// Reports leave this rule in DOCUMENT order, not bucket order.
//
// `defaults.message` is the bare placeholder `'%s'` because every `onError`
// call supplies the complete final sentence via `context`, with no generic
// prefix added by `formatTokenMessage`. That is what lets tests assert whole
// messages with `toBe` instead of `toContain`.
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';

/** One pending report: the token it belongs to, plus its finished sentence. */
interface PairingReport {
  token: Token;
  context: string;
}

/**
 * The tag's own name, from its synthesized `markdocTagName` child. Only
 * `tag-open`/`tag-close` tokens ever reach a pairing bucket and both always
 * carry a name child, so the `''` fallback is defensive only.
 */
function tagName(token: Token): string {
  return token.children.find((child) => child.type === 'markdocTagName')?.text ?? '';
}

export const markdocPairing: TokenRule = {
  name: 'markdoc-pairing',
  tags: ['markdoc'],
  fixable: false,
  defaults: {
    message: '%s',
  },
  check(ctx) {
    if (!ctx.markdoc) return; // flag off -- no markdocTag tokens exist to pair at all
    const { pairing, selfClosingTags } = ctx.markdoc;

    // Each bucket below has its own order, so emitting inline would
    // interleave lines (a line-90 unclosed before a line-12 orphan). Reports
    // are collected and sorted into document order before they leave the rule.
    const reports: PairingReport[] = [];

    for (const open of pairing.unclosed) {
      reports.push({
        token: open,
        context: `"${tagName(open)}" is opened here but never closed before the document ends`,
      });
    }

    for (const close of pairing.orphaned) {
      // The open may exist but be malformed (e.g. a multi-line tag inside a
      // blockquote) rather than genuinely absent, so the message must not
      // claim the open is missing.
      reports.push({
        token: close,
        context: `"/${tagName(close)}" close tag found, but no well-formed matching open was found`,
      });
    }

    for (const pair of pairing.crossed) {
      reports.push({
        token: pair.open,
        context: `"${tagName(pair.open)}" and its close are interleaved (crossed) with another tag pair instead of properly nested — Markdoc requires tags to nest`,
      });
    }

    for (const open of pairing.voidMissingSlash) {
      const name = tagName(open);
      reports.push({ token: open, context: `"${name}" is self-closing — write {% ${name} /%}` });
    }

    // Self-closing tag used with an explicit close, detected from `pairs`
    // since no bucket covers it. Without a schema the set is empty, which
    // makes this inert just as `voidMissingSlash` already is.
    if (selfClosingTags.size > 0) {
      for (const pair of pairing.pairs) {
        const name = tagName(pair.open);
        if (!selfClosingTags.has(name)) continue;
        reports.push({
          token: pair.open,
          context: `"${name}" is self-closing and must not be used with a matching {% /${name} %} close — write {% ${name} /%} instead`,
        });
      }
    }

    reports.sort(
      (a, b) => a.token.startLine - b.token.startLine || a.token.startColumn - b.token.startColumn
    );
    for (const report of reports) {
      ctx.onError({
        line: report.token.startLine,
        column: report.token.startColumn,
        context: report.context,
      });
    }
  },
};
