import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Definition, Oas2Operation } from '../../typings/swagger.js';
import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Operation,
} from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;

export const OperationTagDefined: Oas3Rule | Oas2Rule = () => {
  let definedTags: Set<string>;

  return {
    Root(root: Oas2Definition | AnyOas3Definition) {
      definedTags = new Set((root.tags ?? []).map((t) => t.name));
    },
    Operation(operation: Oas2Operation | Oas3Operation, { report, location }: UserContext) {
      if (operation?.tags) {
        for (let i = 0; i < operation.tags.length; i++) {
          if (!definedTags.has(operation.tags[i])) {
            report({
              message: `Operation tags should be defined in global tags.`,
              location: location.child(['tags', i]),
            });
          }
        }
      } else {
        report({
          message: `Operation tags should be defined`,
          location: location.key(),
        });
      }
    },
  };
};
