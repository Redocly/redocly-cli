import { getTagName } from '../utils.js';
import type { Async2Rule, Async3Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoDuplicatedTagNames: Oas3Rule | Oas2Rule | Async2Rule | Async3Rule = ({
  ignoreCase = false,
}) => {
  const tagNames = new Set<string>();

  return {
    Tag: {
      leave(tag: { name: string }, ctx: UserContext) {
        const tagName = getTagName(tag, ignoreCase);

        if (tagNames.has(tagName)) {
          ctx.report({
            message: `Duplicate tag name found: '${tag.name}'.`,
            location: ctx.location,
          });
        } else {
          tagNames.add(tagName);
        }
      },
    },
  };
};
