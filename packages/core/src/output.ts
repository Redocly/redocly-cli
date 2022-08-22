import { isBrowser, stdout, StdArgs } from './utils';

export const output = {
  write(...args: StdArgs) {
    if (isBrowser()) return;

    return stdout(...args);
  },
};
