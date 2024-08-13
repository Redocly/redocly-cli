import { isBrowser } from './env.js';

export const output = {
  write(str: string) {
    return isBrowser ? undefined : process.stdout.write(str);
  },
};
