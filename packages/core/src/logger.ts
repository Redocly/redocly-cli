import * as colorette from 'colorette';
import { isBrowser } from './env.js';
import { identity } from './utils.js';

export const RESET_ESCAPE_CODE_IN_TERMINAL = process.env.NO_COLOR ? '' : '\x1B[0m';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore this works but some types are not working
export const colorOptions = colorette.options;

export const colorize = new Proxy(colorette, {
  get(target: typeof colorette, prop: string): typeof identity {
    if (isBrowser) {
      return identity;
    }

    return (target as any)[prop];
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
      process.stdout.write(`${RESET_ESCAPE_CODE_IN_TERMINAL}\n`);
    }
  }

  printSeparator(separator: string) {
    const windowWidth = process.stdout.columns || 80;
    const coloredSeparator = isBrowser ? separator : colorize.gray(separator);
    const separatorLine = coloredSeparator
      .repeat(Math.ceil(windowWidth / separator.length))
      .slice(0, windowWidth);

    return isBrowser ? console.log(separatorLine) : process.stdout.write(separatorLine);
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
