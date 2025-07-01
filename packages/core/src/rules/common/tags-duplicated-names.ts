import { getTagName } from '../utils.js';

import type { Oas3Definition, Oas3_1Definition } from '../../typings/openapi.js';
import type { Oas2Definition } from '../../typings/swagger.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const TagsDuplicatedNames: Oas3Rule | Oas2Rule = ({ ignoreCase = false }) => {
  return {
    Root(
      root: Oas2Definition | Oas3Definition | Oas3_1Definition,
      { report, location }: UserContext
    ) {
      if (!root.tags) return;
      const tagNames = new Set<string>();
      for (let i = 0; i < root.tags.length; i++) {
        const tagName = getTagName(root.tags[i], ignoreCase);
        if (tagNames.has(tagName)) {
          report({
            message: `Duplicate tag name found: '${root.tags[i].name}'`,
            location: location.child(['tags', i]),
          });
        } else {
          tagNames.add(tagName);
        }
      }
    },
  };
};
