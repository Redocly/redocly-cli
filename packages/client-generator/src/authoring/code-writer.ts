// A small indentation-aware text builder for emitting code in ANY language —
// deliberately not an AST. Part of the language-neutral authoring toolkit.

export class CodeWriter {
  private readonly lines: string[] = [];
  private depth = 0;

  constructor(private readonly indentUnit: string = '  ') {}

  /** Append one line at the current depth; no argument appends an empty line. */
  line(text = ''): this {
    this.lines.push(text === '' ? '' : this.indentUnit.repeat(this.depth) + text);
    return this;
  }

  blank(): this {
    return this.line();
  }

  /** Run `body` with the depth increased by one. */
  indent(body: () => void): this {
    this.depth++;
    body();
    this.depth--;
    return this;
  }

  /** `open` at the current depth, `body` indented, `close` back at the current depth.
   * Omit `close` for languages whose blocks end by dedent alone (Python, YAML). */
  block(open: string, body: () => void, close?: string): this {
    this.line(open);
    this.indent(body);
    return close === undefined ? this : this.line(close);
  }

  toString(): string {
    return this.lines.join('\n') + '\n';
  }
}
