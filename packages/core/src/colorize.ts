import * as colorette from 'colorette';

import { isBrowser } from './utils';

const identity = <T>(value: T): T => value;

export default new Proxy(colorette, {
  get(target: typeof colorette, prop: string): typeof identity {
    if (isBrowser()) {
      return identity;
    }

    return (target as any)[prop];
  },
});

export { options } from 'colorette';
