import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';

export const NullableTypeSibling: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      leave(schema, ctx) {
        if ('nullable' in schema && !('type' in schema)) {
          ctx.report({
            message: `The \`type\` field must be defined when the \`nullable\` field is used.`,
            location: ctx.location.child(['nullable']),
          });
        }
      },
    },
  };
};
