import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { objKeysToLowerCase, readFileSync } from '../../utils';

export const TagDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ tagNames }) => {
  if (tagNames) {
    tagNames = objKeysToLowerCase(tagNames);
  }
  return {
    Tag: {
      leave(tag) {
        if (!tagNames) throw new Error(`Parameter "tagNames" is not provided`);
          const tagName = tag.name.toLocaleLowerCase();
          if (tagNames[tagName]) {
            tag.description = readFileSync(tagNames[tagName]);
          }
      },
    }
  };
};
