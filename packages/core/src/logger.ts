import * as colorette from 'colorette';

import { isBrowser } from './env.js';

let useColor = !isBrowser && colorette.isColorSupported;
// `colorette` has no global switch, so forcing colors on takes a palette of its own.
let palette: colorette.Colorette = colorette;

export const colorOptions = {
  get enabled() {
    return useColor;
  },
  set enabled(value: boolean) {
    useColor = value && !isBrowser;
    if (useColor) {
      palette = colorette.createColors({ useColor });
    }
  },
};

export const colorize = new Proxy({} as colorette.Colorette, {
  get(_target, color: keyof colorette.Colorette) {
    return (text: string | number) => (useColor ? palette[color](text) : String(text));
  },
});

export interface LoggerInterface {
  info(message: string): void;
  warn(message: string): void;
  output(message: string): void;
  error(message: string): void;
  printNewLine(): void;
  printSeparator(separator: string): void;
  indent(str: string, level: number): string;
}

class Logger implements LoggerInterface {
  info(str: string) {
    return isBrowser ? console.info(str) : process.stderr.write(str);
  }

  warn(str: string) {
    return isBrowser ? console.warn(str) : process.stderr.write(colorize.yellow(str));
  }

  error(str: string) {
    return isBrowser ? console.error(str) : process.stderr.write(colorize.red(str));
  }

  output(str: string) {
    return isBrowser ? console.log(str) : process.stdout.write(str);
  }

  printNewLine() {
    if (isBrowser) {
      console.log('\n');
    } else {
      // Add a space to ensure the line is not empty in GitHub CI environments, otherwise it will be hidden
      process.stdout.write(' \n');
    }
  }

  printSeparator(separator: string) {
    const windowWidth = process.stdout.columns || 80;
    const separatorLine = separator
      .repeat(Math.ceil(windowWidth / separator.length))
      .slice(0, windowWidth);
    const coloredSeparatorLine = isBrowser ? separatorLine : colorize.gray(separatorLine);

    return isBrowser
      ? console.log(coloredSeparatorLine)
      : process.stdout.write(coloredSeparatorLine);
  }

  indent(str: string, level: number) {
    const indentChar = isBrowser ? '  ' : '\xa0';
    return str
      .split('\n')
      .map((line) => indentChar.repeat(level) + line)
      .join('\n');
  }
}

export const logger = new Logger();
