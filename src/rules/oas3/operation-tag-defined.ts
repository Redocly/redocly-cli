import { Oas3Rule } from '../../visitors';

export const OperationTagDefined: Oas3Rule = () => {
  let definedTags: Set<string>;

  return {
    DefinitionRoot(root) {
      definedTags = new Set((root.tags ?? []).map((t) => t.name));
    },
    Operation(operation, { report, location }) {
      if (operation.tags) {
        for (let i = 0; i < operation.tags.length; i++) {
          if (!definedTags.has(operation.tags[i])) {
            report({
              message: `Operation tags should be defined in global tags.`,
              location: location.child(['tags', i]),
            });
          }
        }
      }
    },
  };
};
