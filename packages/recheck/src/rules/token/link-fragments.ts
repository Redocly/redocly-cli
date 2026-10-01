// Ported from markdownlint's lib/md051.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Adds the opt-in `crossFile` option: relative link and image targets must exist on disk,
// and a `file.md#anchor` fragment must exist in the target file.
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import picomatch from 'picomatch';

import { filterByTypes, parseMarkdown } from '../../parser/index.js';
import type { Token, TokenTree } from '../../parser/types.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { TokenRule } from '../types.js';
import {
  clearHtmlCommentText,
  filterByPredicate,
  getHtmlAttributeRe,
  getHtmlTagInfo,
  isDocfxTab,
  toWellFormedString,
} from './helpers.js';

/** Finds descendants of the given types at any depth. */
function descendantsOfType(children: Token[], type: string): Token[] {
  return filterByPredicate(children, (token) => token.type === type);
}

const idRe = getHtmlAttributeRe('id');
const nameRe = getHtmlAttributeRe('name');
const anchorRe = /\{(#[a-z\d]+(?:[-_][a-z\d]+)*)\}/gu;
const lineFragmentRe = /^#(?:L\d+(?:C\d+)?-L\d+(?:C\d+)?|L\d+)$/;

const childrenExclude = new Set(['image', 'reference', 'resource', 'markdocTag']);
const tokensInclude = new Set(['characterEscapeValue', 'codeTextData', 'data', 'mathTextData']);

/** Converts a heading into an HTML fragment the way GitHub does. */
function convertHeadingToHTMLFragment(headingText: Token): string {
  const inlineText = filterByPredicate(
    headingText.children,
    (token) => tokensInclude.has(token.type),
    (token) => (childrenExclude.has(token.type) ? [] : token.children)
  )
    .map((token) => token.text)
    .join('');
  return (
    '#' +
    encodeURIComponent(
      toWellFormedString(
        inlineText
          // Markdoc tags are not rendered, so they are left out of the slug.
          .replace(/\{%-?[\s\S]*?-?%\}/g, '')
          .trim()
          .toLowerCase()
          // RegExp source with Ruby's \p{Word} expanded into its General Categories
          // https://github.com/gjtorikian/html-pipeline/blob/main/lib/html/pipeline/toc_filter.rb
          // https://ruby-doc.org/core-3.0.2/Regexp.html
          .replace(/[^\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation}\- ]/gu, '')
          .replace(/ /gu, '-')
      )
    )
  );
}

/** Unescapes the text of a String-type token (`characterEscapeValue`/`data` descendants only). */
function unescapeStringTokenText(token: Token): string {
  return filterByPredicate(token.children, (child) =>
    ['characterEscapeValue', 'data'].includes(child.type)
  )
    .map((child) => child.text)
    .join('');
}

/** Anchors a document exposes: heading slugs, `{#anchors}`, and HTML id/name anchors. */
// Like the theme, every <details> element gets an id, including `{% accordion %}` tags.
// Without an explicit id, the id comes from the <summary> text: whitespace becomes hyphens,
// text is lowercased, punctuation is kept. A duplicate gets a `-<index>` suffix.
// An accordion whose title is not a string literal takes an index but gives no anchor.
// Matches inside code blocks are skipped.
type DetailsSource = {
  offset: number;
  explicitId?: string;
  summaryText?: string;
  unknowable?: boolean;
};

// Drops `<...>` tags and keeps the text between them.
function stripTags(html: string): string {
  let out = '';
  let index = 0;
  while (index < html.length) {
    const open = html.indexOf('<', index);
    if (open === -1) break;
    const close = html.indexOf('>', open + 1);
    if (close === -1) break;
    if (close === open + 1) {
      out += html.slice(index, close);
      index = close;
      continue;
    }
    out += html.slice(index, open);
    index = close + 1;
  }
  return out + html.slice(index);
}

function collectDetailsAnchors(
  content: string,
  tree: TokenTree,
  fragments: Map<string, number>
): void {
  const codeLines = new Set<number>();
  for (const block of filterByTypes(tree, ['codeFenced', 'codeIndented'])) {
    for (let line = block.startLine; line <= block.endLine; line++) codeLines.add(line);
  }
  const lineStarts = [0];
  for (let offset = 0; offset < content.length; offset++) {
    if (content[offset] === '\n') lineStarts.push(offset + 1);
  }
  const lineOf = (offset: number): number => {
    let line = 0;
    while (line + 1 < lineStarts.length && lineStarts[line + 1] <= offset) line++;
    return line + 1;
  };

  const sources: DetailsSource[] = [];
  const detailsRe = /<details\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = detailsRe.exec(content)) !== null) {
    const explicitId = /\bid\s*=\s*["']([^"']+)["']/i.exec(match[1])?.[1];
    if (explicitId) {
      sources.push({ offset: match.index, explicitId });
      continue;
    }
    const closeIndex = content.indexOf('</details>', match.index);
    const scope = content.slice(match.index, closeIndex === -1 ? undefined : closeIndex);
    const summary = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(scope)?.[1];
    const summaryText = summary === undefined ? undefined : stripTags(summary);
    sources.push({ offset: match.index, summaryText });
  }
  const accordionRe = /\{%\s*accordion(?![\w-])([\s\S]*?)%\}/g;
  while ((match = accordionRe.exec(content)) !== null) {
    const title = /\btitle\s*=\s*"((?:\\.|[^"\\])*)"/.exec(match[1])?.[1];
    sources.push(
      title === undefined
        ? { offset: match.index, unknowable: true }
        : { offset: match.index, summaryText: title.replace(/\\(.)/g, '$1') }
    );
  }
  sources.sort((a, b) => a.offset - b.offset);

  const setAnchor = (id: string) => fragments.set(`#${encodeURIComponent(id)}`, 0);
  const generatedIds = new Set<string>();
  let index = 0;
  for (const source of sources) {
    if (codeLines.has(lineOf(source.offset))) continue;
    if (source.unknowable) {
      index++;
      continue;
    }
    if (source.explicitId) {
      setAnchor(source.explicitId);
      index++;
      continue;
    }
    const generated = source.summaryText
      ? source.summaryText.replace(/\s+/g, '-').toLowerCase()
      : `details-${index}`;
    const id = generatedIds.has(generated) ? `${generated}-${index}` : generated;
    generatedIds.add(id);
    setAnchor(id);
    index++;
  }
}

function collectFragments(tree: TokenTree, content: string): Map<string, number> {
  const fragments = new Map<string, number>([['#top', 0]]);

  for (const headingText of filterByTypes(tree, ['atxHeadingText', 'setextHeadingText'])) {
    const fragment = convertHeadingToHTMLFragment(headingText);
    if (fragment !== '#') {
      const count = fragments.get(fragment) || 0;
      if (count) {
        fragments.set(`${fragment}-${count}`, 0);
      }
      fragments.set(fragment, count + 1);
      anchorRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = anchorRe.exec(headingText.text)) !== null) {
        const anchor = match[1];
        if (!fragments.has(anchor)) {
          fragments.set(anchor, 1);
        }
      }
    }
  }

  // Also match block-level HTML such as `<div id="x">`, not just inline HTML.
  for (const token of filterByTypes(tree, ['htmlText'], true)) {
    const htmlTagInfo = getHtmlTagInfo(token);
    if (htmlTagInfo && !htmlTagInfo.close) {
      const anchorMatch =
        idRe.exec(token.text) ||
        (htmlTagInfo.name.toLowerCase() === 'a' && nameRe.exec(token.text));
      if (anchorMatch && anchorMatch.length > 0) {
        fragments.set(`#${anchorMatch[1]}`, 0);
      }
    }
  }

  collectDetailsAnchors(content, tree, fragments);
  return fragments;
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

type TargetEntry = { mtimeMs: number; exists: boolean; fragments: Map<string, number> | null };
const targetCache = new Map<string, TargetEntry>();

const MISSING: TargetEntry = { mtimeMs: -1, exists: false, fragments: null };

// Anchors of one on-disk file, cached by path and mtime so each file is read once per run.
function resolveTargetFile(absolutePath: string, markdoc: boolean): TargetEntry {
  let stats;
  try {
    stats = statSync(absolutePath);
  } catch {
    return MISSING;
  }
  const cached = targetCache.get(absolutePath);
  if (cached && cached.mtimeMs === stats.mtimeMs) return cached;

  let fragments: Map<string, number> | null = null;
  if (stats.isFile() && ['.md', '.markdown'].includes(extname(absolutePath).toLowerCase())) {
    try {
      const targetContent = readFileSync(absolutePath, 'utf8');
      // A <details> inside an HTML comment never renders, so it gives no anchor.
      fragments = collectFragments(
        parseMarkdown(targetContent, { markdoc }),
        clearHtmlCommentText(targetContent)
      );
    } catch {
      fragments = null;
    }
  }
  const entry: TargetEntry = { mtimeMs: stats.mtimeMs, exists: true, fragments };
  targetCache.set(absolutePath, entry);
  return entry;
}

// Resolves a link target like the Realm router: an extensionless path also tries `<path>.md`,
// and a directory uses its `index.md`.
function resolveTarget(absolutePath: string, markdoc: boolean): TargetEntry {
  let stats;
  try {
    stats = statSync(absolutePath);
  } catch {
    if (extname(absolutePath) === '') {
      const asMarkdown = resolveTargetFile(`${absolutePath}.md`, markdoc);
      if (asMarkdown.exists) return asMarkdown;
      return resolveTargetFile(join(absolutePath, 'index.md'), markdoc);
    }
    return MISSING;
  }
  if (stats.isDirectory()) {
    const viaIndex = resolveTargetFile(join(absolutePath, 'index.md'), markdoc);
    if (viaIndex.exists) return viaIndex;
    const asSibling = resolveTargetFile(`${absolutePath}.md`, markdoc);
    if (asSibling.exists) return asSibling;
    return { mtimeMs: stats.mtimeMs, exists: true, fragments: null };
  }
  return resolveTargetFile(absolutePath, markdoc);
}

// Site root for `/x/y` links: one root, or a map from source-directory prefix to root
// for monorepos. The longest matching prefix wins; files under no prefix are skipped.
function rootDirFor(option: unknown, filePath: string): string {
  if (typeof option === 'string') return option;
  if (!isPlainObject(option)) return '';
  const file = resolve(filePath);
  let best = '';
  let bestLength = -1;
  for (const [prefix, root] of Object.entries(option)) {
    if (typeof root !== 'string') continue;
    const resolvedPrefix = resolve(prefix);
    if (
      (file === resolvedPrefix || file.startsWith(resolvedPrefix + sep)) &&
      resolvedPrefix.length > bestLength
    ) {
      best = root;
      bestLength = resolvedPrefix.length;
    }
  }
  return best;
}

function checkLinkFragments(ctx: Parameters<TokenRule['check']>[0]) {
  const ignoreCase = !!ctx.config.ignoreCase;
  const crossFile = !!ctx.config.crossFile;
  const ignoredPattern = String(ctx.config.ignoredPattern ?? '');
  const ignoredPatternRe = new RegExp(ignoredPattern || '^$');
  const rootDir = rootDirFor(ctx.config.rootDir, ctx.filePath);
  // Destinations to skip: routes generated from data have no file to check.
  const ignoredTargets = Array.isArray(ctx.config.ignoredTargets)
    ? (ctx.config.ignoredTargets as string[])
    : [];
  const fragments = collectFragments(ctx.tree, ctx.lines.join('\n'));
  const baseDir = dirname(ctx.filePath);

  const checkCrossFileDestination = (
    rawDestination: string,
    link: Token,
    allowFragmentCheck: boolean
  ) => {
    if (
      rawDestination === '' ||
      rawDestination.startsWith('#') ||
      rawDestination.startsWith('//') ||
      SCHEME_RE.test(rawDestination)
    ) {
      return;
    }
    const isAbsolute = rawDestination.startsWith('/');
    if (isAbsolute && rootDir === '') return;
    const destinationPath = rawDestination.split('#')[0].split('?')[0];
    // `**` never matches leading ./ or ../, so also test the destination without them.
    const dotless = destinationPath.replace(/^(\.\.\/|\.\/)+/, '');
    if (
      ignoredTargets.length > 0 &&
      ignoredTargets.some(
        (pattern) =>
          picomatch.isMatch(destinationPath, pattern) || picomatch.isMatch(dotless, pattern)
      )
    ) {
      return;
    }
    const hashIndex = rawDestination.indexOf('#');
    const fragment = hashIndex === -1 ? '' : rawDestination.slice(hashIndex);
    let targetPath = hashIndex === -1 ? rawDestination : rawDestination.slice(0, hashIndex);
    targetPath = targetPath.split('?')[0];
    if (isAbsolute) targetPath = targetPath.slice(1);
    if (targetPath === '') return;
    try {
      targetPath = decodeURIComponent(targetPath);
    } catch {
      return;
    }
    const target = resolveTarget(
      resolve(isAbsolute ? resolve(rootDir) : baseDir, targetPath),
      ctx.markdoc !== undefined
    );
    const hasRange = link.startLine === link.endLine;
    const context = hasRange ? link.text : undefined;
    const column = hasRange ? link.startColumn : undefined;
    if (!target.exists) {
      ctx.onError({
        line: link.startLine,
        column,
        detail: `Link target not found: ${targetPath}`,
        context,
      });
      return;
    }
    if (!allowFragmentCheck || fragment.length <= 1 || target.fragments === null) return;
    const encoded = `#${encodeURIComponent(toWellFormedString(fragment.slice(1)))}`;
    if (lineFragmentRe.test(encoded) || ignoredPatternRe.test(fragment.slice(1))) return;
    const found = ignoreCase
      ? [...target.fragments.keys()].some((key) => key.toLowerCase() === encoded.toLowerCase())
      : target.fragments.has(encoded);
    if (!found) {
      ctx.onError({
        line: link.startLine,
        column,
        detail: `Fragment ${fragment} not found in ${targetPath}`,
        context,
      });
    }
  };

  const parentChilds: [string, string][] = [
    ['link', 'resourceDestinationString'],
    ['definition', 'definitionDestinationString'],
  ];
  for (const [parentType, definitionType] of parentChilds) {
    const links = filterByTypes(ctx.tree, [parentType]).filter(
      (link) => !(link.parent?.type === 'atxHeadingText' && isDocfxTab(link.parent.parent))
    );
    for (const link of links) {
      const definitions = descendantsOfType(link.children, definitionType);
      for (const definition of definitions) {
        const { endColumn, startColumn } = definition;
        const text = unescapeStringTokenText(definition);
        if (crossFile && !text.startsWith('#')) {
          checkCrossFileDestination(text, link, true);
          continue;
        }
        const textSliceOne = text.slice(1);
        const encodedText = `#${encodeURIComponent(toWellFormedString(textSliceOne))}`;
        if (
          text.length > 1 &&
          text.startsWith('#') &&
          !fragments.has(encodedText) &&
          !lineFragmentRe.test(encodedText) &&
          !ignoredPatternRe.test(textSliceOne)
        ) {
          const hasRange = link.startLine === link.endLine;
          const context = hasRange ? link.text : undefined;
          const column = hasRange ? link.startColumn : undefined;
          const fixInfo = hasRange
            ? {
                lineNumber: link.startLine,
                editColumn: startColumn,
                deleteCount: endColumn - startColumn,
              }
            : undefined;

          const textLower = text.toLowerCase();
          const mixedCaseKey = [...fragments.keys()].find((key) => textLower === key.toLowerCase());
          if (mixedCaseKey) {
            const finalFixInfo = fixInfo ? { ...fixInfo, insertText: mixedCaseKey } : undefined;
            if (!ignoreCase && mixedCaseKey !== text) {
              ctx.onError({
                line: link.startLine,
                column,
                detail: `Expected: ${mixedCaseKey}; Actual: ${text}`,
                context,
                fixInfo: finalFixInfo,
              });
            }
          } else {
            ctx.onError({
              line: link.startLine,
              column,
              context,
            });
          }
        }
      }
    }
  }

  if (crossFile) {
    for (const image of filterByTypes(ctx.tree, ['image'])) {
      for (const definition of descendantsOfType(image.children, 'resourceDestinationString')) {
        const text = unescapeStringTokenText(definition);
        if (!text.startsWith('#')) checkCrossFileDestination(text, image, false);
      }
    }
  }
}

export const linkFragments: TokenRule = {
  name: 'link-fragments',
  tags: ['links'],
  fixable: true,
  defaults: {
    message: 'Link fragments should be valid',
    ignoreCase: false,
    ignoredPattern: '',
    crossFile: false,
    rootDir: '',
    ignoredTargets: [],
  },
  check(ctx) {
    checkLinkFragments(ctx);
  },
};
