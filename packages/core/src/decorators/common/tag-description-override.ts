import { Oas3Tag, Oas3_2Tag } from 'core/src/typings/openapi.js';
import { readFileAsStringSync } from '../../utils.js';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const TagDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ tagNames }) => {
  return {
    Tag: {
      leave(tag: Oas3Tag | Oas3_2Tag, { report }: UserContext) {
        if (!tagNames)
          throw new Error(
            `Parameter "tagNames" is not provided for "tag-description-override" rule`
          );
        if (tagNames[tag.name]) {
          try {
            tag.description = readFileAsStringSync(tagNames[tag.name]);
          } catch (e) {
            report({
              message: `Failed to read markdown override file for tag "${tag.name}".\n${e.message}`,
            });
          }
        }
      },
    },
  };
};
