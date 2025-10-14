import type { Oas3Rule } from '../../visitors.js';
import type { Oas3_2Tag } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const TagParents: Oas3Rule = () => {
  let tags: Oas3_2Tag[];
  return {
    Root: {
      enter(root) {
        tags = root.tags ?? [];
      },
    },
    Tag: {
      leave(tag: Oas3_2Tag, { report, location }: UserContext) {
        if (tag?.parent === undefined) {
          return;
        }

        if (!tags.find((t) => t.name === tag.parent)) {
          report({
            message: `Tag parent '${tag.parent}' is not defined in the API description.`,
            location: location.child('parent'),
          });
          return;
        }
        const visited = new Set<string>(tag.name);
        let currentParent: string | undefined = tag.parent;
        while (currentParent !== undefined) {
          if (visited.has(currentParent)) {
            report({
              message: `Circular reference detected in tag parent hierarchy for tag '${tag.name}'.`,
              location: location.child('parent'),
            });
            break;
          }
          visited.add(currentParent);
          currentParent = tags.find((t) => t.name === currentParent)?.parent;
        }
      },
    },
  };
};
