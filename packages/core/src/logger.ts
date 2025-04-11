import * as colorette from 'colorette';
import { isBrowser } from './env.js';
import { identity } from './utils.js';

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

class Logger {
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
    return isBrowser ? console.info(str) : process.stdout.write(str);
  }
}

export const logger = new Logger();
