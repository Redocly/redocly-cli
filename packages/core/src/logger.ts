import * as colorette from 'colorette';
export { options as colorOptions } from 'colorette';

import { isBrowser } from './utils';

const identity = <T>(value: T): T => value;

export const colorize = new Proxy(colorette, {
  get(target: typeof colorette, prop: string): typeof identity {
    if (isBrowser()) {
      return identity;
    }

    return (target as any)[prop];
  },
});

type StdArgs = [string | Uint8Array];

function stderr(...args: StdArgs) {
  process.stderr.write(...args);
}

function stdout(...args: StdArgs) {
  process.stdout.write(...args);
}
class Logger {
  info(...args: StdArgs) {
    return isBrowser() ? console.log(...args) : stdout(...args);
  }

  warn(...args: StdArgs) {
    return isBrowser() ? console.warn(...args) : stderr(...args);
  }

  error(...args: StdArgs) {
    return isBrowser() ? console.error(...args) : stderr(...args);
  }
}

export const logger = new Logger();
