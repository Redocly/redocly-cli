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

type StdArgs = [string, (err?: Error) => void];

function stderr(...args: any[]) {
  process.stderr.write(...(args as StdArgs));
}

function stdout(...args: any[]) {
  process.stdout.write(...(args as StdArgs));
}
class Logger {
  info(...args: any[]) {
    return isBrowser() ? console.log(...args) : stdout(...args);
  }

  warn(...args: any[]) {
    return isBrowser() ? console.warn(...args) : stderr(...args);
  }

  error(...args: any[]) {
    return isBrowser() ? console.error(...args) : stderr(...args);
  }
}

export const logger = new Logger();
