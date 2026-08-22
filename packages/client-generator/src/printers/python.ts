// The Python syntax printer (ADR-0021): structure from the common `Printer`, syntax —
// identifier safety, string escaping, literal rendering, comment and docstring form —
// owned here. The generator owns shape (classes, signatures, field lists) as template
// literals; the test for what belongs on the printer is "is there exactly one right answer?"

import { identifierFor, RESERVED_WORDS, uniqueIdentifiers } from '../authoring/naming.js';
import { Printer } from '../authoring/printer.js';
import { docText } from '../authoring/schema.js';

const PY = RESERVED_WORDS.python;

export class PythonPrinter extends Printer {
  constructor() {
    super('    ');
  }

  /** A class name: PascalCase, keyword-safe. */
  typeName(name: string): string {
    return identifierFor(name, { style: 'pascal', reserved: PY });
  }

  /** A field/parameter name, reporting a rename so the caller can record the wire name. */
  memberName(name: string): { identifier: string; renamed: boolean } {
    const identifier = identifierFor(name, { style: 'snake', reserved: PY });
    return { identifier, renamed: identifier !== name };
  }

  /** A local/argument name: snake_case, keyword-safe. */
  identifier(name: string): string {
    return identifierFor(name, { style: 'snake', reserved: PY });
  }

  /** Names made unique among themselves and the caller's taken set (`id`, `id_2`). */
  identifiers(names: readonly string[], taken?: Iterable<string>): string[] {
    return uniqueIdentifiers(names, { style: 'snake', reserved: PY, taken });
  }

  /** A module-level constant name: SCREAMING_SNAKE. */
  constName(name: string): string {
    return identifierFor(name, { style: 'screaming', reserved: PY });
  }

  /**
   * A double-quoted Python string literal for any spec-supplied text. Controls are
   * escaped; a lone surrogate (a JS string can carry one) stays representable as its
   * `\uXXXX` escape; everything else — non-ASCII included — is written as itself,
   * because generated files are UTF-8.
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
      else if (code >= 0xd800 && code <= 0xdfff) out += `\\u${code.toString(16).padStart(4, '0')}`;
      else out += char;
    }
    return out + '"';
  }

  /** JSON-ish data as a Python expression (dicts/lists/strings/numbers/bools/None). */
  literal(value: unknown): string {
    if (value === null || value === undefined) return 'None';
    if (value === true) return 'True';
    if (value === false) return 'False';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return this.string(value);
    if (Array.isArray(value)) return `[${value.map((item) => this.literal(item)).join(', ')}]`;
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${this.string(key)}: ${this.literal(entry)}`)
      .join(', ');
    return `{${entries}}`;
  }

  /** A `#` line comment (multi-line text becomes one `#` line per line). */
  comment(text: string): this {
    for (const line of docText(text)) this.line(line === '' ? '#' : `# ${line}`);
    return this;
  }

  /** A docstring: Python's one-line and multi-line forms differ, and this owns the rule. */
  doc(description?: string): this {
    const lines = docText(description);
    if (lines.length === 0) return this;
    if (lines.length === 1) return this.line(`"""${lines[0]}"""`);
    this.line(`"""${lines[0]}`);
    for (const line of lines.slice(1)) this.line(line);
    return this.line('"""');
  }
}
