import { Oas3Rule, Oas2Rule } from '../../visitors';
import { Oas2Definition } from '../../typings/swagger';
import { Oas3Definition } from '../../typings/openapi';
import { UserContext } from '../../walk';

export const TagsAlphabetical: Oas3Rule | Oas2Rule = () => {
  return {
    DefinitionRoot(root: Oas2Definition | Oas3Definition, { report, location }: UserContext) {
      if (!root.tags) return;
      for (let i = 0; i < root.tags.length - 1; i++) {
        if (root.tags[i].name > root.tags[i + 1].name) {
          report({
            message: 'The `tags` array should be in alphabetical order.',
            location: location.child(['tags', i]),
          });
        }
      }
    },
  };
};
