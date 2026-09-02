export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

// Shared with title-case.ts's sentence-break test, so the casing styles and
// the sentence splitter agree on what ends a sentence. One list, not two:
// `Cost vs. value` is a single sentence to both.
export const ABBREVIATIONS = new Set([
  'e.g',
  'i.e',
  'u.s',
  'u.k',
  'etc',
  'vs',
  'cf',
  'ca',
  'al',
  'approx',
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'st',
  'no',
  'fig',
  'sec',
  'min',
  'max',
  'dept',
  'est',
  'inc',
  'ltd',
]);

/**
 * The word immediately before `index`, lowercased, with a trailing dot
 * removed -- so a dotted abbreviation like `e.g.` yields `e.g`, which is the
 * form ABBREVIATIONS stores. Exported for title-case.ts, which asks the same
 * question at the same kind of boundary.
 */
export function lastWordBefore(text: string, index: number): string {
  const slice = text.slice(0, index);
  const match = /([\w.]+)$/.exec(slice);
  return (match ? match[1] : '').toLowerCase().replace(/\.$/, '');
}

// An ordinal enumerator like `1. Title` or `**1. Title**` is a label, not a
// sentence end. A digit-only token before the '.' sits in enumerator position
// when it is (i) at the start of the content being split (line start, after
// leading whitespace only), or (ii) right after an emphasis/strong opener
// (`*`, `**`, `_`, `__`) — including mid-line, e.g. `Intro: **2. Title**`.
// A plain mid-sentence digit-period ("The answer is 42. Next.") is NOT
// enumerator position and stays a boundary.
function isOrdinalEnumerator(text: string, dotIndex: number): boolean {
  let j = dotIndex - 1;
  if (j < 0 || !/\d/.test(text[j])) return false;
  while (j >= 0 && /\d/.test(text[j])) j--;
  // The token core must be ONLY digits: a letter or '.' attached in front
  // makes it "v1", "1.2", etc. — never an enumerator.
  if (j >= 0 && /[A-Za-z.]/.test(text[j])) return false;
  const beforeDigits = j;
  while (j >= 0 && (text[j] === '*' || text[j] === '_')) j--;
  if (j < beforeDigits) {
    // Emphasis markers directly before the digits mark an enumerator, but
    // only when they are a real opener: at content start or after a
    // non-word character (an intraword `_` as in `x_1` is not an opener).
    return j < 0 || !/[A-Za-z0-9]/.test(text[j]);
  }
  // Bare digits: enumerator position only at line start, allowing leading
  // indentation.
  while (j >= 0 && (text[j] === ' ' || text[j] === '\t')) j--;
  return j < 0 || text[j] === '\n' || text[j] === '\r';
}

// An inline or reference link/image, including its text and its destination.
// A period inside one is punctuation in a label or a URL, never a sentence
// end: `[Step 1. Configure](#step-1)` is one inline unit. The destination
// admits one level of balanced parens (`/wiki/Foo_(bar)`), matching what
// CommonMark allows unescaped.
const LINK_RE = /!?\[(?:[^[\]\\]|\\.)*\](?:\((?:[^()\\]|\\.|\([^()]*\))*\)|\[(?:[^[\]\\]|\\.)*\])/g;

function linkRanges(text: string): Array<[number, number]> {
  if (!text.includes('[')) return [];
  const ranges: Array<[number, number]> = [];
  for (const match of text.matchAll(LINK_RE)) {
    const start = match.index ?? 0;
    ranges.push([start, start + match[0].length]);
  }
  return ranges;
}

// A blank line is a paragraph break, so it always ends a sentence, even
// without a terminator ("To Whom It May Concern:"). Inside a blockquote
// segment the blank line still carries its `>` markers, so a line holding
// only spaces, tabs, and `>` counts as blank.
const BLANK_LINE_RUN = /(?:\r?\n|\r)(?:[ \t>]*(?:\r?\n|\r))+/g;

export function splitSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const links = linkRanges(text);
  let from = 0;
  for (const match of text.matchAll(BLANK_LINE_RUN)) {
    scanBlock(spans, text, links, from, match.index ?? 0);
    from = (match.index ?? 0) + match[0].length;
  }
  scanBlock(spans, text, links, from, text.length);
  return spans;
}

function scanBlock(
  spans: SentenceSpan[],
  text: string,
  links: Array<[number, number]>,
  blockStart: number,
  blockEnd: number
): void {
  let start = blockStart;
  let inCode = false;
  for (let i = blockStart; i < blockEnd; i++) {
    const char = text[i];
    if (char === '`') {
      inCode = !inCode;
      continue;
    }
    if (inCode || !'.!?'.includes(char)) continue;
    if (links.some(([from, to]) => i >= from && i < to)) continue;
    // Consume runs of terminators ("?!", "...").
    while (i + 1 < blockEnd && '.!?'.includes(text[i + 1])) i++;
    // A terminator may sit inside closing emphasis, quotes, or brackets
    // ("**REQUIRED.** Provide…", "(See the guide.) Then…") — those closers
    // belong to this sentence. Backtick stays out: consuming one here would
    // desync the inCode toggle above.
    let close = i;
    while (close + 1 < blockEnd && '*_"\')]”’'.includes(text[close + 1])) close++;
    const next = text[close + 1];
    // Boundary requires whitespace then a sentence opener. A hard-break
    // backslash directly after the terminator (".\\" + newline) counts as
    // whitespace too.
    if (next === undefined || close + 1 >= blockEnd) break; // end of block handled below
    const nextIsBreak = next === '\\' && (text[close + 2] === '\n' || text[close + 2] === '\r');
    if (next !== ' ' && next !== '\n' && next !== '\t' && next !== '\r' && !nextIsBreak) continue;
    // Skip the whole whitespace run: a continuation line inside a list item
    // or Markdoc tag body is indented, so the character right after the
    // newline is a space, not the opener that proves the boundary. A
    // markdown hard-break backslash counts as whitespace here (only when a
    // newline follows it), and so does a blockquote continuation marker
    // (`>` on a new line).
    let j = close + 2;
    let afterNewline = next === '\n' || next === '\r';
    while (j < blockEnd) {
      const ch = text[j];
      if (ch === '\n' || ch === '\r') {
        afterNewline = true;
        j++;
      } else if (ch === ' ' || ch === '\t') j++;
      else if (ch === '\\' && (text[j + 1] === '\n' || text[j + 1] === '\r')) j++;
      else if (ch === '>' && afterNewline) j++;
      else break;
    }
    // Emphasis markers, quotes, and brackets open a sentence only when the
    // wrapped text itself starts like one ("**Apigee X** supports…",
    // "(See the guide.)") — otherwise a code-like identifier such as
    // `*args` or a lowercase parenthetical such as "(textarea)" would
    // trigger a false split. A code tick opens unconditionally: code
    // content carries no case signal.
    let opener = j;
    while (opener < blockEnd && '*_"\'([“‘'.includes(text[opener])) opener++;
    const after = text[opener];
    if (after === undefined || opener >= blockEnd || !/[A-Z`]/.test(after)) continue;
    if (char === '.') {
      const word = lastWordBefore(text, i);
      if (ABBREVIATIONS.has(word)) continue;
      if (/\d$/.test(text[i - 1] ?? '') && /\d/.test(after)) continue; // decimals
      if (isOrdinalEnumerator(text, i)) continue;
    }
    const end = close + 1;
    pushSpan(spans, text, start, end);
    start = end;
  }
  pushSpan(spans, text, start, blockEnd);
}

// A span between boundaries may open with markup left over from the
// previous line — a hard-break backslash ("sentence. \\\n  Next") or a
// blockquote continuation marker ("sentence.\n> Next") — so those are
// trimmed away with the surrounding whitespace.
function pushSpan(spans: SentenceSpan[], text: string, start: number, end: number): void {
  const raw = text.slice(start, end);
  // Only a backslash directly before a newline is hard-break markup; a
  // leading escape like `\\*` or a UNC path keeps its backslash. A `>` is
  // a quote marker only at the start of a line.
  const lead = /^(?:[ \t]|\r|\n[ \t>]*|>[ \t]*|\\(?=[\r\n]))*/.exec(raw)?.[0].length ?? 0;
  const clean = raw.slice(lead).trimEnd();
  if (clean) spans.push({ text: clean, start: start + lead, end });
}
