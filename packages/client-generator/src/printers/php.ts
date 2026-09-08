// The PHP syntax printer (ADR-0021). PHP's extension: `doc` takes `@tag` lines, because
// `array` and `\Generator` erase element types — the docblock carries what they hold.

import { identifierFor, RESERVED_WORDS, uniqueIdentifiers } from '../authoring/naming.js';
import { Printer } from '../authoring/printer.js';
import { docText } from '../authoring/schema.js';

const PHP = RESERVED_WORDS.php;

export class PhpPrinter extends Printer {
  constructor() {
    super('    ');
  }

  /** A class/enum name: PascalCase, keyword-safe. */
  typeName(name: string): string {
    return identifierFor(name, { style: 'pascal', reserved: PHP });
  }

  /** A property/method name: camelCase, keyword-safe. */
  memberName(name: string): string {
    return identifierFor(name, { style: 'camel', reserved: PHP });
  }

  /** A variable/argument name (without the `$`). */
  identifier(name: string): string {
    return identifierFor(name, { style: 'camel', reserved: PHP });
  }

  /** Names made unique among themselves and the caller's taken set (`id`, `id2`). */
  identifiers(names: readonly string[], taken?: Iterable<string>): string[] {
    return uniqueIdentifiers(names, { style: 'camel', reserved: PHP, taken });
  }

  /** `'…'` with backslashes and quotes escaped — safe for any spec-supplied text. */
  string(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  /** JSON-ish data as a PHP expression (arrays for both lists and maps). */
  literal(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    if (typeof value === 'string') return this.string(value);
    if (Array.isArray(value)) return `[${value.map((item) => this.literal(item)).join(', ')}]`;
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${this.string(key)} => ${this.literal(entry)}`)
      .join(', ');
    return `[${entries}]`;
  }

  /** A `//` line comment. */
  comment(text: string): this {
    for (const line of docText(text)) this.line(line === '' ? '//' : `// ${line}`);
    return this;
  }

  /** A docblock: one line without tags, the `@tag` form with them. */
  doc(name: string, description?: string, tags: string[] = []): this {
    const lines = docText(description);
    if (lines.length === 0 && tags.length === 0) return this;
    const summary = lines.length === 0 ? name : `${name} — ${lines.join(' ')}`;
    if (tags.length === 0) return this.line(`/** ${summary} */`);
    this.line('/**');
    this.line(` * ${summary}`);
    this.line(' *');
    for (const tag of tags) this.line(` * ${tag}`);
    return this.line(' */');
  }
}
