export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

// Shared with title-case.ts, so both agree on what ends a sentence (`Cost vs. value` is one sentence).
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
 * The word right before `index`, lowercased and without a trailing dot (`e.g.` gives `e.g`,
 * the form `ABBREVIATIONS` uses). Also used by title-case.ts.
 */
export function lastWordBefore(text: string, index: number): string {
  const slice = text.slice(0, index);
  const match = /([\w.]+)$/.exec(slice);
  return (match ? match[1] : '').toLowerCase().replace(/\.$/, '');
}

// An ordinal like `1. Title` or `**1. Title**` is a label, not a sentence end. Digits before
// the '.' count as one at the start of the text, or right after an emphasis opener (`*`, `**`,
// `_`, `__`). A digit in a sentence ("The answer is 42. Next.") is still a boundary.
function isOrdinalEnumerator(text: string, dotIndex: number): boolean {
  let j = dotIndex - 1;
  if (j < 0 || !/\d/.test(text[j])) return false;
  while (j >= 0 && /\d/.test(text[j])) j--;
  // Only digits allowed: a letter or '.' in front makes it "v1" or "1.2", not an ordinal.
  if (j >= 0 && /[A-Za-z.]/.test(text[j])) return false;
  const beforeDigits = j;
  while (j >= 0 && (text[j] === '*' || text[j] === '_')) j--;
  if (j < beforeDigits) {
    // Emphasis markers before the digits must be a real opener: at the start or after a
    // non-word character (`_` in `x_1` is not).
    return j < 0 || !/[A-Za-z0-9]/.test(text[j]);
  }
  // Bare digits count only at line start, after optional indentation.
  while (j >= 0 && (text[j] === ' ' || text[j] === '\t')) j--;
  return j < 0 || text[j] === '\n' || text[j] === '\r';
}

// An inline or reference link or image. A period inside one belongs to the label or URL, not
// a sentence end. The label has no bare brackets, and the destination allows one level of
// balanced parens (`/wiki/Foo_(bar)`). A backslash escapes the next character.
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

// Index of the first `[` at or after `from` that is not escaped; -1 if none.
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

// End (exclusive) of the link that opens at `open`, or -1 if it is not a link.
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

// Index of the `]` that closes a label starting at `from`; -1 on a bare `[` or the end.
function scanLabel(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') i++;
    else if (ch === ']') return i;
    else if (ch === '[') return -1;
  }
  return -1;
}

// End (exclusive) of a destination starting at `from`; -1 on a second level of parens or the end.
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

// A blank line ends a sentence even without a terminator ("To Whom It May Concern:"). In a
// blockquote, a line with only spaces, tabs and `>` counts as blank.
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
    // A terminator may sit inside closing emphasis, quotes or brackets ("**REQUIRED.** Provide…"),
    // which belong to this sentence. Backticks are excluded so the `inCode` toggle stays in sync.
    let close = i;
    while (close + 1 < blockEnd && '*_"\')]”’'.includes(text[close + 1])) close++;
    const next = text[close + 1];
    // A boundary needs whitespace, then a sentence opener. A hard-break backslash counts as whitespace.
    if (next === undefined || close + 1 >= blockEnd) break;
    const nextIsBreak = next === '\\' && (text[close + 2] === '\n' || text[close + 2] === '\r');
    if (next !== ' ' && next !== '\n' && next !== '\t' && next !== '\r' && !nextIsBreak) continue;
    // Skip the whole whitespace run: a continuation line in a list item or Markdoc tag is
    // indented. A hard-break backslash before a newline and a `>` quote marker on a new line
    // count as whitespace.
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
    // Emphasis markers, quotes and brackets open a sentence only if the wrapped text starts like
    // one, so `*args` or "(textarea)" do not cause a false split. A backtick always opens.
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

// Trims whitespace and leftover markup from the start of a span: a hard-break backslash or a
// blockquote `>` marker.
function pushSpan(spans: SentenceSpan[], text: string, start: number, end: number): void {
  const raw = text.slice(start, end);
  // Only a backslash right before a newline is hard-break markup (not `\\*` or a UNC path), and a
  // `>` is a quote marker only at the start of a line.
  const lead = /^(?:[ \t]|\r|\n[ \t>]*|>[ \t]*|\\(?=[\r\n]))*/.exec(raw)?.[0].length ?? 0;
  const clean = raw.slice(lead).trimEnd();
  if (clean) spans.push({ text: clean, start: start + lead, end });
}
