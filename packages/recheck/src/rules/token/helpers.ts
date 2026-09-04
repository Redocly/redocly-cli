// Ported from markdownlint's helpers/micromark-helpers.cjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// `isBlankLine` is ported from markdownlint's helpers/helpers.cjs (same
// project/license) since markdownlint splits its token helpers and its
// generic string helpers across two files; Recheck keeps both here because
// every ported rule needs both.
import { newLineRe } from '../../core/line-endings.js';
import { filterByTypes } from '../../parser/index.js';
import type { Token, TokenTree } from '../../parser/types.js';

/**
 * Adds a range of numbers (inclusive of both bounds) to a set.
 */
export function addRangeToSet(set: Set<number>, start: number, end: number): void {
  for (let i = start; i <= end; i++) {
    set.add(i);
  }
}

/**
 * A line/column range within a file (1-based, inclusive of both ends).
 * Shares field names with `Token`'s start/end line/column so a `Token` can
 * be passed directly wherever a `FileRange` is expected.
 */
export interface FileRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

function positionLessThanOrEqual(
  lineA: number,
  columnA: number,
  lineB: number,
  columnB: number
): boolean {
  return lineA < lineB || (lineA === lineB && columnA <= columnB);
}

/**
 * Returns whether two ranges (or Tokens) overlap anywhere. Ported from
 * markdownlint's helpers/helpers.cjs `hasOverlap`.
 */
export function hasOverlap(rangeA: FileRange, rangeB: FileRange): boolean {
  const lte = positionLessThanOrEqual(
    rangeA.startLine,
    rangeA.startColumn,
    rangeB.startLine,
    rangeB.startColumn
  );
  const first = lte ? rangeA : rangeB;
  const second = lte ? rangeB : rangeA;
  return positionLessThanOrEqual(
    second.startLine,
    second.startColumn,
    first.endLine,
    first.endColumn
  );
}

/**
 * Filter a token tree, or an arbitrary token array (accepted so
 * `blanksAroundLists`/MD032 can start the walk from `list.children`
 * instead of the whole tree), by predicate — walking depth-first. Ported
 * from upstream's `filterByPredicate(tokens, allowed, transformChildren)`:
 * `transformChildren`, when given, replaces a token's own `children` array
 * for traversal purposes only (the returned `result` array is unaffected) —
 * upstream uses this to redirect traversal into htmlFlow subtokens, and
 * MD032 uses it to stop descending into nested lists (so only *top-level*
 * lists are returned) and to skip "non-content" token subtrees entirely.
 * Omitting `transformChildren` walks every real child, matching every
 * batch 1/2 caller's usage (none needed it before MD032).
 */
export function filterByPredicate(
  tree: TokenTree | Token[],
  predicate: (token: Token) => boolean,
  transformChildren?: (token: Token) => Token[]
): Token[] {
  const result: Token[] = [];
  const startArray = Array.isArray(tree) ? tree : tree.children;
  const queue: { array: Token[]; index: number }[] = [{ array: startArray, index: 0 }];
  while (queue.length > 0) {
    const current = queue[queue.length - 1];
    const { array } = current;
    if (current.index < array.length) {
      const token = array[current.index++];
      if (predicate(token)) {
        result.push(token);
      }
      if (token.children.length > 0) {
        const transformed = transformChildren ? transformChildren(token) : token.children;
        queue.push({ array: transformed, index: 0 });
      }
    } else {
      queue.pop();
    }
  }
  return result;
}

/**
 * Gets a list of nested token descendants by type path. Each path element
 * matches one depth of descent and may be a single type or (per upstream's
 * own signature, `helpers/helpers.cjs`'s shared `getDescendantsByType`) an
 * array of alternative types to match at that depth — used by batch 5's
 * `link-image-style` (MD054) for `resourceDestination`'s
 * literal/raw-destination split and `autolink`'s email/protocol split.
 * Earlier batches (see `getHeadingText` below) predate this and call once
 * per alternative instead, merging results themselves; both styles coexist
 * since neither is wrong, but new callers needing an alternation can now
 * use a single call.
 */
export function getDescendantsByType(
  token: Token,
  typePath: readonly (string | readonly string[])[]
): Token[] {
  let tokens: Token[] = [token];
  for (const type of typePath) {
    const matches = Array.isArray(type)
      ? (child: Token) => (type as readonly string[]).includes(child.type)
      : (child: Token) => child.type === type;
    tokens = tokens.flatMap((t) => t.children.filter(matches));
  }
  return tokens;
}

/**
 * Gets the nearest parent of one of the specified types for a token.
 */
export function getParentOfType(token: Token, types: readonly string[]): Token | null {
  let current: Token | null = token;
  while ((current = current.parent) && !types.includes(current.type)) {
    // Empty
  }
  return current;
}

/**
 * Gets the heading level of an atx or setext heading token. Matches
 * upstream: looks for a direct child of type `atxHeadingSequence` or
 * `setextHeadingLine` (the setext underline is a direct child of
 * `setextHeading`, not nested further) and reads its level from the text.
 */
export function getHeadingLevel(heading: Token): number {
  let level = 1;
  const headingSequence = heading.children.find((child) =>
    ['atxHeadingSequence', 'setextHeadingLine'].includes(child.type)
  );
  const text = headingSequence?.text ?? '';
  if (text[0] === '#') {
    level = Math.min(text.length, 6);
  } else if (text[0] === '-') {
    level = 2;
  }
  return level;
}

/**
 * Gets the heading style of an atx or setext heading token: `'setext'` for
 * setext headings, `'atx'` for a plain atx heading (one `atxHeadingSequence`
 * child), or `'atx_closed'` for a closed atx heading (a trailing
 * `atxHeadingSequence` closing marker as a second direct-child sequence).
 */
export function getHeadingStyle(heading: Token): 'setext' | 'atx' | 'atx_closed' {
  if (heading.type === 'setextHeading') {
    return 'setext';
  }
  const atxHeadingSequenceLength = heading.children.filter(
    (child) => child.type === 'atxHeadingSequence'
  ).length;
  return atxHeadingSequenceLength === 1 ? 'atx' : 'atx_closed';
}

/**
 * Gets the heading text of an atx or setext heading token. Descends into
 * `atxHeadingText`/`setextHeadingText` (nested arbitrarily deep under the
 * heading, e.g. inside inline containers) and concatenates all non-htmlText
 * descendant text, collapsing internal newlines (setext headings can span
 * multiple lines) to single spaces.
 */
export function getHeadingText(heading: Token): string {
  const textTokens = [
    ...getDescendantsByType(heading, ['atxHeadingText']),
    ...getDescendantsByType(heading, ['setextHeadingText']),
  ];
  return textTokens
    .flatMap((descendant) => descendant.children.filter((child) => child.type !== 'htmlText'))
    .map((data) => data.text)
    .join('')
    .replace(newLineRe, ' ');
}

/**
 * Gets the blockquote prefix text (if any) for the specified line number,
 * e.g. `"> "` for a line inside a single-level blockquote. Upstream filters
 * a flat token list by type via `filterByTypes`; Recheck's `TokenTree`
 * already carries a flat list (`tree.flat`), so this takes the tree
 * directly rather than a pre-filtered token array.
 */
export function getBlockQuotePrefixText(tree: TokenTree, lineNumber: number, count = 1): string {
  return tree.flat
    .filter((token) => token.type === 'blockQuotePrefix' || token.type === 'linePrefix')
    .filter((prefix) => prefix.startLine === lineNumber)
    .map((prefix) => prefix.text)
    .join('')
    .trimEnd()
    .concat('\n')
    .repeat(count);
}

/**
 * Returns true iff the input line is blank (contains nothing, whitespace,
 * blockquote markers, or HTML comments (unclosed start/end comments
 * allowed)). Ported from markdownlint's helpers/helpers.cjs `isBlankLine`.
 */
export function isBlankLine(line: string): boolean {
  const startComment = '<!--';
  const endComment = '-->';
  const removeComments = (s: string): string => {
    for (;;) {
      const start = s.indexOf(startComment);
      const end = s.indexOf(endComment);
      if (end !== -1 && (start === -1 || end < start)) {
        // Unmatched end comment is first
        s = s.slice(end + endComment.length);
      } else if (start !== -1 && end !== -1) {
        // Start comment is before end comment
        s = s.slice(0, start) + s.slice(end + endComment.length);
      } else if (start !== -1 && end === -1) {
        // Unmatched start comment is last
        s = s.slice(0, start);
      } else {
        // No more comments to remove
        return s;
      }
    }
  };
  return !line || !line.trim() || !removeComments(line).replace(/>/g, '').trim();
}

/**
 * Set of token types that do not contain document content (used to skip
 * over "non-content" tokens — indentation, blank lines, container prefixes
 * — when scanning for a document's first meaningful token). Ported from
 * markdownlint's helpers/micromark-helpers.cjs `nonContentTokens`.
 */
export const nonContentTokens = new Set<string>([
  'blockQuoteMarker',
  'blockQuotePrefix',
  'blockQuotePrefixWhitespace',
  'gfmFootnoteDefinitionIndent',
  'lineEnding',
  'lineEndingBlank',
  'linePrefix',
  'listItemIndent',
  'undefinedReference',
  'undefinedReferenceCollapsed',
  'undefinedReferenceFull',
  'undefinedReferenceShortcut',
]);

/**
 * Returns the last line number (1-based, inclusive) of the document's YAML
 * frontmatter block, or 0 if there is none.
 *
 * Upstream markdownlint slices frontmatter out of `content` entirely
 * before tokenizing (see markdownlint's `removeFrontMatter`) — every
 * rule's `params.lines`/token stream is already frontmatter-free, with
 * `frontMatterLines.length` added back only when reporting an error's line
 * number. Recheck's parser instead keeps a `yaml` token (and all its
 * descendant tokens — `yamlFence`, `yamlValue`, etc. — individually
 * present in `tree.flat`, a full depth-first flattening) as real content.
 * Rules that scan `ctx.lines` by index, or walk `ctx.tree.flat` from the
 * top of the document looking for the first "real" token, must skip every
 * line up to and including this one to match upstream's behavior — see
 * first-line-h1.ts, single-h1.ts, and line-length.ts for call sites.
 */
export function getFrontmatterEndLine(tree: TokenTree): number {
  const frontmatter = tree.flat.find((token) => token.type === 'yaml');
  return frontmatter?.endLine ?? 0;
}

/**
 * Returns true iff the document's YAML front matter contains a title — i.e.
 * the `pattern` regex matches at least one of the front matter block's lines.
 *
 * WHY THIS EXISTS: it ports upstream markdownlint's `front_matter_title`
 * rule option (implemented there by helpers/helpers.cjs's own
 * `frontMatterHasTitle`), which exists on exactly three upstream rules —
 * MD001 (our heading-increment), MD025 (single-h1), and MD041
 * (first-line-h1); see
 * https://github.com/DavidAnson/markdownlint/blob/main/doc/md001.md.
 * When the front matter declares a title, it counts as the document's
 * implicit top-level (h1) heading:
 * - heading-increment then expects the first body heading to be an h2;
 * - single-h1 treats it as the document's one H1, so EVERY body h1 is a
 *   violation;
 * - first-line-h1 is satisfied by it outright and checks nothing else.
 *
 * The default pattern is `^\s*"?title"?\s*[:=]`: a `title` key, optionally
 * double-quoted, followed by `:` (YAML) or `=` (TOML-style front matter),
 * matched case-insensitively. Each of the three rules declares that default
 * in its own `defaults` object — exactly as each upstream rule declares its
 * own default — and this helper only encapsulates the matching.
 *
 * CONTRACT: `pattern` is the raw config value (`ctx.config.frontMatterTitle`);
 * configuring the empty string `''` (or a nullish value) disables the
 * behavior entirely — this helper then always returns false — matching
 * upstream's documented "specify `""` for `front_matter_title`" opt-out.
 *
 * Upstream builds the regex with the `i` flag only and tests it against each
 * front matter LINE individually (`frontMatterLines.some(...)`), where
 * `frontMatterLines` is the whole regex-matched front matter block —
 * INCLUDING both delimiter fence lines — split on line endings (see
 * markdownlint's `removeFrontMatter`). Recheck's parser keeps that same
 * block as one `yaml` token (see getFrontmatterEndLine's doc comment above)
 * whose text spans opening fence through closing fence with no trailing
 * newline, so splitting it on `newLineRe` reproduces upstream's lines
 * exactly, and the regex is tested per line here too. (Testing the whole
 * block with `im` instead is NOT equivalent: a custom pattern containing a
 * literal `\n`, or one where `\s*`/`[\s\S]*` can absorb a line ending —
 * e.g. `author:.*\s*title` — would match across lines, which upstream
 * never does.)
 */
export function frontMatterHasTitle(tree: TokenTree, pattern: unknown): boolean {
  const frontMatterTitle = String(pattern ?? '');
  if (!frontMatterTitle) return false;
  const frontmatter = tree.flat.find((token) => token.type === 'yaml');
  if (frontmatter === undefined) return false;
  const frontMatterTitleRe = new RegExp(frontMatterTitle, 'i');
  return frontmatter.text.split(newLineRe).some((line) => frontMatterTitleRe.test(line));
}

/**
 * Returns true iff the token is an HTML comment (`<!-- ... -->`) that is
 * valid per the CommonMark spec (comment body doesn't start with `>` or
 * `->`, and doesn't end with `-`). Ported from markdownlint's
 * helpers/micromark-helpers.cjs `isHtmlFlowComment`.
 */
export function isHtmlFlowComment(token: Token): boolean {
  const { text, type } = token;
  if (type === 'htmlFlow' && text.startsWith('<!--') && text.endsWith('-->')) {
    const comment = text.slice(4, -3);
    return !comment.startsWith('>') && !comment.startsWith('->') && !comment.endsWith('-');
  }
  return false;
}

const htmlCommentBegin = '<!--';
const htmlCommentEnd = '-->';
const safeCommentCharacter = '.';
const startsWithPipeRe = /^ *\|/;
const notCrLfRe = /[^\r\n]/g;
const notSpaceCrLfRe = /[^ \r\n]/g;
const trailingSpaceRe = / +[\r\n]/g;
const replaceTrailingSpace = (s: string) => s.replace(notCrLfRe, safeCommentCharacter);

/**
 * Replaces the content of valid CommonMark HTML comments with the `.`
 * "safe" character, preserving every line/column position in the rest of
 * the document (never removes characters, never touches `\r`/`\n`).
 * Ported from markdownlint's helpers/helpers.cjs `clearHtmlCommentText`.
 *
 * This is upstream's OWN pre-processing pass -- run once, globally, before
 * `params.lines` is computed -- so that rules doing plain text/line
 * scanning (as opposed to token-tree scanning) never see real content
 * inside an HTML comment: trailing whitespace inside a comment isn't
 * "trailing whitespace" (MD009), a tab inside a comment isn't a "hard
 * tab" (MD010), reversed-link syntax inside a comment isn't a broken link
 * (MD011), etc. Token-tree-based scanning (e.g. MD033/MD037, which read
 * `params.parsers.micromark.tokens`) is unaffected -- those tokens are
 * built from the ORIGINAL, uncleared content upstream, matching how
 * recheck's own token tree (`ctx.tree`) is never cleared either; only
 * `ctx.lines` (see core/runner.ts) uses this cleared text.
 */
export function clearHtmlCommentText(text: string): string {
  let i = 0;
  while ((i = text.indexOf(htmlCommentBegin, i)) !== -1) {
    const j = text.indexOf(htmlCommentEnd, i + 2);
    if (j === -1) {
      // Unterminated comments are treated as text.
      break;
    }
    if (j > i + htmlCommentBegin.length) {
      const content = text.slice(i + htmlCommentBegin.length, j);
      const lastLf = text.lastIndexOf('\n', i) + 1;
      const preText = text.slice(lastLf, i);
      const isBlock = preText.trim().length === 0;
      const couldBeTable = startsWithPipeRe.test(preText);
      const spansTableCells = couldBeTable && content.includes('\n');
      const isValid =
        isBlock ||
        !(
          spansTableCells ||
          content.startsWith('>') ||
          content.startsWith('->') ||
          content.endsWith('-') ||
          content.includes('--')
        );
      if (isValid) {
        const clearedContent = content
          .replace(notSpaceCrLfRe, safeCommentCharacter)
          .replace(trailingSpaceRe, replaceTrailingSpace);
        text = text.slice(0, i + htmlCommentBegin.length) + clearedContent + text.slice(j);
      }
    }
    i = j + htmlCommentEnd.length;
  }
  return text;
}

const docfxTabSyntaxRe = /^#tab\//;

/**
 * Returns true iff the heading is a DocFX tab heading (an atx heading whose
 * entire text is a single link with a `#tab/...` destination) — see
 * https://dotnet.github.io/docfx/docs/markdown.html?tabs=linux%2Cdotnet#tabs.
 * Ported from markdownlint's helpers/micromark-helpers.cjs `isDocfxTab`.
 */
// Regular expression for identifying an HTML entity at the end of a line.
// Ported from markdownlint's helpers/helpers.cjs `endOfLineHtmlEntityRe`.
export const endOfLineHtmlEntityRe =
  /&(?:#\d+|#[xX][\da-fA-F]+|[a-zA-Z]{2,31}|blk\d{2}|emsp1[34]|frac\d{2}|sup\d|there4);$/;

// Regular expression for identifying a GitHub emoji code at the end of a
// line. Ported from markdownlint's helpers/helpers.cjs `endOfLineGemojiCodeRe`.
export const endOfLineGemojiCodeRe =
  /:(?:[abmovx]|[-+]1|100|1234|(?:1st|2nd|3rd)_place_medal|8ball|clock\d{1,4}|e-mail|non-potable_water|o2|t-rex|u5272|u5408|u55b6|u6307|u6708|u6709|u6e80|u7121|u7533|u7981|u7a7a|[a-z]{2,15}2?|[a-z]{1,14}(?:_[a-z\d]{1,16})+):$/;

// All punctuation characters (normal and full-width). Ported from
// markdownlint's helpers/helpers.cjs `allPunctuation`.
export const allPunctuation = '.,;:!?。，；：！？';

// All punctuation characters without question mark (normal and
// full-width). Ported from markdownlint's helpers/helpers.cjs
// `allPunctuationNoQuestion`.
export const allPunctuationNoQuestion = allPunctuation.replace(/[?？]/gu, '');

/**
 * Escapes a string for safe use inside a RegExp character class/pattern.
 * Ported from markdownlint's helpers/helpers.cjs `escapeForRegExp`.
 */
export function escapeForRegExp(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const loneSurrogateRe = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Replaces lone (unpaired) surrogate code units with U+FFFD, matching the
 * behavior of `String.prototype.toWellFormed()` (ES2024). Recheck's
 * `tsconfig.json` targets ES2021 (shared across the whole package, not
 * something this rule port should widen), so `link-fragments` (MD051) —
 * the only upstream rule using `.toWellFormed()` (on heading/fragment text
 * before `encodeURIComponent`, which throws on lone surrogates) — calls
 * this instead of the native method.
 */
export function toWellFormedString(str: string): string {
  return str.replace(loneSurrogateRe, '�');
}

/**
 * HTML tag information: whether it's a closing tag and its (lowercased-by-
 * caller-if-needed) name. Ported from markdownlint's
 * helpers/micromark-helpers.cjs `getHtmlTagInfo`.
 */
export interface HtmlTagInfo {
  close: boolean;
  name: string;
}

const htmlTagNameRe = /^<([^!>][^/\s>]*)/;

/**
 * Gets information about the tag in an HTML token (an `htmlText` token's
 * opening `<tag ...>` or closing `</tag>`), or `null` if the token's text
 * doesn't start with a recognizable tag (e.g. an HTML comment). Ported from
 * markdownlint's helpers/micromark-helpers.cjs `getHtmlTagInfo`.
 */
export function getHtmlTagInfo(token: Token): HtmlTagInfo | null {
  if (token.type === 'htmlText') {
    const match = htmlTagNameRe.exec(token.text);
    if (match) {
      const name = match[1];
      const close = name.startsWith('/');
      return { close, name: close ? name.slice(1) : name };
    }
  }
  return null;
}

/**
 * Builds a RegExp for matching the specified HTML attribute (e.g. `alt=`,
 * `id=`) within a raw HTML tag's text, capturing its (optionally quoted)
 * value. Ported from markdownlint's helpers/helpers.cjs `getHtmlAttributeRe`.
 */
export function getHtmlAttributeRe(name: string): RegExp {
  return new RegExp(`\\s${name}\\s*=\\s*['"]?([^'"\\s>]*)`, 'iu');
}

/**
 * Truncates long text for use in error context, keeping the start, end, or
 * both ends depending on which end(s) matter. Ported from markdownlint's
 * helpers/helpers.cjs `ellipsify`.
 */
export function ellipsify(text: string, start?: boolean, end?: boolean): string {
  if (text.length <= 30) {
    // Nothing to do
  } else if (start && end) {
    text = text.slice(0, 15) + '...' + text.slice(-15);
  } else if (end) {
    text = '...' + text.slice(-30);
  } else {
    text = text.slice(0, 30) + '...';
  }
  return text;
}

export function isDocfxTab(heading: Token | null | undefined): boolean {
  if (heading?.type === 'atxHeading') {
    const headingTexts = getDescendantsByType(heading, ['atxHeadingText']);
    if (
      headingTexts.length === 1 &&
      headingTexts[0].children.length === 1 &&
      headingTexts[0].children[0].type === 'link'
    ) {
      // `resourceDestinationString` nests several levels deep under the
      // link (link > resource > resourceDestination >
      // resourceDestinationRaw/Literal > resourceDestinationString), not
      // as a direct child of the link -- matches upstream's own
      // `filterByTypes(..., ["resourceDestinationString"])`, which walks
      // to any depth, so this must use the recursive descendant helper
      // (`filterByPredicate`) rather than a direct `.children.filter(...)`.
      const resourceDestinationStrings = filterByPredicate(
        headingTexts[0].children[0].children,
        (child) => child.type === 'resourceDestinationString'
      );
      return (
        resourceDestinationStrings.length === 1 &&
        docfxTabSyntaxRe.test(resourceDestinationStrings[0].text)
      );
    }
  }
  return false;
}

export function normalizeReference(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** One usage site of a reference/shortcut label: `[lineIndex, columnIndex, length]` (0-based line/column), matching upstream's `number[][]` shape exactly so MD052's line/column math ports verbatim. */
export type ReferenceDatum = [lineIndex: number, columnIndex: number, length: number];

export interface GetReferenceLinkImageDataResult {
  /** Normalized label -> usage sites, for "full"/"collapsed" reference syntax (`[text][label]`, `[label][]`). */
  references: Map<string, ReferenceDatum[]>;
  /** Normalized label -> usage sites, for "shortcut" syntax (`[label]`) and footnote calls (`[^label]`). */
  shortcuts: Map<string, ReferenceDatum[]>;
  /** Normalized label -> `[lineIndex, destinationText]` for each `[label]: destination` (or footnote `[^label]: ...`) definition. */
  definitions: Map<string, [number, string]>;
  /** `[label, lineIndex]` for each definition after the first one seen for that label. */
  duplicateDefinitions: [string, number][];
}

/**
 * Returns information about reference-style links/images and their
 * definitions across the whole document: which labels are defined, which
 * are used (split into "full/collapsed" `references` vs "shortcut"
 * `shortcuts`, since shortcut syntax is ambiguous with plain bracketed
 * text), and which definitions are duplicates. Ported from markdownlint's
 * helpers/helpers.cjs `getReferenceLinkImageData` (there, cached per-lint-
 * run by lib/cache.mjs; Recheck's token rules have no shared per-run cache
 * — see no-empty-links.ts's doc comment for the established precedent — so
 * each of MD051/052/053/054 calls this fresh over the same tree).
 *
 * DEVIATION: upstream additionally detects reference syntax that fails to
 * resolve to any definition at all (`undefinedReferenceShortcut/Collapsed/
 * Full`) by monkeypatching micromark's internal `labelEnd` tokenizer
 * (lib/micromark-parse.mjs) to synthesize tokens when label resolution
 * backtracks to failure. Recheck's parser (src/parser/index.ts) is a much
 * thinner micromark wrapper with no equivalent hook, and reproducing that
 * shim correctly is a parser-level change out of scope for a rule port.
 * Without it, an *undefined* reference/shortcut never becomes a `link`/
 * `image`/`gfmFootnoteCall` token in Recheck's tree in the first place —
 * it decomposes into plain `data` tokens — so there is no token for this
 * function to inspect for that case via the token-shape path alone.
 * `scanUndefinedReferences` below is a conservative, best-effort text-scan
 * fallback (restricted to direct `data`/`lineEnding` children of a single
 * container, requiring non-nested single-bracket-depth text with no `]`
 * inside — mirroring the upstream shim's own `!text.includes("]")` guard)
 * so MD052 (whose entire purpose is detecting undefined references) is not
 * a permanent no-op; it is not a byte-for-byte port of the shim and may
 * miss or mis-slice pathological/multi-line cases the real shim handles
 * via micromark's own backtracking state. MD053's `duplicateDefinitions`/
 * `definitions` and MD054's `definitions` lookups don't depend on this
 * fallback at all (they only need successfully-resolved usages), so this
 * deviation is fully scoped to MD052.
 */
export function getReferenceLinkImageData(tree: TokenTree): GetReferenceLinkImageDataResult {
  const references = new Map<string, ReferenceDatum[]>();
  const shortcuts = new Map<string, ReferenceDatum[]>();
  const definitions = new Map<string, [number, string]>();
  const duplicateDefinitions: [string, number][] = [];

  const addReferenceToDictionary = (token: Token, label: string, isShortcut: boolean): void => {
    const datum: ReferenceDatum = [token.startLine - 1, token.startColumn - 1, token.text.length];
    const dictionary = isShortcut ? shortcuts : references;
    const reference = normalizeReference(label);
    const existing = dictionary.get(reference) ?? [];
    existing.push(datum);
    dictionary.set(reference, existing);
  };

  // Matches upstream's own token text, filtering out blockQuotePrefix
  // children (a label can span blockquote-prefixed lines).
  const getText = (token: Token | undefined): string =>
    token?.children
      .filter((c) => c.type !== 'blockQuotePrefix')
      .map((c) => c.text)
      .join('') ?? '';

  for (const token of tree.flat) {
    switch (token.type) {
      case 'definitionLabelString':
      case 'gfmFootnoteDefinitionLabelString': {
        const labelPrefix = token.type === 'gfmFootnoteDefinitionLabelString' ? '^' : '';
        const reference = normalizeReference(`${labelPrefix}${token.text}`);
        if (definitions.has(reference)) {
          duplicateDefinitions.push([reference, token.startLine - 1]);
        } else {
          const parent = getParentOfType(token, ['definition', 'gfmFootnoteDefinition']);
          const destinationStringRaw = parent
            ? getDescendantsByType(parent, [
                'definitionDestination',
                'definitionDestinationRaw',
                'definitionDestinationString',
              ])[0]
            : undefined;
          const destinationStringLiteral = parent
            ? getDescendantsByType(parent, [
                'definitionDestination',
                'definitionDestinationLiteral',
                'definitionDestinationString',
              ])[0]
            : undefined;
          definitions.set(reference, [
            token.startLine - 1,
            (destinationStringRaw ?? destinationStringLiteral)?.text ?? '',
          ]);
        }
        break;
      }
      case 'gfmFootnoteCall':
      case 'image':
      case 'link': {
        const isShortcut = token.children.length === 1;
        const isFullOrCollapsed =
          token.children.length === 2 && !token.children.some((t) => t.type === 'resource');
        const labelText = getDescendantsByType(token, ['label', 'labelText'])[0];
        const referenceString = getDescendantsByType(token, ['reference', 'referenceString'])[0];
        let label = getText(labelText);
        let shortcut = isShortcut;
        if (!isShortcut && !isFullOrCollapsed) {
          const footnoteCallMarker = token.children.find((t) => t.type === 'gfmFootnoteCallMarker');
          const footnoteCallString = token.children.find((t) => t.type === 'gfmFootnoteCallString');
          if (footnoteCallMarker && footnoteCallString) {
            label = `${footnoteCallMarker.text}${footnoteCallString.text}`;
            shortcut = true;
          }
        }
        if (shortcut || isFullOrCollapsed) {
          addReferenceToDictionary(token, getText(referenceString) || label, shortcut);
        }
        break;
      }
      default:
        break;
    }
  }

  scanUndefinedReferences(tree, addReferenceToDictionary);

  return { references, shortcuts, definitions, duplicateDefinitions };
}

export interface ImageDestination {
  /** The `image` token itself — use its position/text for reporting. */
  token: Token;
  /**
   * The image's destination exactly as written in the source: either the
   * inline `(path "title")` destination (raw or angle-bracket literal), or
   * the resolved reference/collapsed/shortcut definition's destination.
   */
  destination: string;
}

/**
 * Resolves every `image` token in the tree to its destination path/URL —
 * both inline syntax (`![alt](path "title")`, including angle-bracket
 * literal destinations) and reference syntax (`![alt][ref]`, `![alt][]`,
 * `![alt]`), the latter resolved through `getReferenceLinkImageData`'s
 * `definitions` map the same way `link-image-style.ts` (MD054) resolves a
 * reference link/image's destination for its autolink-eligibility check.
 * An image whose reference never resolves to a definition never becomes an
 * `image` token in the first place (see `getReferenceLinkImageData`'s
 * DEVIATION note above) — there's no token to report for those here,
 * matching every other AST-based rule's treatment of the same tree.
 *
 * Shared by `rules/scope/max-image-size.ts` (the rule that flags oversized
 * images) and `core/files.ts`'s `extractImageReferences` (the on-disk
 * metadata loader): a single extraction pass so both sides always agree on
 * exactly which destination string keys a given image's on-disk stats in
 * `ScopeRuleContext.fileMetadata.images`.
 */
export function getImageDestinations(tree: TokenTree): ImageDestination[] {
  const { definitions } = getReferenceLinkImageData(tree);
  const results: ImageDestination[] = [];
  for (const image of filterByTypes(tree, ['image'])) {
    const inlineDestination = getDescendantsByType(image, [
      'resource',
      'resourceDestination',
      ['resourceDestinationLiteral', 'resourceDestinationRaw'],
      'resourceDestinationString',
    ])[0]?.text;
    let destination: string | undefined = inlineDestination;
    if (destination === undefined) {
      const label = getDescendantsByType(image, ['label', 'labelText'])[0]?.text ?? '';
      const referenceString = getDescendantsByType(image, ['reference', 'referenceString'])[0]
        ?.text;
      destination = definitions.get(normalizeReference(referenceString || label))?.[1];
    }
    if (destination) {
      results.push({ token: image, destination });
    }
  }
  return results;
}

const undefinedReferenceTextChildTypes = new Set(['data', 'lineEnding']);

// Matches a single bracket-depth-1 span with no embedded `]`, optionally
// immediately followed by a second such span (the "full"/"collapsed"
// reference's own label) -- e.g. `[text][label]`, `[label][]`, `[label]`.
// Mirrors upstream's shim constraints (`!text.includes("]")`,
// adjacency-only pairing) closely enough for ordinary single-line prose.
const undefinedReferenceRe = /\[([^[\]]*)\](?:\[([^[\]]*)\])?/g;

/**
 * Best-effort fallback (see `getReferenceLinkImageData`'s DEVIATION note)
 * for finding bracket-delimited text that *looks like* a reference or
 * shortcut link/image but didn't resolve to a real `link`/`image`/
 * `gfmFootnoteCall` token (no matching definition, or no definition at
 * all) -- so there is no such token in Recheck's tree to inspect directly.
 * Reconstructs each inline container's (paragraph, heading text, table
 * cell, etc.) *plain-text* content by concatenating runs of its direct
 * `data`/`lineEnding` children, breaking a run whenever a non-text child
 * (a real `link`/`image`/`gfmFootnoteCall`, a code span, emphasis, an
 * escape, etc.) is encountered -- so a real link/image token no longer
 * hides the plain text around it (see FINDING 2 below), but text is never
 * bridged *across* one of those tokens either, since that would splice
 * unrelated brackets together. Each run is regex-scanned independently,
 * mapping match offsets back to line/column via each source token's own
 * span. This intentionally never looks *inside* a non-text child itself --
 * exactly the cases upstream's own `!text.includes("]")` / bracket-depth-1
 * guards are built to approximate -- so escaped brackets, code-span
 * brackets, and brackets inside a resolved link's title are never
 * revisited here (they already live inside a different token type
 * entirely, see helpers.ts's `getReferenceLinkImageData` module doc for
 * confirmed parser shapes).
 *
 * FINDING 1: a candidate label that trims to empty (e.g. the `" "` between
 * a task-list checkbox's brackets, `[ ]`) is never a real reference or
 * shortcut -- mirrors upstream's own `labelEnd` tokenizer shim, which only
 * synthesizes an `undefinedReference*` token when
 * `text.trim().length > 0` (see markdownlint's lib/micromark-parse.mjs).
 * Skipping these also means `reference-links-images`' `ignoredLabels`
 * flow is unaffected: an empty label is discarded before it ever reaches
 * `addReferenceToDictionary`, so it can never collide with (or need) an
 * ignored-label entry.
 *
 * FINDING 2: previously this function required a container's *entire*
 * child list to be `data`/`lineEnding` before scanning it at all, so a
 * paragraph mixing plain bracket text with so much as one real link (e.g.
 * `[undef] and [real](url)`) was skipped in full -- silently dropping the
 * plain-text `[undef]` alongside it. Segmenting into runs (rather than
 * requiring whole-container purity) fixes this while still never reading
 * through a real inline token.
 */
function scanUndefinedReferences(
  tree: TokenTree,
  addReferenceToDictionary: (token: Token, label: string, isShortcut: boolean) => void
): void {
  const containers = filterByPredicate(tree, (token) =>
    token.children.some((child) => undefinedReferenceTextChildTypes.has(child.type))
  );
  for (const container of containers) {
    // Split the container's children into runs of contiguous `data`/
    // `lineEnding` children, broken by any other (non-text) child -- each
    // run is scanned independently so text never bridges across a real
    // link/image/code-span/etc. token.
    let run: Token[] = [];
    const runs: Token[][] = [];
    for (const child of container.children) {
      if (undefinedReferenceTextChildTypes.has(child.type)) {
        run.push(child);
      } else if (run.length > 0) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length > 0) runs.push(run);

    for (const textRun of runs) {
      // Build the run's full text plus a per-character line/column map (a
      // `lineEnding` child contributes a single `\n` to the text so
      // offsets stay aligned).
      const positions: { line: number; column: number }[] = [];
      let text = '';
      for (const child of textRun) {
        if (child.type === 'lineEnding') {
          positions.push({ line: child.startLine, column: child.startColumn });
          text += '\n';
          continue;
        }
        for (let i = 0; i < child.text.length; i++) {
          positions.push({ line: child.startLine, column: child.startColumn + i });
        }
        text += child.text;
      }

      undefinedReferenceRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = undefinedReferenceRe.exec(text)) !== null) {
        const [full, firstText, secondText] = match;
        const { line, column } = positions[match.index];
        const spanToken: Token = {
          type: 'synthetic-reference-span',
          startLine: line,
          startColumn: column,
          endLine: line,
          endColumn: column + full.length,
          text: full,
          children: [],
          parent: null,
        };
        if (secondText === undefined) {
          // Shortcut: [label]
          if (firstText.trim().length > 0) {
            addReferenceToDictionary(spanToken, firstText.trim(), true);
          }
        } else if (secondText.length === 0) {
          // Collapsed: [label][]
          if (firstText.trim().length > 0) {
            addReferenceToDictionary(spanToken, firstText.trim(), false);
          }
        } else {
          // Full: [text][label]
          if (secondText.trim().length > 0) {
            addReferenceToDictionary(spanToken, secondText.trim(), false);
          }
        }
      }
    }
  }
}
