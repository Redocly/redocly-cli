// Plain data → TypeScript expression text. Single-line (`{ a: 1, b: [2, 3] }`);
// keys stay bare when they pass the identifier GRAMMAR (reserved words are legal
// object-literal keys), quoted otherwise.

import { codeString, isIdentifier } from './identifier.js';

/** The one string-literal policy, under this module's historical name. */
export const sanitizeCodeString = codeString;

/** A JSON-ish value as TypeScript source text. */
export function codeLiteral(value: unknown): string {
  if (typeof value === 'string') return codeString(value);
  if (typeof value === 'boolean' || value === null) return String(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(codeLiteral).join(', ')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entryValue]) =>
      `${isIdentifier(key) ? key : codeString(key)}: ${codeLiteral(entryValue)}`
  );
  return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
}
