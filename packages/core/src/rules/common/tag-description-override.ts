import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { readFileSync } from '../../utils';

export const TagDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ tagNames }) => {
  return {
    Tag: {
      leave(tag) {
        if (!tagNames) throw new Error(`Parameter "tagNames" is not provided`);
        if (tagNames[tag.name]) {
          tag.description = readFileSync(tagNames[tag.name]);
        }
      },
    },
  };
};
