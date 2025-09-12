import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';

export const ExclusiveMinimumMaximum: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      leave(schema, ctx) {
        // Only relevant for OpenAPI 3.1 where exclusiveMinimum/Maximum are numbers
        if (ctx.specVersion !== 'oas3_1') return;

        if ('exclusiveMinimum' in schema && typeof schema.exclusiveMinimum !== 'number') {
          ctx.report({
            message: `In OpenAPI 3.1 the \`exclusiveMinimum\` field must be a number. Replace boolean usage with a numeric bound, for example \`exclusiveMinimum: <minimum>\`.`,
            location: ctx.location.child(['exclusiveMinimum']),
          });
        }

        if ('exclusiveMaximum' in schema && typeof schema.exclusiveMaximum !== 'number') {
          ctx.report({
            message: `In OpenAPI 3.1 the \`exclusiveMaximum\` field must be a number. Replace boolean usage with a numeric bound, for example \`exclusiveMaximum: <maximum>\`.`,
            location: ctx.location.child(['exclusiveMaximum']),
          });
        }
      },
    },
  };
};
