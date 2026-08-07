// Plain data → TypeScript expression text. Single-line (`{ a: 1, b: [2, 3] }`);
// keys stay bare when they pass the identifier GRAMMAR (reserved words are legal
// object-literal keys), quoted otherwise.

import { isIdentifier } from './identifier.js';

const UNSAFE_STRING_CHARS = /[<>\/\\\b\f\n\r\t\0\u2028\u2029]/g;
const UNSAFE_STRING_CHAR_MAP: Record<string, string> = {
  '<': '\\u003C',
  '>': '\\u003E',
  '/': '\\u002F',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\0': '\\0',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export function sanitizeCodeString(value: string): string {
  return JSON.stringify(value).replace(UNSAFE_STRING_CHARS, (char) => UNSAFE_STRING_CHAR_MAP[char] ?? char);
}

/** A JSON-ish value as TypeScript source text. */
export function codeLiteral(value: unknown): string {
  if (typeof value === 'string') return sanitizeCodeString(value);
  if (typeof value === 'boolean' || value === null) return String(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(codeLiteral).join(', ')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entryValue]) =>
      `${isIdentifier(key) ? key : sanitizeCodeString(key)}: ${codeLiteral(entryValue)}`
  );
  return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
}
