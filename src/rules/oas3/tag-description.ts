import { Oas3Rule } from '../../visitors';
import { validateDefinedAndNonEmpty } from '../utils';

export const TagDescription: Oas3Rule = () => {
  return {
    Tag(tag, ctx) {
      validateDefinedAndNonEmpty('description', tag, ctx);
    },
  };
};
