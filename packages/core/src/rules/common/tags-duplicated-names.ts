import { getTagName } from '../utils.js';

import type { Oas3Definition, Oas3_1Definition } from '../../typings/openapi.js';
import type { Oas2Definition } from '../../typings/swagger.js';
import type { Async2Rule, Async3Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const TagsDuplicatedNames: Oas3Rule | Oas2Rule | Async2Rule | Async3Rule = ({
  ignoreCase = false,
}) => {
  return {
    Root(
      root: Oas2Definition | Oas3Definition | Oas3_1Definition,
      { report, location }: UserContext
    ) {
      if (!root.tags) return;
      const tagNames = new Set<string>();
      for (const [i, tag] of root.tags.entries()) {
        const tagName = getTagName(tag, ignoreCase);
        if (tagNames.has(tagName)) {
          report({
            message: `Duplicate tag name found: '${tag.name}'`,
            location: location.child(['tags', i]),
          });
        } else {
          tagNames.add(tagName);
        }
      }
    },
  };
};
