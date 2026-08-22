// The TypeScript syntax printer (ADR-0021). TypeScript's extension is `key(name)` — a
// bare-or-quoted object key; no other output language has quotable keys. Its `string`
// carries the merged escaping policy: JSON escaping plus U+2028/U+2029 (line terminators
// in JS source) plus `<`/`>` (a `</script>` breakout when output lands in an inline
// script) — previously two escapers with different protections, split by import site.

import { Printer } from '../authoring/printer.js';
import { docText } from '../authoring/schema.js';
import { isSafeIdentifier, sanitizeIdentifier, uniqueIdent } from '../emitters/identifier.js';
import { pascalCase } from '../emitters/support.js';
import { codeLiteral, sanitizeCodeString } from '../emitters/ts-literal.js';

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
