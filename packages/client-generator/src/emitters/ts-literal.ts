// Plain data → TypeScript expression text: the template-based replacement for
// `literalExpression` + the printer. Single-line, printer-matching formatting
// (`{ a: 1, b: [2, 3] }`); keys stay bare when they pass the identifier GRAMMAR
// (reserved words are legal object-literal keys), quoted otherwise.

import { isIdentifier } from './identifier.js';

/** A JSON-ish value as TypeScript source text. */
export function codeLiteral(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean' || value === null) return String(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(codeLiteral).join(', ')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entryValue]) =>
      `${isIdentifier(key) ? key : JSON.stringify(key)}: ${codeLiteral(entryValue)}`
  );
  return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
}
