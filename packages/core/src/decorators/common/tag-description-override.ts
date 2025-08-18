import { readFileAsStringSync, resolveRelativePath } from '../../utils.js';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const TagDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ tagNames }) => {
  return {
    Tag: {
      leave(tag, { report, config }: UserContext) {
        if (!tagNames)
          throw new Error(
            `Parameter "tagNames" is not provided for "tag-description-override" rule`
          );
        const filePath = tagNames[tag.name];
        if (filePath) {
          try {
            tag.description = readFileAsStringSync(
              resolveRelativePath(filePath, config?.configPath)
            );
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
