import { validateDefinedAndNonEmpty } from '../utils.js';

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import { Oas3_2Tag, Oas3Tag } from 'core/src/typings/openapi.js';
import { UserContext } from 'core/src/walk.js';

export const TagDescription: Oas3Rule | Oas2Rule = () => {
  return {
    Tag(tag: Oas3Tag | Oas3_2Tag, ctx: UserContext) {
      validateDefinedAndNonEmpty('description', tag, ctx);
    },
  };
};
