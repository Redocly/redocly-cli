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
// end: `[Step 1. Configure](#step-1)` is one inline unit. The label holds no
// bare brackets; the destination admits one level of balanced parens
// (`/wiki/Foo_(bar)`), matching what CommonMark allows unescaped. A backslash
// escapes the character after it. Each bare `[` is visited once.
function linkRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let open = nextBareBracket(text, 0);
  while (open !== -1) {
    const end = linkEnd(text, open);
    if (end === -1) {
      open = nextBareBracket(text, open + 1);
      continue;
    }
    const start = open > 0 && text[open - 1] === '!' ? open - 1 : open;
    ranges.push([start, end]);
    open = nextBareBracket(text, end);
  }
  return ranges;
}

// Index of the first `[` at or after `from` that no odd run of backslashes
// escapes; -1 when there is none.
function nextBareBracket(text: string, from: number): number {
  let index = text.indexOf('[', from);
  while (index !== -1 && isEscaped(text, index)) index = text.indexOf('[', index + 1);
  return index;
}

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) backslashes++;
  return backslashes % 2 === 1;
}

// End (exclusive) of the link that opens at `open`, or -1 when the text there
// is not `[label](destination)` or `[label][reference]`.
function linkEnd(text: string, open: number): number {
  const labelClose = scanLabel(text, open + 1);
  if (labelClose === -1) return -1;
  const next = text[labelClose + 1];
  if (next === '(') return scanDestination(text, labelClose + 2);
  if (next === '[') {
    const referenceClose = scanLabel(text, labelClose + 2);
    return referenceClose === -1 ? -1 : referenceClose + 1;
  }
  return -1;
}

// Index of the `]` that closes a label whose content starts at `from`; -1 on
// a bare `[` or the end of the text.
function scanLabel(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') i++;
    else if (ch === ']') return i;
    else if (ch === '[') return -1;
  }
  return -1;
}

// End (exclusive) of a destination whose content starts at `from`; -1 on a
// second level of parens or the end of the text.
function scanDestination(text: string, from: number): number {
  let nested = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') i++;
    else if (ch === '(') {
      if (nested) return -1;
      nested = true;
    } else if (ch === ')') {
      if (!nested) return i + 1;
      nested = false;
    }
  }
  return -1;
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
