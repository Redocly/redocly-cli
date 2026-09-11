// Micromark syntax extension recognizing `{% ... %}` Markdoc span boundaries
// only: one `markdocTag` token per span, no interior structure. The name,
// attributes, and markers are synthesized later by `structureMarkdocTags`
// (structure.ts) from the span's own text, keeping the tricky parsing in a
// pure, unit-testable function shared by both forms below rather than in
// tokenizer state.
//
// Two constructs, both hooked on `{`:
// - `text`, the inline form: a tag sharing its line with other content. It
//   must close on the same line; anything else falls back to ordinary
//   paragraph text rather than failing the parse.
// - `flow`, the block form: a tag alone on its line. It may span multiple
//   lines, and its closing `%}` must be followed only by whitespace to
//   end-of-line, or the span reparses as inline content instead.
//
// Neither construct caps how far it scans: real tags reach a few thousand
// characters when their attribute list is broken across lines, and any fixed
// ceiling would silently stop tokenizing those. The `%}` index below keeps the
// scanning linear without one.
import { codes, types as mmTypes } from 'micromark-util-symbol';
import type { Code, Construct, Extension, State, Tokenizer } from 'micromark-util-types';

// `Effects.enter`/`exit` are typed against `TokenTypeMap`, a closed interface
// listing micromark's own built-in token types, so a custom type has to be
// added by module augmentation rather than cast at every call site.
declare module 'micromark-util-types' {
  interface TokenTypeMap {
    markdocTag: 'markdocTag';
  }
}

/**
 * Where the document's `%}` sequences are, so a `{%` candidate that cannot
 * reach a usable close is rejected in O(1) instead of scanning for one that
 * isn't there. Micromark retries a construct at every occurrence of its
 * trigger code, and a failed attempt has by then rescanned everything from its
 * own start, so without this index a document full of unterminated `{%` costs
 * O(n^2). One linear pass before tokenizing fills all three fields:
 *
 * - `lastCloseOnLine[line]`: offset of the last `%}` on that line, or -1. An
 *   inline span must close on its own line, so it can succeed from offset X
 *   only if this is >= X -- an exact test, since the inline scanner never
 *   fails early.
 * - `blockCloseFromLine[line]`: offset of the first `%}` at or after that
 *   line's start, but only if nothing except spaces/tabs follows it to
 *   end-of-line; -1 otherwise, including when that close exists with trailing
 *   content, because the block scanner stops at the first close it meets and
 *   rejects rather than looking further. Micromark dispatches flow constructs
 *   at a line's first non-whitespace character, so that close is exactly the
 *   one a block attempt would reach.
 * - `firstCloseOnLine[line]`: only used to spot an attempt starting past a
 *   close on its own line, where the block entry describes the wrong close.
 *
 * Indexing the raw document is what makes this sound: micromark hands each
 * tokenizer container-stripped content, but stripping only removes characters
 * and never joins a `%` to a `}` across a line ending, so "the raw document
 * has no usable `%}` ahead" implies no stream has one. The index may let a
 * hopeless scan run; it never cuts a viable one short. Caching the same
 * information from the scans instead would not be sound, since a scan that
 * dies at its own stream's end has not seen the rest of the document -- in
 * `| {% x | {% y %} |` the first cell's dead scan would suppress the second
 * cell's perfectly good tag. Offsets and lines come from
 * `TokenizeContext.now()`, which stays document-absolute across container
 * prefixes and so indexes these tables directly.
 *
 * Known limitation: nothing here or in the tokenizer's close-matching knows
 * about quoting, so a `%}` inside a quoted attribute value truncates the span
 * -- `{% img alt="a %} b" /%}` tokenizes only as far as `{% img alt="a %}` and
 * is then reported malformed, where upstream accepts the whole tag. The fix
 * would be a quote-aware boundary scan; no real-world occurrence has surfaced.
 */
interface MarkdocCloseIndex {
  lastCloseOnLine: Int32Array;
  firstCloseOnLine: Int32Array;
  blockCloseFromLine: Int32Array;
}

/** True iff the `%}` at `at` is followed only by spaces/tabs to end-of-line/EOF. */
function closesALine(content: string, at: number): boolean {
  for (let index = at + 2; index < content.length; index++) {
    const code = content.charCodeAt(index);
    if (code === 32 /* space */ || code === 9 /* tab */) continue;
    return code === 10 /* \n */ || code === 13 /* \r */;
  }
  return true; // ran to EOF
}

function buildCloseIndex(content: string): MarkdocCloseIndex {
  // Line counting mirrors micromark's: `\r\n` is one line ending, as are a
  // lone `\r` and a lone `\n`.
  let lineCount = 1;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    if (code === 13) {
      if (content.charCodeAt(index + 1) === 10) index++;
      lineCount++;
    } else if (code === 10) {
      lineCount++;
    }
  }

  const size = lineCount + 2;
  const lastCloseOnLine = new Int32Array(size).fill(-1);
  const firstCloseOnLine = new Int32Array(size).fill(-1);
  const blockCloseFromLine = new Int32Array(size).fill(-1);

  let line = 1;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    if (code === 13) {
      if (content.charCodeAt(index + 1) === 10) index++;
      line++;
      continue;
    }
    if (code === 10) {
      line++;
      continue;
    }
    // `%%}` is deliberately not skipped past: the scanner's own `%`-run
    // handling closes on the last `%` before the `}`, which is the occurrence
    // recorded here.
    if (code === 37 /* % */ && content.charCodeAt(index + 1) === 125 /* } */) {
      if (firstCloseOnLine[line] < 0) firstCloseOnLine[line] = index;
      lastCloseOnLine[line] = index;
    }
  }

  // Carried backwards: a line with no close of its own inherits the first
  // close of the next line that has one.
  let carried = -1;
  for (let at = lineCount; at >= 1; at--) {
    const first = firstCloseOnLine[at];
    if (first >= 0) carried = closesALine(content, first) ? first : -1;
    blockCloseFromLine[at] = carried;
  }

  return { lastCloseOnLine, firstCloseOnLine, blockCloseFromLine };
}

function read(table: Int32Array, line: number): number {
  return line >= 0 && line < table.length ? table[line] : -1;
}

/** No `%}` left on this line at or after `offset` -- an inline span cannot close. */
function inlineScanIsHopeless(index: MarkdocCloseIndex, line: number, offset: number): boolean {
  return read(index.lastCloseOnLine, line) < offset;
}

/** The first `%}` this block attempt would reach is missing or unusable. */
function blockScanIsHopeless(index: MarkdocCloseIndex, line: number, offset: number): boolean {
  const first = read(index.firstCloseOnLine, line);
  // The line's entry describes the first close from the line's start, so if
  // the attempt begins past that close, stand aside and let the scanner decide.
  if (first >= 0 && first < offset) return false;
  return read(index.blockCloseFromLine, line) < 0;
}

function createTokenizeText(index: MarkdocCloseIndex): Tokenizer {
  return function (effects, ok, nok) {
    const now = this.now.bind(this);

    return start;

    function start(code: Code): State | undefined {
      const point = now();
      if (inlineScanIsHopeless(index, point.line, point.offset)) return nok(code);
      effects.enter('markdocTag');
      effects.consume(code); // '{'
      return afterBrace;
    }

    function afterBrace(code: Code): State | undefined {
      if (code !== codes.percentSign) return nok(code);
      effects.consume(code);
      return inside;
    }

    // Inline spans cannot cross a line ending, so EOF or a line ending here
    // nok()s back to ordinary text. The flow construct handles the multi-line
    // case in block position instead.
    function inside(code: Code): State | undefined {
      if (
        code === codes.eof ||
        code === codes.carriageReturn ||
        code === codes.lineFeed ||
        code === codes.carriageReturnLineFeed
      ) {
        return nok(code);
      }
      if (code === codes.percentSign) {
        effects.consume(code);
        return maybeClose;
      }
      effects.consume(code);
      return inside;
    }

    // Consume a whole run of `%` so a body that ends in `%` characters
    // (`{% t x="100%%" %}`) still reaches the real close delimiter instead of
    // stopping at the first `%`.
    function maybeClose(code: Code): State | undefined {
      if (code === codes.rightCurlyBrace) {
        effects.consume(code);
        effects.exit('markdocTag');
        return ok;
      }
      if (code === codes.percentSign) {
        effects.consume(code);
        return maybeClose;
      }
      return inside(code);
    }
  };
}

function createTokenizeFlow(index: MarkdocCloseIndex): Tokenizer {
  return function (effects, ok, nok) {
    const now = this.now.bind(this);
    // Micromark requires every `effects.consume()` to immediately follow an
    // `enter()` with no `exit()` in between. That check looks only at the last
    // recorded event rather than at stack depth, so once a nested line ending
    // has been entered and exited, the next character needs a fresh `enter()`
    // even though `markdocTag` is still open underneath. `dataOpen` tracks
    // whether such a per-line wrapper (reusing the generic `data` type) is
    // currently open. The segments are pure bookkeeping: `structureMarkdocTags`
    // reads only a `markdocTag`'s `.text`, never its micromark children, so a
    // segment boundary need not line up with anything Markdoc-meaningful.
    let dataOpen = false;

    return start;

    function start(code: Code): State | undefined {
      const point = now();
      if (blockScanIsHopeless(index, point.line, point.offset)) return nok(code);
      effects.enter('markdocTag');
      effects.consume(code); // '{'
      return afterBrace;
    }

    function afterBrace(code: Code): State | undefined {
      if (code !== codes.percentSign) return nok(code);
      effects.consume(code);
      return inside;
    }

    function openData(): void {
      if (!dataOpen) {
        effects.enter(mmTypes.data);
        dataOpen = true;
      }
    }

    function closeData(): void {
      if (dataOpen) {
        effects.exit(mmTypes.data);
        dataOpen = false;
      }
    }

    function inside(code: Code): State | undefined {
      if (code === codes.eof) return nok(code);
      if (
        code === codes.carriageReturn ||
        code === codes.lineFeed ||
        code === codes.carriageReturnLineFeed
      ) {
        closeData(); // must close before nesting `lineEnding` -- see the note above `dataOpen`
        effects.enter(mmTypes.lineEnding);
        effects.consume(code);
        effects.exit(mmTypes.lineEnding);
        return inside;
      }
      openData();
      if (code === codes.percentSign) {
        effects.consume(code);
        return maybeClose;
      }
      effects.consume(code);
      return inside;
    }

    function maybeClose(code: Code): State | undefined {
      if (code === codes.rightCurlyBrace) {
        effects.consume(code);
        return after;
      }
      if (code === codes.percentSign) {
        effects.consume(code);
        return maybeClose;
      }
      return inside(code);
    }

    // The block form allows only trailing whitespace after `%}`. Any other
    // content on the same line (`{% partial /%} tag.`) means this is inline
    // content, so nok() defers to the text construct's own attempt.
    //
    // `markdocTag` closes on the `}` itself, before any trailing whitespace, so
    // the token's text always ends with a literal `%}`. Downstream relies on
    // that: `parseMarkdocSpan` gates on it, and `markerBounds` (structure.ts)
    // derives the close marker from the text's last two characters, so a token
    // carrying `"...%} "` would classify malformed. The whitespace run becomes
    // its own sibling `whitespace` token.
    function after(code: Code): State | undefined {
      if (
        code === codes.eof ||
        code === codes.carriageReturn ||
        code === codes.lineFeed ||
        code === codes.carriageReturnLineFeed
      ) {
        closeData(); // must close before exiting the outer `markdocTag` (a strict LIFO stack)
        effects.exit('markdocTag');
        return ok(code);
      }
      if (code === codes.space || code === codes.horizontalTab) {
        closeData();
        effects.exit('markdocTag');
        effects.enter(mmTypes.whitespace);
        return trailingWhitespace(code);
      }
      return nok(code);
    }

    function trailingWhitespace(code: Code): State | undefined {
      if (code === codes.space || code === codes.horizontalTab) {
        effects.consume(code);
        return trailingWhitespace;
      }
      effects.exit(mmTypes.whitespace);
      if (
        code === codes.eof ||
        code === codes.carriageReturn ||
        code === codes.lineFeed ||
        code === codes.carriageReturnLineFeed
      ) {
        return ok(code);
      }
      return nok(code);
    }
  };
}

/**
 * Markdoc tag-span micromark extension, gated behind `ParseOptions.markdoc`.
 * Off by default: Liquid and Jinja templates use the identical `{% %}`
 * delimiter, so tokenizing it unconditionally would misinterpret non-Markdoc
 * documents.
 *
 * Takes the document text so both constructs can share one `%}` index over it
 * (see `MarkdocCloseIndex`), so a fresh extension is built per parse.
 *
 * Disabling `codeIndented` and `setextUnderline` matches how a Markdoc document
 * is actually compiled: Markdoc's own tokenizer unconditionally disables
 * indented code and setext headings for every document it parses.
 *
 * `codeIndented` is the reason a 4-space-indented `{% card %}` gets recognized
 * here at all -- micromark otherwise reads that line as an indented code block,
 * so the tag never tokenizes and its less-indented close orphans. Realm's own
 * `allowIndentation: true` is a separate, broader knob that strips the "4+
 * spaces means code, bail out" guard from every other block rule, which is what
 * lets an indented `{% /card %}` terminate a paragraph and close its tag.
 * Removing micromark's construct gives us both of those effects at once,
 * because it removes the one shared indentation gate every other flow construct
 * is checked against.
 *
 * With `setextUnderline` disabled, a would-be underline line is no longer
 * resolved into a setext heading and stays ordinary paragraph text -- or, for a
 * run of `-`/`*`/`_`, still ends the paragraph as a `thematicBreak`, which
 * remains enabled. That matches Realm, which renders `Title\n=====\n` as a
 * paragraph containing the literal underline text and `Title\n-----\n` as a
 * paragraph followed by `<hr>`.
 *
 * Both disables live inside the flag-on extension, so a flag-off parse never
 * sees them and stays byte-identical. The knock-on effect under the flag is
 * deliberate and matches the renderer: indented prose that micromark would have
 * hidden inside `codeIndented` becomes ordinary paragraph content, and
 * therefore becomes visible to the prose rules.
 */
export function markdocSyntax(content: string): Extension {
  const index = buildCloseIndex(content);
  const textConstruct: Construct = {
    name: 'markdocTagText',
    tokenize: createTokenizeText(index),
  };
  const flowConstruct: Construct = {
    name: 'markdocTagFlow',
    tokenize: createTokenizeFlow(index),
  };
  return {
    text: { [codes.leftCurlyBrace]: textConstruct },
    flow: { [codes.leftCurlyBrace]: flowConstruct },
    disable: { null: ['codeIndented', 'setextUnderline'] },
  };
}
