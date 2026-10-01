// Micromark extension that finds `{% ... %}` Markdoc spans. It emits one `markdocTag`
// token per span; `structureMarkdocTags` (structure.ts) parses the inside later.
//
// - `text`: a tag on a line with other content. It must close on the same line.
// - `flow`: a tag alone on its line. It can span lines, and only whitespace may
//   follow its `%}`.
//
// Neither has a length limit, because tags with many attributes can be long.
import { codes, types as mmTypes } from 'micromark-util-symbol';
import type { Code, Construct, Extension, State, Tokenizer } from 'micromark-util-types';

// Micromark only accepts its built-in token types, so add ours here.
declare module 'micromark-util-types' {
  interface TokenTypeMap {
    markdocTag: 'markdocTag';
  }
}

/**
 * Where the `%}` sequences are in the document. Micromark retries a construct at
 * every `{`, so without this a document with many unclosed `{%` would be slow
 * (quadratic). One pass before tokenizing fills the three tables:
 *
 * - `lastCloseOnLine[line]`: offset of the last `%}` on that line, or -1.
 * - `blockCloseFromLine[line]`: offset of the first `%}` at or after the start of
 *   that line, or -1 if there is none or text follows it on its line.
 * - `firstCloseOnLine[line]`: offset of the first `%}` on that line, or -1.
 *
 * The index is built from the raw document. Micromark may strip container
 * prefixes (like `>`), but that never joins a `%` and a `}`, so a document with no
 * usable `%}` ahead has none in any stripped stream either.
 *
 * Known limitation: a `%}` inside a quoted attribute value ends the span early, so
 * `{% img alt="a %} b" /%}` is reported as malformed.
 */
interface MarkdocCloseIndex {
  lastCloseOnLine: Int32Array;
  firstCloseOnLine: Int32Array;
  blockCloseFromLine: Int32Array;
}

/** True if only spaces and tabs follow the `%}` at `at` on its line. */
function closesALine(content: string, at: number): boolean {
  for (let index = at + 2; index < content.length; index++) {
    const code = content.charCodeAt(index);
    if (code === 32 /* space */ || code === 9 /* tab */) continue;
    return code === 10 /* \n */ || code === 13 /* \r */;
  }
  return true; // ran to EOF
}

function buildCloseIndex(content: string): MarkdocCloseIndex {
  // Same line counting as micromark: `\r\n`, `\r` and `\n` each end one line.
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
    // For `%%}` this records the second `%`, which is where the scanner closes.
    if (code === 37 /* % */ && content.charCodeAt(index + 1) === 125 /* } */) {
      if (firstCloseOnLine[line] < 0) firstCloseOnLine[line] = index;
      lastCloseOnLine[line] = index;
    }
  }

  // A line with no `%}` of its own gets the first one from a later line.
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

/** No `%}` is left on this line after `offset`, so an inline span cannot close. */
function inlineScanIsHopeless(index: MarkdocCloseIndex, line: number, offset: number): boolean {
  return read(index.lastCloseOnLine, line) < offset;
}

/** The first `%}` this block span would reach is missing or has text after it. */
function blockScanIsHopeless(index: MarkdocCloseIndex, line: number, offset: number): boolean {
  const first = read(index.firstCloseOnLine, line);
  // The table entry is for the first close on the line. If this span starts
  // after it, the entry does not apply, so let the scanner decide.
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

    // An inline span cannot cross a line ending, so give up and treat it as text.
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

    // Consume a whole run of `%` so a body ending in `%` (`{% t x="100%%" %}`)
    // still finds the real `%}`.
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
    // Micromark needs an `enter()` before `consume()` after any `exit()`, so each
    // line of the span is wrapped in a `data` token. `dataOpen` tracks whether one
    // is open. `structureMarkdocTags` only reads the tag's text, not these tokens.
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
        closeData(); // must close before entering `lineEnding`
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

    // Only whitespace may follow `%}` in the block form. Other content
    // (`{% partial /%} tag.`) makes it inline, so the text construct handles it.
    //
    // The token ends at `}`, so its text always ends with `%}`, and trailing
    // whitespace becomes a separate `whitespace` token. `parseMarkdocSpan` and
    // `markerBounds` rely on this.
    function after(code: Code): State | undefined {
      if (
        code === codes.eof ||
        code === codes.carriageReturn ||
        code === codes.lineFeed ||
        code === codes.carriageReturnLineFeed
      ) {
        closeData(); // must close before exiting `markdocTag`
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
 * Micromark extension for Markdoc tag spans, used only when `ParseOptions.markdoc`
 * is on, because Liquid and Jinja also use `{% %}`. It takes the document text so
 * both constructs can share the `%}` index, so build a new one for each parse.
 *
 * It also turns off indented code and setext headings, like Markdoc does.
 * Without that, an indented `{% card %}` would be read as code, and indented
 * prose would be hidden from the prose rules.
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
