import * as colorette from 'colorette';
export { options as colorOptions } from 'colorette';

import { isBrowser, identity, stderr } from './utils';

export const colorize = new Proxy(colorette, {
  get(target: typeof colorette, prop: string): typeof identity {
    if (isBrowser()) {
      return identity;
    }

    return (target as any)[prop];
  },
});
class Logger {
  info(str: string) {
    return isBrowser() ? console.log(str) : stderr(str);
  }

  warn(str: string) {
    return isBrowser() ? console.warn(str) : stderr(colorize.yellow(str));
  }

  error(str: string) {
    return isBrowser() ? console.error(str) : stderr(colorize.red(str));
  }
}

export const logger = new Logger();
