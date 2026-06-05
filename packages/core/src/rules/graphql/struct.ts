import { buildASTSchema, GraphQLError, validateSchema, type DocumentNode } from 'graphql';

import type { GraphqlRule, GraphqlUserContext } from '../../graphql/visitor.js';

// Structural validity for GraphQL SDL: builds the schema from the AST and runs
// the schema-validity checks (undefined types, duplicate fields, missing root, ...).
export const Struct: GraphqlRule = () => {
  return {
    Document: {
      enter: (node: DocumentNode, ctx: GraphqlUserContext) => {
        let schema;
        try {
          schema = buildASTSchema(node, { assumeValidSDL: false });
        } catch (e) {
          reportThrown(e, ctx);
          return;
        }

        for (const error of validateSchema(schema)) {
          reportGraphqlError(error, ctx);
        }
      },
    },
  };
};

function reportThrown(e: unknown, ctx: GraphqlUserContext) {
  if (e instanceof GraphQLError) {
    reportGraphqlError(e, ctx);
  } else if (e instanceof Error) {
    // `buildASTSchema` aggregates SDL validation errors into a single Error.
    ctx.report({ message: e.message });
  } else {
    throw e;
  }
}

function reportGraphqlError(error: GraphQLError, ctx: GraphqlUserContext) {
  const loc = error.locations?.[0];
  ctx.report({
    message: error.message,
    node: error.nodes?.[0],
    loc: loc ? { start: { line: loc.line, col: loc.column } } : undefined,
  });
}
