import type { Oas3Tag, Oas3_2Tag } from '../../typings/openapi.js';
import type { Oas2Tag } from '../../typings/swagger.js';
import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { validateDefinedAndNonEmpty } from '../utils.js';

export const TagDescription: Oas3Rule | Oas2Rule = () => {
  return {
    Tag(tag: Oas2Tag | Oas3Tag | Oas3_2Tag, ctx: UserContext) {
      validateDefinedAndNonEmpty('description', tag, ctx);
    },
  };
};
