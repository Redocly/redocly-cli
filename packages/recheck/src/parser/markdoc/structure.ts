// The micromark extension in `syntax.ts` only finds where a `{% ... %}` span starts
// and ends. This pass parses each span's text and adds child tokens to the tree
// (markers, tag name, attributes, shortcuts) with positions in the whole document.
import { offsetToLineColumn } from '../../core/line-endings.js';
import type { Token, TokenTree } from '../types.js';
import { parseMarkdocSpan, type MarkdocAttribute } from './span.js';

/**
 * Converts a 0-based offset into `tagToken.text` to a line and column in the
 * document. Only the first line of the span starts at `startColumn`; later lines
 * start at column 1.
 */
export function offsetToPosition(
  tagToken: Token,
  offset: number
): { line: number; column: number } {
  const { line, column } = offsetToLineColumn(tagToken.text, offset);
  return {
    line: tagToken.startLine + (line - 1),
    column: line === 1 ? tagToken.startColumn + (column - 1) : column,
  };
}

/**
 * Builds a child token for `[start, end)` of `tagToken`'s text. Offsets are always
 * relative to the tag, even when `parent` is the attribute token.
 */
function synthesize(
  tagToken: Token,
  type: string,
  start: number,
  end: number,
  parent: Token = tagToken
): Token {
  const startPos = offsetToPosition(tagToken, start);
  const endPos = offsetToPosition(tagToken, end);
  return {
    type,
    startLine: startPos.line,
    startColumn: startPos.column,
    endLine: endPos.line,
    endColumn: endPos.column,
    text: tagToken.text.slice(start, end),
    children: [],
    parent,
  };
}

/**
 * Finds the end of the opening marker (`{%` or `{%-`) and the start of the closing
 * marker (`%}` or `-%}`). The tokenizer only produces spans that start with `{%`
 * and end with `%}`. Keep in sync with how `parseMarkdocSpan` strips the `-`.
 */
function markerBounds(text: string): { openEnd: number; closeStart: number } {
  let openEnd = 2; // past the leading '{%'
  let closeStart = text.length - 2; // start of the trailing '%}'
  if (text[openEnd] === '-') openEnd++;
  if (closeStart - 1 >= openEnd && text[closeStart - 1] === '-') closeStart--;
  return { openEnd, closeStart };
}

/** A child token without nested tokens, given by offsets into the span. */
interface SimpleChild {
  kind: 'simple';
  type: string;
  start: number;
  end: number;
}

interface AttributeChild {
  kind: 'attribute';
  attribute: MarkdocAttribute;
}

type PendingChild = SimpleChild | AttributeChild;

function startOf(item: PendingChild): number {
  return item.kind === 'simple' ? item.start : item.attribute.nameStart;
}

/**
 * Parses the text of every `markdocTag` token and adds its children (markers, tag
 * name, primary value, attributes, shortcuts) under the tag in source order. The
 * new tokens are also appended to `tree.flat`.
 */
export function structureMarkdocTags(tree: TokenTree): void {
  const appended: Token[] = [];

  for (const token of tree.flat) {
    if (token.type !== 'markdocTag') continue;

    const parsed = parseMarkdocSpan(token.text);
    token.markdocKind = parsed.kind;

    const { openEnd, closeStart } = markerBounds(token.text);
    const pending: PendingChild[] = [
      { kind: 'simple', type: 'markdocTagMarker', start: 0, end: openEnd },
      { kind: 'simple', type: 'markdocTagMarker', start: closeStart, end: token.text.length },
    ];

    // Annotations, variables, functions and malformed spans have no tag name.
    if (parsed.name !== null) {
      pending.push({
        kind: 'simple',
        type: 'markdocTagName',
        start: parsed.nameStart,
        end: parsed.nameEnd,
      });
    }

    if (parsed.primary) {
      pending.push({
        kind: 'simple',
        type: 'markdocTagPrimary',
        start: parsed.primary.valueStart,
        end: parsed.primary.valueEnd,
      });
    }

    for (const attribute of parsed.attributes) {
      pending.push({ kind: 'attribute', attribute });
    }

    // Only opening and self-closing tags with a name have shortcuts.
    for (const shortcut of parsed.shortcuts ?? []) {
      pending.push({
        kind: 'simple',
        type: 'markdocShortcut',
        start: shortcut.start,
        end: shortcut.end,
      });
    }

    // The pieces never overlap, so sorting by start offset gives source order.
    pending.sort((a, b) => startOf(a) - startOf(b));

    for (const item of pending) {
      if (item.kind === 'simple') {
        const child = synthesize(token, item.type, item.start, item.end);
        token.children.push(child);
        appended.push(child);
        continue;
      }

      const { attribute } = item;
      const attributeToken = synthesize(
        token,
        'markdocAttribute',
        attribute.nameStart,
        attribute.valueEnd
      );
      const nameToken = synthesize(
        token,
        'markdocAttributeName',
        attribute.nameStart,
        attribute.nameEnd,
        attributeToken
      );
      const valueToken = synthesize(
        token,
        'markdocAttributeValue',
        attribute.valueStart,
        attribute.valueEnd,
        attributeToken
      );
      attributeToken.children.push(nameToken, valueToken);
      token.children.push(attributeToken);
      appended.push(attributeToken, nameToken, valueToken);
    }
  }

  // Not `push(...appended)`: it throws a RangeError when there are too many items.
  for (const token of appended) tree.flat.push(token);
}
