import type { NameNode } from 'graphql';

import type { GraphqlRule, GraphqlUserContext } from '../../graphql/visitor.js';

type NamedTypeNode = {
  name: NameNode;
};

const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

export const TypePascalCase: GraphqlRule = () => {
  const checkName = (node: NamedTypeNode, ctx: GraphqlUserContext) => {
    const name = node.name.value;
    if (!PASCAL_CASE.test(name)) {
      ctx.report({
        message: `Type \`${name}\` should be in PascalCase.`,
        node: node.name,
      });
    }
  };

  return {
    ObjectTypeDefinition: checkName,
    InterfaceTypeDefinition: checkName,
    EnumTypeDefinition: checkName,
    InputObjectTypeDefinition: checkName,
    UnionTypeDefinition: checkName,
    ScalarTypeDefinition: checkName,
  };
};
