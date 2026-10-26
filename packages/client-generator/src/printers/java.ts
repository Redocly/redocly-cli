// The Java syntax printer (ADR-0021). Java's extensions: `doc` writes a Javadoc block,
// and `string` writes a double-quoted literal with `\uXXXX` escapes, because a generated
// file must compile whatever text the description carries.

import { identifierFor, RESERVED_WORDS, uniqueIdentifiers } from '../authoring/naming.js';
import { Printer } from '../authoring/printer.js';
import { docText } from '../authoring/schema.js';

const JAVA = RESERVED_WORDS.java;

export class JavaPrinter extends Printer {
  constructor() {
    super('    ');
  }

  /** A class/record/enum/interface name: PascalCase, keyword-safe. */
  typeName(name: string): string {
    return identifierFor(name, { style: 'pascal', reserved: JAVA });
  }

  /** A field/method name: camelCase, keyword-safe. */
  memberName(name: string): string {
    return identifierFor(name, { style: 'camel', reserved: JAVA });
  }

  /** A local variable/argument name: camelCase, keyword-safe. */
  identifier(name: string): string {
    return identifierFor(name, { style: 'camel', reserved: JAVA });
  }

  /** Names made unique among themselves and the caller's taken set (`id`, `id2`). */
  identifiers(names: readonly string[], taken?: Iterable<string>): string[] {
    return uniqueIdentifiers(names, { style: 'camel', reserved: JAVA, taken });
  }

  /**
   * A double-quoted Java string literal for any spec-supplied text. Controls and line
   * breaks are escaped; a lone surrogate (a JS string can carry one) becomes U+FFFD;
   * everything else, non-ASCII included, is written as itself, because javac reads UTF-8.
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
      else if (code < 0x20 || code === 0x7f) out += `\\u${code.toString(16).padStart(4, '0')}`;
      else if (code >= 0xd800 && code <= 0xdfff) out += '\\uFFFD';
      else out += char;
    }
    return out + '"';
  }

  /** JSON-ish data as a Java expression (`Map.of` / `List.of` composites; nulls as `null`). */
  literal(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return Number.isInteger(value) ? `${value}L` : String(value);
    if (typeof value === 'string') return this.string(value);
    if (Array.isArray(value)) {
      return `java.util.List.of(${value.map((item) => this.literal(item)).join(', ')})`;
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${this.string(key)}, ${this.literal(entry)}`)
      .join(', ');
    return `java.util.Map.of(${entries})`;
  }

  /** A `//` line comment. */
  comment(text: string): this {
    for (const line of commentText(text)) this.line(line === '' ? '//' : `// ${line}`);
    return this;
  }

  /** A Javadoc block: `/** Name — summary. *\/` on one line, several lines otherwise. */
  doc(name: string, description?: string): this {
    const lines = commentText(description).map((line) => line.replaceAll('*/', '*&#47;'));
    if (lines.length === 0) return this;
    if (lines.length === 1) return this.line(`/** ${name} — ${lines[0]} */`);
    this.line('/**');
    this.line(` * ${name} — ${lines[0]}`);
    for (const line of lines.slice(1)) this.line(line === '' ? ' *' : ` * ${line}`);
    return this.line(' */');
  }
}

/**
 * Description lines safe inside a Java comment: javac translates `\uXXXX` everywhere in a
 * source file, comments included, and rejects a `\u` that no hex digits follow (`C:\users`).
 * Each backslash is written as `\u005c`, the escape of a backslash: javac turns it back into
 * one, and a backslash that came out of an escape never starts another, so the Javadoc reads
 * exactly as the description does.
 */
function commentText(text?: string): string[] {
  return docText(text).map((line) => line.replaceAll('\\', '\\u005c'));
}
