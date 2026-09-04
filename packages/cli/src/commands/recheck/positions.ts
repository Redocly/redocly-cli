import { getLineColLocation, type Source } from '@redocly/openapi-core';

export type Position = { line: number; column: number };
export type PositionMapper = (line: number, column: number) => Position;

const BLOCK_HEADER = /^[|>](?:([1-9])[+-]?|[+-]([1-9])?)?/;

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

// Turns a line and column inside a description's string value into the
// position in the source file (Decision D of Redocly/redocly#26970).
export function createPositionMapper(source: Source, pointer: string): PositionMapper {
  const { start, end = { line: start.line, col: start.col + 1 } } = getLineColLocation({
    source,
    pointer,
    reportOnKey: false,
  });
  const lines = source.getLines();
  const headLine = lines[start.line - 1] ?? '';
  const head = headLine.slice(start.col - 1);
  const style = head[0];

  if (style === '|' || style === '>') {
    const header = BLOCK_HEADER.exec(head);
    const explicit = header?.[1] ?? header?.[2];
    const firstContent = lines.slice(start.line).find((line) => line.trim().length > 0) ?? '';
    const indent = explicit
      ? leadingSpaces(headLine) + Number(explicit)
      : leadingSpaces(firstContent);
    if (style === '>') return () => ({ line: start.line + 1, column: indent + 1 });
    return (line, column) => ({ line: start.line + line, column: indent + column });
  }

  const quoted = style === '"' || style === "'";
  const valueColumn = quoted ? start.col + 1 : start.col;
  const raw = lines
    .slice(start.line - 1, end.line)
    .map((line, index, valueLines) => {
      const from = index === 0 ? start.col - 1 : 0;
      const to = index === valueLines.length - 1 ? end.col - 1 : line.length;
      return line.slice(from, to);
    })
    .join('\n');
  const escaped =
    (style === '"' && raw.includes('\\')) || (style === "'" && raw.slice(1, -1).includes("''"));
  if (end.line > start.line || escaped) return () => ({ line: start.line, column: valueColumn });
  return (_line, column) => ({ line: start.line, column: valueColumn + column - 1 });
}
