import type { Source } from '../resolve';

const jsYamlErrorLineColRegexp = /\((\d+):(\d+)\)$/;

export class YamlParseError extends Error {
  col: number;
  line: number;

  constructor(public originalError: Error, public source: Source) {
    super(originalError.message.split('\n')[0]);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, YamlParseError.prototype);

    const [, line, col] = this.message.match(jsYamlErrorLineColRegexp) || [];
    this.line = parseInt(line, 10);
    this.col = parseInt(col, 10);
  }
}
