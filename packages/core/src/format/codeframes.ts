import * as yamlAst from 'yaml-ast-parser';

import { colorize, colorOptions } from '../logger.js';
import { parsePointer } from '../ref-utils.js';
import type { Source } from '../resolve.js';
import type { LineColLocationObject, Loc, LocationObject } from '../walk.js';

type YAMLMapping = yamlAst.YAMLMapping & { kind: yamlAst.Kind.MAPPING };
type YAMLMap = yamlAst.YamlMap & { kind: yamlAst.Kind.MAP };
type YAMLAnchorReference = yamlAst.YAMLAnchorReference & { kind: yamlAst.Kind.ANCHOR_REF };
type YAMLSequence = yamlAst.YAMLSequence & { kind: yamlAst.Kind.SEQ };
type YAMLScalar = yamlAst.YAMLScalar & { kind: yamlAst.Kind.SCALAR };
type YAMLNode = YAMLMapping | YAMLMap | YAMLAnchorReference | YAMLSequence | YAMLScalar;

const MAX_LINE_LENGTH = 150;
const MAX_CODEFRAME_LINES = 3;

export function getCodeframe(location: LineColLocationObject, color: boolean) {
  colorOptions.enabled = color;
  const { start, end = { line: start.line, col: start.col + 1 }, source } = location;
  const lines = source.getLines();
  const startLineNum = start.line;
  const endLineNum = Math.max(Math.min(end.line, lines.length), start.line);
  let skipLines = Math.max(endLineNum - startLineNum - MAX_CODEFRAME_LINES + 1, 0);
  if (skipLines < 2) skipLines = 0; // do not skip one line

  // Lines specified like this: ["prefix", "string"],
  const prefixedLines: [string, string][] = [];

  let currentPad = 0;

  for (let i = startLineNum; i <= endLineNum; i++) {
    if (skipLines > 0 && i >= endLineNum - skipLines) break;
    const line = lines[i - 1] || '';
    if (line !== '') currentPad = padSize(line);
    const startIdx = i === startLineNum ? start.col - 1 : currentPad;
    const endIdx = i === endLineNum ? end.col - 1 : line.length;

    prefixedLines.push([`${i}`, markLine(line, startIdx, endIdx, colorize.red)]);
    if (!color) prefixedLines.push(['', underlineLine(line, startIdx, endIdx)]);
  }

  if (skipLines > 0) {
    prefixedLines.push([
      `…`,
      `${whitespace(currentPad)}${colorize.gray(`< ${skipLines} more lines >`)}`,
    ]);
    // print last line
    prefixedLines.push([
      `${endLineNum}`,
      markLine(lines[endLineNum - 1], -1, end.col - 1, colorize.red),
    ]);

    if (!color) prefixedLines.push(['', underlineLine(lines[endLineNum - 1], -1, end.col - 1)]);
  }

  return printPrefixedLines([
    [`${startLineNum - 2}`, markLine(lines[startLineNum - 1 - 2])],
    [`${startLineNum - 1}`, markLine(lines[startLineNum - 1 - 1])],
    ...prefixedLines,
    [`${endLineNum + 1}`, markLine(lines[endLineNum - 1 + 1])],
    [`${endLineNum + 2}`, markLine(lines[endLineNum - 1 + 2])],
  ]);

  function markLine(
    line: string,
    startIdx: number = -1,
    endIdx: number = +Infinity,
    variant = colorize.gray
  ) {
    if (!color) return line;
    if (!line) return line;

    if (startIdx === -1) {
      startIdx = padSize(line);
    }

    endIdx = Math.min(endIdx, line.length);
    return (
      line.substr(0, startIdx) + variant(line.substring(startIdx, endIdx)) + line.substr(endIdx)
    );
  }
}

function printPrefixedLines(lines: [string, string][]): string {
  const existingLines = lines.filter(([_, line]) => line !== undefined);

  const padLen = Math.max(...existingLines.map(([prefix]) => prefix.length));
  const dedentLen = Math.min(
    ...existingLines.map(([_, line]) => (line === '' ? Infinity : padSize(line)))
  );

  return existingLines
    .map(
      ([prefix, line]) =>
        colorize.gray(leftPad(padLen, prefix) + ' |') +
        (line ? ' ' + limitLineLength(line.substring(dedentLen)) : '')
    )
    .join('\n');
}

function limitLineLength(line: string, maxLen: number = MAX_LINE_LENGTH) {
  const overflowLen = line.length - maxLen;
  if (overflowLen > 0) {
    const charsMoreText = colorize.gray(`...<${overflowLen} chars>`);
    return line.substring(0, maxLen - charsMoreText.length) + charsMoreText;
  } else {
    return line;
  }
}

function underlineLine(line: string, startIdx: number = -1, endIdx: number = +Infinity) {
  if (startIdx === -1) {
    startIdx = padSize(line);
  }

  endIdx = Math.min(endIdx, line.length);
  return whitespace(startIdx) + '^'.repeat(Math.max(endIdx - startIdx, 1));
}

function whitespace(len: number): string {
  return ' '.repeat(len);
}

function leftPad(len: number, str: string): string {
  return whitespace(len - str.length) + str;
}

function padSize(line: string): number {
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== ' ') return i;
  }
  return line.length;
}

export function getLineColLocation(location: LocationObject): LineColLocationObject {
  if (location.pointer === undefined) return location;

  const { source, pointer, reportOnKey } = location;
  const ast = source.getAst(yamlAst.safeLoad) as YAMLNode;
  const astNode = getAstNodeByPointer(ast, pointer, !!reportOnKey);
  return {
    ...location,
    pointer: undefined,
    ...positionsToLoc(source, astNode?.startPosition ?? 1, astNode?.endPosition ?? 1),
  };
}

/**
 * Converts a `[startPos, endPos)` character-offset span into 1-based `{ start, end }` line/col
 * locations, via binary search over the source's cached line-offset table instead of rescanning
 * `body` from the start on every call.
 *
 * `end` is intentionally derived from `endPos - 1` rather than `endPos` directly: it mirrors the
 * historical behavior of always landing one column past wherever `endPos - 1` falls, even when
 * that position is itself a newline (it does not roll `end` over onto the next line in that case).
 */
function positionsToLoc(
  source: Source,
  startPos: number,
  endPos: number
): { start: Loc; end: Loc } {
  // A zero-length span always resolves to the first line: preserves the original scanning
  // loop's behavior, which never actually reaches the index it would need to capture `start`
  // in this case and so falls through to its `{ line: 1, col: 1 }` default.
  if (startPos === endPos) {
    return { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } };
  }

  const lineOffsets = source.getLineOffsets();
  const start = offsetToLoc(lineOffsets, startPos);
  const endStart = offsetToLoc(lineOffsets, endPos - 1);
  return { start, end: { line: endStart.line, col: endStart.col + 1 } };
}

/** Binary-searches `lineOffsets` for the line containing `offset` and its 1-based column. */
function offsetToLoc(lineOffsets: number[], offset: number): Loc {
  let low = 0;
  let high = lineOffsets.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (lineOffsets[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return { line: low + 1, col: offset - lineOffsets[low] + 1 };
}

export function getAstNodeByPointer(root: YAMLNode, pointer: string, reportOnKey: boolean) {
  const pointerSegments = parsePointer(pointer.substr(2));

  if (root === undefined) {
    return undefined;
  }

  let currentNode = root;
  for (const key of pointerSegments) {
    if (currentNode.kind === yamlAst.Kind.MAP) {
      const mapping = currentNode.mappings.find((m) => m.key.value === key);
      if (!mapping) break;
      currentNode = mapping as YAMLNode;
      if (!mapping?.value) break; // If node has value - return value, if not - return node itself
      currentNode = mapping.value as YAMLNode;
    } else if (currentNode.kind === yamlAst.Kind.SEQ) {
      const elem = currentNode.items[parseInt(key, 10)] as YAMLNode;
      if (!elem) break;
      currentNode = elem as YAMLNode;
    }
  }

  if (!reportOnKey) {
    return currentNode;
  } else {
    const parent = currentNode.parent as YAMLNode;
    if (!parent) return currentNode;
    if (parent.kind === yamlAst.Kind.SEQ) {
      return currentNode;
    } else if (parent.kind === yamlAst.Kind.MAPPING) {
      return parent.key;
    } else {
      return currentNode;
    }
  }
}
