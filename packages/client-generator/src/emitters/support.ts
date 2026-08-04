// Low-level text helpers shared across the emitters. Private to `emitters/`.

import { sanitizeIdentifier } from './identifier.js';

/**
 * Upper-case the first character of an operation name. We don't normalize the
 * rest because almost every spec uses camelCase or PascalCase, and names that
 * contain digits or `_` are passed through unchanged — the user named them that
 * way for a reason.
 *
 * `op.name` reaches here already sanitized into a non-empty, valid TS identifier
 * by the IR builder (see `intermediate-representation/sanitize-identifiers.ts`), so no empty-string or
 * unsafe-character guard is needed.
 */
export function pascalCase(name: string): string {
  return name[0].toUpperCase() + name.slice(1);
}

/**
 * CamelCase property key for a response-header wire name (`Pagination-Total` →
 * `paginationTotal`).
 */
export function headerPropertyKey(wireName: string): string {
  const camelCase = wireName
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
  return sanitizeIdentifier(camelCase);
}

export function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
}
