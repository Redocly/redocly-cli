import type { NameNode } from 'graphql';

import type { GraphqlRule, GraphqlUserContext } from '../../graphql/visitor.js';

type TypeDefinitionNode = {
  name: NameNode;
  description?: { value: string };
};

export const TypeDescription: GraphqlRule = () => {
  const checkDescription = (node: TypeDefinitionNode, ctx: GraphqlUserContext) => {
    if (!node.description || node.description.value.trim() === '') {
      ctx.report({
        message: `Type \`${node.name.value}\` should have a non-empty description.`,
        node: node.name,
      });
    }
  };

  return {
    ObjectTypeDefinition: checkDescription,
    InterfaceTypeDefinition: checkDescription,
    EnumTypeDefinition: checkDescription,
    InputObjectTypeDefinition: checkDescription,
    UnionTypeDefinition: checkDescription,
    ScalarTypeDefinition: checkDescription,
  };
};
