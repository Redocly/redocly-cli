import { getTagName } from '../utils.js';

import type { Oas3Definition, Oas3_1Definition } from '../../typings/openapi.js';
import type { Oas2Definition } from '../../typings/swagger.js';
import type { Async2Rule, Async3Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const TagsDuplicatedNames: Oas3Rule | Oas2Rule | Async2Rule | Async3Rule = ({
  ignoreCase = false,
}) => {
  const tagNames = new Set<string>();

  return {
    Tag: {
      leave(
        tag: { name: string },
        ctx: UserContext,
        root: Oas2Definition | Oas3Definition | Oas3_1Definition
      ) {
        if (!root.tags) return;

        const tagName = getTagName(tag, ignoreCase);
        const index = root.tags.findIndex((t) => t === tag);

        if (tagNames.has(tagName)) {
          ctx.report({
            message: `Duplicate tag name found: '${tag.name}'`,
            location: ctx.location.child(['tags', index]),
          });
        } else {
          tagNames.add(tagName);
        }
      },
    },
  };
};
