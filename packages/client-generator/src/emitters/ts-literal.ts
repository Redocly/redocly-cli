// Plain data → TypeScript expression text. Single-line (`{ a: 1, b: [2, 3] }`);
// keys stay bare when they pass the identifier GRAMMAR (reserved words are legal
// object-literal keys), quoted otherwise.

import { isIdentifier } from './identifier.js';

// `JSON.stringify` already produces a valid TypeScript string literal: it escapes quotes,
// backslashes, and every control character. What it leaves literal is what can still break
// out of a CODE context — `<` and `>` (a `</script>` sequence when the output is embedded
// in an inline script) and U+2028/U+2029, which are line terminators in JS source but not
// in JSON. Only those are escaped here, and only on the stringified text, which contains
// no raw backslashes to double.
const CODE_UNSAFE: Record<string, string> = {
  '<': '\\u003C',
  '>': '\\u003E',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/** A string as a TypeScript literal that cannot escape the code context it lands in. */
export function sanitizeCodeString(value: string): string {
  return JSON.stringify(value).replace(/[<>\u2028\u2029]/g, (char) => CODE_UNSAFE[char]);
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
