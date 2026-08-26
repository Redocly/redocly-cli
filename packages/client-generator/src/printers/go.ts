// The Go syntax printer (ADR-0021). Go's extensions carry knowledge that must not be
// re-derived: `typeName`/`memberName` apply the digit-leading `N` rule (a `_` prefix
// means UNexported, so `encoding/json` would silently skip the field), and `layout` is
// applied by `toString()` because CI commonly runs `gofmt -l` and fails on any file it
// would reformat — column padding cannot be computed line-by-line, since the width for
// the first field depends on the longest field in a run that has not been emitted yet.

import { identifierFor, RESERVED_WORDS } from '../authoring/naming.js';
import { Printer } from '../authoring/printer.js';
import { docText } from '../authoring/schema.js';

const GO = RESERVED_WORDS.go;

export class GoPrinter extends Printer {
  constructor() {
    super('\t');
  }

  /** An exported type name: PascalCase, with the digit-leading `N` rule. */
  typeName(name: string): string {
    return exported(name);
  }

  /** An exported field/method name — same rule as `typeName`; Go has one namespace. */
  memberName(name: string): string {
    return exported(name);
  }

  /** A local/argument name: camelCase, keyword-safe. */
  identifier(name: string): string {
    return identifierFor(name, { style: 'camel', reserved: GO });
  }

  /** Exported names made unique among themselves and the caller's taken set (`Id`, `Id2`). */
  identifiers(names: readonly string[], taken?: Iterable<string>): string[] {
    const used = new Set(taken ?? []);
    return names.map((name) => {
      const base = exported(name);
      let ident = base;
      for (let suffix = 2; used.has(ident); suffix++) ident = `${base}${suffix}`;
      used.add(ident);
      return ident;
    });
  }

  /** A package clause name: lower-case letters and digits only, never empty. */
  packageName(name: string): string {
    const cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned === '' || /^[0-9]/.test(cleaned) ? 'client' : cleaned;
  }

  /**
   * A double-quoted Go string literal for any spec-supplied text. Controls are escaped;
   * a lone surrogate (a JS string can carry one) has no Go spelling — `\uD800` is an
   * invalid code point to the compiler — so it becomes U+FFFD; everything else,
   * non-ASCII included, is written as itself, because generated files are UTF-8.
   */
  string(value: string): string {
    let out = '"';
    for (const char of value) {
      const code = char.codePointAt(0)!;
      if (char === '\\') out += '\\\\';
      else if (char === '"') out += '\\"';
      else if (char === '\n') out += '\\n';
      else if (char === '\r') out += '\\r';
      else if (char === '\t') out += '\\t';
      else if (code < 0x20 || code === 0x7f) out += `\\x${code.toString(16).padStart(2, '0')}`;
      else if (code >= 0xd800 && code <= 0xdfff) out += '\\uFFFD';
      else out += char;
    }
    return out + '"';
  }

  /** JSON-ish data as a Go expression (`map[string]any` / `[]any` composites). */
  literal(value: unknown): string {
    if (value === null || value === undefined) return 'nil';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    if (typeof value === 'string') return this.string(value);
    if (Array.isArray(value)) {
      return `[]any{${value.map((item) => this.literal(item)).join(', ')}}`;
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${this.string(key)}: ${this.literal(entry)}`)
      .join(', ');
    return `map[string]any{${entries}}`;
  }

  /** A `//` line comment. */
  comment(text: string): this {
    for (const line of docText(text)) this.line(line === '' ? '//' : `// ${line}`);
    return this;
  }

  /** A doc comment: `// Name — summary`, blank lines collapsed the way gofmt rewrites them. */
  doc(name: string, description?: string): this {
    const lines = docText(description);
    if (lines.length === 0) return this;
    this.line(`// ${name} — ${lines[0]}`);
    let previousWasBlank = false;
    for (const line of lines.slice(1)) {
      if (line === '') {
        if (!previousWasBlank) this.line('//');
        previousWasBlank = true;
        continue;
      }
      this.line(`// ${line}`);
      previousWasBlank = false;
    }
    return this;
  }

  /** gofmt-clean text: column alignment plus the whitespace shape gofmt produces. */
  layout(source: string): string {
    return gofmtShape(alignGoColumns(source));
  }

  override toString(): string {
    return this.layout(super.toString());
  }
}

/** An exported Go identifier: PascalCase, digit-leading names get `N` (never `_`). */
export function exported(name: string): string {
  const ident = identifierFor(name, { style: 'pascal', reserved: GO });
  return ident.startsWith('_') ? `N${ident.slice(1)}` : ident;
}

/**
 * The whitespace shape gofmt produces: never more than one blank line, and exactly one
 * trailing newline. Both entry points below run through it, so the models view is as
 * gofmt-clean as the full client.
 */
function gofmtShape(source: string): string {
  return `${source.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/**
 * Align columns the way gofmt does, so the emitted file is already idiomatic and a
 * `gofmt` run is a no-op. gofmt pads with spaces inside a contiguous run of similar
 * lines: struct fields align their type and tag columns, `const`/`var` entries align
 * their type and `=`. A line that doesn't fit the shape (a comment, a blank line, a
 * type containing spaces) ends the run, exactly like gofmt's tabwriter.
 */
function alignGoColumns(source: string): string {
  const lines = source.split('\n');
  const out = [...lines];
  // `\tName Type` optionally followed by a `json:"…"` tag, `\tName Type = value`, or a
  // quoted map key. A statement starting with a Go keyword (`case "x":`, `return y`) is
  // NOT a declaration and must never be padded.
  const FIELD = /^(\t+)([A-Za-z_]\w*) (\S+)( `[^`]*`)?$/;
  const CONST = /^(\t+)([A-Za-z_]\w*) (\S+) = (.+)$/;
  const ENTRY = /^(\t+)("(?:[^"\\]|\\.)*":) (.+)$/;

  const flush = (run: Array<{ index: number; parts: string[]; indent: string }>): void => {
    if (run.length < 2) return;
    const widths: number[] = [];
    for (const { parts } of run) {
      parts.forEach((part, column) => {
        // The last column never needs padding.
        if (column < parts.length - 1) widths[column] = Math.max(widths[column] ?? 0, part.length);
      });
    }
    for (const { index, parts, indent } of run) {
      const padded = parts.map((part, column) =>
        column < parts.length - 1 ? part.padEnd(widths[column] ?? 0) : part
      );
      out[index] = indent + padded.join(' ').trimEnd();
    }
  };

  let run: Array<{ index: number; parts: string[]; indent: string }> = [];
  let runKind: 'field' | 'const' | 'entry' | undefined;
  lines.forEach((line, index) => {
    const entryMatch = ENTRY.exec(line);
    const constMatch = entryMatch === null ? CONST.exec(line) : null;
    const fieldCandidate = entryMatch === null && constMatch === null ? FIELD.exec(line) : null;
    // `case`, `return`, `var`, … start statements, not declarations.
    const fieldMatch =
      fieldCandidate !== null && !GO.has(fieldCandidate[2]) ? fieldCandidate : null;
    const kind =
      entryMatch !== null
        ? 'entry'
        : constMatch !== null
          ? 'const'
          : fieldMatch !== null
            ? 'field'
            : undefined;
    if (kind === undefined || kind !== runKind) {
      flush(run);
      run = [];
      runKind = kind;
    }
    if (entryMatch !== null) {
      run.push({ index, indent: entryMatch[1], parts: [entryMatch[2], entryMatch[3]] });
      return;
    }
    if (constMatch !== null) {
      run.push({
        index,
        indent: constMatch[1],
        parts: [constMatch[2], constMatch[3], '=', constMatch[4]],
      });
      return;
    }
    if (fieldMatch !== null) {
      const parts = [fieldMatch[2], fieldMatch[3]];
      if (fieldMatch[4] !== undefined) parts.push(fieldMatch[4].trimStart());
      run.push({ index, indent: fieldMatch[1], parts });
    }
  });
  flush(run);
  return out.join('\n');
}
