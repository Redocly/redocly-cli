import type { Oas3Definition, Oas3_1Definition, Oas3_2Definition } from '../../typings/openapi.js';
import type { Oas2Definition } from '../../typings/swagger.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { getTagName } from '../utils.js';

type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;

export const TagsAlphabetical: Oas3Rule | Oas2Rule = ({ ignoreCase = false }) => {
  return {
    Root(root: Oas2Definition | AnyOas3Definition, { report, location }: UserContext) {
      if (!root.tags) return;
      for (let i = 0; i < root.tags.length - 1; i++) {
        if (getTagName(root.tags[i], ignoreCase) > getTagName(root.tags[i + 1], ignoreCase)) {
          report({
            message: 'The `tags` array should be in alphabetical order.',
            location: location.child(['tags', i]),
          });
        }
      }
    },
  };
};
