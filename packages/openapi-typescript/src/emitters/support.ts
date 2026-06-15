// Low-level text helpers shared by the structural emitters (types, operations,
// auth) and the composition layer. Private to `emitters/` — never reached by
// writers, which see only the `ClientModules` seam.

/** Join non-empty code sections with blank lines and a trailing newline. */
export function joinSections(sections: string[]): string {
  return sections.filter((s) => s.length > 0).join('\n\n') + '\n';
}

/**
 * Upper-case the first character of an operation name. We don't normalize the
 * rest because almost every spec uses camelCase or PascalCase, and names that
 * contain digits or `_` are passed through unchanged — the user named them that
 * way for a reason.
 *
 * `op.name` reaches here already sanitized into a non-empty, valid TS identifier
 * by the IR builder (see `ir/sanitize-identifiers.ts`), so no empty-string or
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
