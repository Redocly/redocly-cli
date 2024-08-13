import { validateDefinedAndNonEmpty } from '../utils.js';

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';

export const TagDescription: Oas3Rule | Oas2Rule = () => {
  return {
    Tag(tag, ctx) {
      validateDefinedAndNonEmpty('description', tag, ctx);
    },
  };
};
