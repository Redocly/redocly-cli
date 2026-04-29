import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';

export const InfoOverride: Oas3Decorator | Oas2Decorator = (newInfo) => {
  return {
    Info: {
      leave(info) {
        if (!isPlainObject(newInfo)) {
          throw new Error(`"info-override" decorator should be called with an object`);
        }
        const { severity: _, ...rest } = newInfo;
        Object.assign(info, rest);
      },
    },
  };
};
