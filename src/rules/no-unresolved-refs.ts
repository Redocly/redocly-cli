import { Oas3Rule } from '../visitors';
import { YamlParseError } from '../resolve';

export const NoUnresolvedRefs: Oas3Rule = () => {
  return {
    ref(_, { report }, resolved) {
      if (resolved.node !== undefined) return;
      const error = resolved.error;
      if (error instanceof YamlParseError) {
        report({
          message: 'Failed to parse: ' + error.message,
          location: {
            source: error.source,
            pointer: undefined,
            start: {
              col: error.col,
              line: error.line,
            },
          },
        });
      }

      report({
        message: `Can't resolve $ref: ${resolved.error?.message}`,
      });
    },
  };
};
