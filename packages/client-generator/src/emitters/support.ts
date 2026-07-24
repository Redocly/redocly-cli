// Low-level text helpers shared across the emitters. Private to `emitters/`.

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

export function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
}
