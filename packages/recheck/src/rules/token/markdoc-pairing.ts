// Reports unclosed, orphaned and crossed Markdoc tags from `ctx.markdoc.pairing`, plus two
// self-closing checks that need the schema: an open without `/%}` for a self-closing tag
// (`voidMissingSlash`), and a self-closing tag with an explicit close (`{% img %}...{% /img %}`).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';

/** One pending report: the token it belongs to, plus its finished sentence. */
interface PairingReport {
  token: Token;
  context: string;
}

/** The tag's own name, from its `markdocTagName` child. */
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
    if (!ctx.markdoc) return; // markdoc parsing is off
    const { pairing, selfClosingTags } = ctx.markdoc;

    // Each bucket has its own order, so sort the reports into document order at the end.
    const reports: PairingReport[] = [];

    for (const open of pairing.unclosed) {
      reports.push({
        token: open,
        context: `"${tagName(open)}" is opened here but never closed before the document ends`,
      });
    }

    for (const close of pairing.orphaned) {
      // The open may be malformed (e.g. a multi-line tag in a blockquote) rather than missing,
      // so don't say it is missing.
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

    // A self-closing tag with an explicit close is in no bucket, so detect it from `pairs`.
    // Without a schema nothing matches.
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
