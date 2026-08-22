// The TypeScript syntax printer (ADR-0021). TypeScript's extension is `key(name)` — a
// bare-or-quoted object key; no other output language has quotable keys. Its `string`
// carries the merged escaping policy: JSON escaping plus U+2028/U+2029 (line terminators
// in JS source) plus `<`/`>` (a `</script>` breakout when output lands in an inline
// script) — previously two escapers with different protections, split by import site.

import { RESERVED_WORDS } from '../authoring/naming.js';
import { Printer } from '../authoring/printer.js';
import { docText } from '../authoring/schema.js';
import type { SchemaMetadata } from '../intermediate-representation/model.js';

export class TypeScriptPrinter extends Printer {
  constructor() {
    super('    ');
  }

  /** A type name: PascalCase over an already-sanitized name (the IR coerces op names). */
  typeName(name: string): string {
    return pascalCase(sanitizeIdentifier(name));
  }

  /** A member (binding) name: sanitized, keyword-safe. */
  memberName(name: string): string {
    return sanitizeIdentifier(name);
  }

  /** A local/argument name: sanitized, keyword-safe. */
  identifier(name: string): string {
    return sanitizeIdentifier(name);
  }

  /** Names made unique among themselves and the caller's taken set (`id`, `id_2`). */
  identifiers(names: readonly string[], taken?: Iterable<string>): string[] {
    const used = new Set(taken ?? []);
    return names.map((name) => uniqueIdent(name, used));
  }

  /** An object key: bare when it is a valid non-reserved identifier, quoted otherwise. */
  key(name: string): string {
    return isSafeIdentifier(name) ? name : this.string(name);
  }

  /** A string literal that cannot escape the code context it lands in. */
  string(value: string): string {
    return sanitizeCodeString(value);
  }

  /** JSON-ish data as TypeScript source text. */
  literal(value: unknown): string {
    return codeLiteral(value);
  }

  /** A `//` line comment. */
  comment(text: string): this {
    for (const line of docText(text)) this.line(line === '' ? '//' : `// ${line}`);
    return this;
  }

  /** A JSDoc block; a star-slash in spec text is escaped so it cannot terminate it. */
  doc(description?: string): this {
    const lines = docText(description);
    if (lines.length === 0) return this;
    this.line('/**');
    for (const line of lines) this.line(line === '' ? ' *' : ` * ${line.replace(/\*\//g, '*\\/')}`);
    return this.line(' */');
  }
}

// ─── Identifier mechanics ───

// Identifier sanitization — mapping OpenAPI names (which may contain `-`, `.`,
// spaces, or be reserved words) onto valid TypeScript identifiers. Pure string
// logic with no dependency on the IR or other emitters.

/** Matches a string that is already a valid JS identifier (ignoring reserved words). */
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// One list for the package: `identifierFor` (suffix convention) reads the same set.
const TS_RESERVED = RESERVED_WORDS.typescript;

/** True when `name` matches the JS identifier grammar (reserved words still pass). */
export function isIdentifier(name: string): boolean {
  return IDENT_RE.test(name);
}

/** True when `name` is a valid JS identifier AND not a reserved word — safe as a binding name. */
export function isSafeIdentifier(name: string): boolean {
  return IDENT_RE.test(name) && !TS_RESERVED.has(name);
}

/**
 * Coerce an arbitrary spec-supplied name into a valid, non-reserved JS identifier
 * (no uniqueness guarantee — see `uniqueIdent`). Non-identifier characters become
 * `_`; an empty result, a leading digit, or a reserved word is prefixed with `_`.
 * This is the security boundary for any name that lands in a declaration slot —
 * `ts.factory.createIdentifier` prints its text verbatim, so an unsanitized name
 * like `foo(){};evil()` would emit as executable code.
 */
export function sanitizeIdentifier(name: string): string {
  let base = name.replace(/[^A-Za-z0-9_$]/g, '_');
  if (base === '' || /^[0-9]/.test(base) || TS_RESERVED.has(base)) base = `_${base}`;
  return base;
}

/**
 * A double-quoted TS string literal for generated code. One policy for the whole
 * package — the stricter of the two that used to exist: U+2028/U+2029 (line terminators
 * in JS source) AND `<`/`>` (a `</script>` breakout when output lands in an inline
 * script). Which protection applied used to depend on which escaper the caller imported.
 */
const CODE_UNSAFE: Record<string, string> = {
  '<': '\\u003C',
  '>': '\\u003E',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export function codeString(value: string): string {
  return JSON.stringify(value).replace(/[<>\u2028\u2029]/g, (char) => CODE_UNSAFE[char]);
}

/**
 * Render `name` as an object key or property name: bare when it is a valid,
 * non-reserved identifier, quoted otherwise. Safe only where quoting is legal
 * (object keys, property signatures) — not for binding names; use `uniqueIdent`
 * there.
 */
export function safeIdent(name: string): string {
  if (IDENT_RE.test(name) && !TS_RESERVED.has(name)) {
    return name;
  }
  return codeString(name);
}

/**
 * `sanitizeIdentifier(name)` made unique within `used` (which it mutates):
 * collisions get a `_2`, `_3`, … suffix. Used wherever a name lands in a binding
 * slot that — unlike an object key — cannot be quoted (function/type/parameter
 * names), so `safeIdent`'s quote-on-failure fallback would not compile.
 */
export function uniqueIdent(name: string, used: Set<string>): string {
  const base = sanitizeIdentifier(name);
  let ident = base;
  let n = 2;
  while (used.has(ident)) ident = `${base}_${n++}`;
  used.add(ident);
  return ident;
}

// ─── Literals ───

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

// ─── JSDoc ───

/** Backslash-escape any comment-closing star-slash so it cannot terminate a block comment. */
export function escapeJsDoc(text: string): string {
  return text.replace(/\*\//g, '*\\/');
}

/**
 * The JSDoc body for a description + metadata as a single `\n`-joined string,
 * or `undefined` when there's nothing to document. The AST emitters feed this
 * to `ts.ts`'s `jsdoc` helper (which owns the `*`-prefixing and indentation),
 * so this returns only the raw body — no comment delimiters, no padding.
 */
export function jsdocText(text: string | undefined, metadata?: SchemaMetadata): string | undefined {
  const lines = jsdocLines(text, metadata);
  return lines.length === 0 ? undefined : lines.join('\n');
}

/**
 * Build the body of a JSDoc block from a description and an optional metadata
 * bag. Description lines come first (trimmed of leading/trailing blanks); then
 * the metadata tag lines in a stable, source-driven order.
 *
 * Returns `[]` when there's nothing to render — callers use the empty result
 * to skip emitting any JSDoc at all.
 */
function jsdocLines(text: string | undefined, metadata: SchemaMetadata | undefined): string[] {
  const lines: string[] = [];
  if (text && text.trim()) {
    lines.push(...trimLines(splitLines(text)));
  }
  if (metadata) {
    lines.push(...formatMetadata(metadata));
  }
  return lines;
}

/**
 * Project a SchemaMetadata bag into JSDoc tag lines.
 *
 * Order matches the (near-)spec order so generated output is deterministic and
 * diff-stable. `pattern` is escaped so an embedded `*​/` cannot terminate the
 * surrounding JSDoc block.
 */
function formatMetadata(metadata: SchemaMetadata): string[] {
  const lines: string[] = [];
  const push = (tag: string, value?: number | string | boolean): void => {
    if (value === undefined) {
      lines.push(`@${tag}`);
    } else {
      lines.push(`@${tag} ${value}`);
    }
  };
  if (metadata.minimum !== undefined) push('minimum', metadata.minimum);
  if (metadata.maximum !== undefined) push('maximum', metadata.maximum);
  if (metadata.exclusiveMinimum !== undefined) push('exclusiveMinimum', metadata.exclusiveMinimum);
  if (metadata.exclusiveMaximum !== undefined) push('exclusiveMaximum', metadata.exclusiveMaximum);
  if (metadata.minLength !== undefined) push('minLength', metadata.minLength);
  if (metadata.maxLength !== undefined) push('maxLength', metadata.maxLength);
  if (metadata.pattern !== undefined) push('pattern', escapeJsDoc(metadata.pattern));
  if (metadata.minItems !== undefined) push('minItems', metadata.minItems);
  if (metadata.maxItems !== undefined) push('maxItems', metadata.maxItems);
  if (metadata.uniqueItems === true) push('uniqueItems');
  if (metadata.format !== undefined) push('format', metadata.format);
  if (metadata.deprecated === true) push('deprecated');
  return lines;
}

function trimLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === '') start++;
  while (end > start && lines[end - 1] === '') end--;
  return lines.slice(start, end);
}

// ─── Casing and text support ───

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
