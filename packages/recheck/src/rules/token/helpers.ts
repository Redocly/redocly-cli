// Ported from markdownlint's helpers/micromark-helpers.cjs and helpers/helpers.cjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import { newLineRe } from '../../core/line-endings.js';
import { filterByTypes } from '../../parser/index.js';
import type { Token, TokenTree } from '../../parser/types.js';

/** Adds the numbers from `start` to `end` (both included) to a set. */
export function addRangeToSet(set: Set<number>, start: number, end: number): void {
  for (let i = start; i <= end; i++) {
    set.add(i);
  }
}

/** A line/column range in a file (1-based, both ends included). A `Token` can be used as one. */
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

/** Returns whether two ranges (or tokens) overlap. */
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
 * Returns the tokens that match `predicate`, searching depth first. It accepts a
 * token tree or an array of tokens. `transformChildren` can change which children
 * are searched for a token, for example to skip nested lists.
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
 * Gets nested descendants by type path. Each path item matches one level and can
 * be one type or an array of alternative types.
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

/** Gets the nearest parent with one of the given types. */
export function getParentOfType(token: Token, types: readonly string[]): Token | null {
  let current: Token | null = token;
  while ((current = current.parent) && !types.includes(current.type)) {
    // Empty
  }
  return current;
}

/** Gets the level (1-6) of an atx or setext heading. */
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

/** Returns 'setext', 'atx', or 'atx_closed' (an atx heading with closing `#` marks). */
export function getHeadingStyle(heading: Token): 'setext' | 'atx' | 'atx_closed' {
  if (heading.type === 'setextHeading') {
    return 'setext';
  }
  const atxHeadingSequenceLength = heading.children.filter(
    (child) => child.type === 'atxHeadingSequence'
  ).length;
  return atxHeadingSequenceLength === 1 ? 'atx' : 'atx_closed';
}

/** Gets the heading text, with newlines (setext headings can span lines) turned into spaces. */
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

/** Gets the blockquote prefix of a line, e.g. `"> "`, repeated `count` times on separate lines. */
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

/** True if the line is empty or only has whitespace, `>` marks or HTML comments. */
export function isBlankLine(line: string): boolean {
  const startComment = '<!--';
  const endComment = '-->';
  const removeComments = (s: string): string => {
    for (;;) {
      const start = s.indexOf(startComment);
      const end = s.indexOf(endComment);
      if (end !== -1 && (start === -1 || end < start)) {
        // Unmatched end comment first
        s = s.slice(end + endComment.length);
      } else if (start !== -1 && end !== -1) {
        // Start comment before end comment
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

/** Token types that are not document content (indentation, blank lines, container prefixes). */
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
 * Returns the last line (1-based) of the YAML front matter, or 0 if there is none.
 * The parser keeps front matter in the tree, so rules that scan from the top must skip it.
 */
export function getFrontmatterEndLine(tree: TokenTree): number {
  const frontmatter = tree.flat.find((token) => token.type === 'yaml');
  return frontmatter?.endLine ?? 0;
}

/**
 * True if one line of the front matter matches `pattern` (the `frontMatterTitle` option).
 * A front matter title counts as the h1 for `heading-increment`, `single-h1` and
 * `first-line-h1`. An empty or missing pattern turns this off. The pattern is
 * tested on each line separately, so it cannot match across lines.
 */
export function frontMatterHasTitle(tree: TokenTree, pattern: unknown): boolean {
  const frontMatterTitle = String(pattern ?? '');
  if (!frontMatterTitle) return false;
  const frontmatter = tree.flat.find((token) => token.type === 'yaml');
  if (frontmatter === undefined) return false;
  const frontMatterTitleRe = new RegExp(frontMatterTitle, 'i');
  return frontmatter.text.split(newLineRe).some((line) => frontMatterTitleRe.test(line));
}

/** True for a valid CommonMark HTML comment token (`<!-- ... -->`). */
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
 * Replaces the text inside HTML comments with `.`, keeping all positions. Rules
 * that scan lines then ignore comment content. The token tree is not cleared.
 */
export function clearHtmlCommentText(text: string): string {
  let i = 0;
  while ((i = text.indexOf(htmlCommentBegin, i)) !== -1) {
    const j = text.indexOf(htmlCommentEnd, i + 2);
    if (j === -1) {
      // An unterminated comment is plain text.
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

// An HTML entity at the end of a line.
export const endOfLineHtmlEntityRe =
  /&(?:#\d+|#[xX][\da-fA-F]+|[a-zA-Z]{2,31}|blk\d{2}|emsp1[34]|frac\d{2}|sup\d|there4);$/;

// A GitHub emoji code at the end of a line.
export const endOfLineGemojiCodeRe =
  /:(?:[abmovx]|[-+]1|100|1234|(?:1st|2nd|3rd)_place_medal|8ball|clock\d{1,4}|e-mail|non-potable_water|o2|t-rex|u5272|u5408|u55b6|u6307|u6708|u6709|u6e80|u7121|u7533|u7981|u7a7a|[a-z]{2,15}2?|[a-z]{1,14}(?:_[a-z\d]{1,16})+):$/;

// Punctuation characters, normal and full-width.
export const allPunctuation = '.,;:!?。，；：！？';

// The same, without the question mark.
export const allPunctuationNoQuestion = allPunctuation.replace(/[?？]/gu, '');

/** Escapes a string for use in a RegExp. */
export function escapeForRegExp(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const loneSurrogateRe = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Replaces unpaired surrogates with U+FFFD, like `String.prototype.toWellFormed()`,
 * which the package's ES2021 target does not have.
 */
export function toWellFormedString(str: string): string {
  return str.replace(loneSurrogateRe, '�');
}

/** Whether an HTML tag is a closing tag, and its name. */
export interface HtmlTagInfo {
  close: boolean;
  name: string;
}

const htmlTagNameRe = /^<([^!>][^/\s>]*)/;

/** Gets the tag info of an `htmlText` token, or `null` if it has no tag (e.g. a comment). */
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

/** Builds a RegExp that captures the value of an HTML attribute such as `alt=`. */
export function getHtmlAttributeRe(name: string): RegExp {
  return new RegExp(`\\s${name}\\s*=\\s*['"]?([^'"\\s>]*)`, 'iu');
}

/** Shortens long text for error context, keeping the start, the end, or both. */
export function ellipsify(text: string, start?: boolean, end?: boolean): string {
  if (text.length <= 30) {
    // Short enough
  } else if (start && end) {
    text = text.slice(0, 15) + '...' + text.slice(-15);
  } else if (end) {
    text = '...' + text.slice(-30);
  } else {
    text = text.slice(0, 30) + '...';
  }
  return text;
}

/** True for a DocFX tab heading: an atx heading that is only a link to `#tab/...`. */
export function isDocfxTab(heading: Token | null | undefined): boolean {
  if (heading?.type === 'atxHeading') {
    const headingTexts = getDescendantsByType(heading, ['atxHeadingText']);
    if (
      headingTexts.length === 1 &&
      headingTexts[0].children.length === 1 &&
      headingTexts[0].children[0].type === 'link'
    ) {
      // `resourceDestinationString` is nested several levels below the link, so search all
      // descendants.
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

/** One use of a reference label: `[lineIndex, columnIndex, length]`, all 0-based. */
export type ReferenceDatum = [lineIndex: number, columnIndex: number, length: number];

export interface GetReferenceLinkImageDataResult {
  /** Uses of full and collapsed references (`[text][label]`, `[label][]`), by normalized label. */
  references: Map<string, ReferenceDatum[]>;
  /** Uses of shortcut references (`[label]`) and footnote calls (`[^label]`), by normalized label. */
  shortcuts: Map<string, ReferenceDatum[]>;
  /** `[lineIndex, destination]` of each definition, by normalized label. */
  definitions: Map<string, [number, string]>;
  /** `[label, lineIndex]` for each definition after the first one with that label. */
  duplicateDefinitions: [string, number][];
}

/**
 * Finds reference-style links and images and their definitions in the whole file:
 * which labels are defined, which are used, and which definitions are duplicates.
 *
 * Unlike markdownlint, undefined references are not tokens in our tree, so
 * `scanUndefinedReferences` finds them with a plain text scan. It can miss some
 * multi-line cases. Only `reference-links-images` needs undefined references.
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

  // Join the child text, skipping blockquote prefixes (a label can span quoted lines).
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
  /** The image token, for reporting its position. */
  token: Token;
  /** The destination as written: the inline `(path "title")` one, or the one from the matching definition. */
  destination: string;
}

/**
 * Finds the destination path or URL of every image, for both inline `![alt](path)`
 * and reference `![alt][ref]` syntax. Used by `max-image-size` and when loading
 * image files, so both use the same destination strings.
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

// A `[text]` span with no `]` inside, optionally followed by a second `[...]`.
// Matches `[text][label]`, `[label][]` and `[label]`.
const undefinedReferenceRe = /\[([^[\]]*)\](?:\[([^[\]]*)\])?/g;

/**
 * Finds bracketed text that looks like a reference link or image but has no
 * definition, so it is not a link token. Runs of plain text in each container
 * are scanned separately, so text is never joined across a real link, code span
 * or other token. Empty labels like the `[ ]` of a task list are ignored.
 */
function scanUndefinedReferences(
  tree: TokenTree,
  addReferenceToDictionary: (token: Token, label: string, isShortcut: boolean) => void
): void {
  const containers = filterByPredicate(tree, (token) =>
    token.children.some((child) => undefinedReferenceTextChildTypes.has(child.type))
  );
  for (const container of containers) {
    // Split the children into runs of consecutive text tokens.
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
      // Join the run's text and record the line and column of each character.
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
