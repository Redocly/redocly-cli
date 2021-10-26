import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { readFileAsStringSync } from '../../utils';

export const TagDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ tagNames }) => {
  return {
    Tag: {
      leave(tag, { report, location }) {
        if (!tagNames) throw new Error(`Parameter "tagNames" is not provided`);
        if (tagNames[tag.name]) {
          try {
            tag.description = readFileAsStringSync(tagNames[tag.name]);
          } catch (e) {
            report({
              message: `Failed to read file. ${e.message}`,
              location: location.child('info').key(),
            });
          }
        }
      },
    },
  };
};
