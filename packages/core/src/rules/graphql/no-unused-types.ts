import type {
  DirectiveDefinitionNode,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  NameNode,
  ObjectTypeDefinitionNode,
  SchemaDefinitionNode,
  TypeNode,
  UnionTypeDefinitionNode,
} from 'graphql';

import type { GraphqlRule } from '../../graphql/visitor.js';

const DEFAULT_ROOT_TYPES = ['Query', 'Mutation', 'Subscription'];

// Unwrap `[T!]!` / `[T]` / `T!` down to the underlying named type.
function namedTypeName(type: TypeNode): string {
  let current = type;
  while (current.kind === 'ListType' || current.kind === 'NonNullType') {
    current = current.type;
  }
  return current.name.value;
}

export const NoUnusedTypes: GraphqlRule = () => {
  const declarations = new Map<string, NameNode>();
  const used = new Set<string>();
  const roots = new Set<string>();
  let hasExplicitSchema = false;

  const markUsed = (type: TypeNode) => used.add(namedTypeName(type));

  const declare = (node: { name: NameNode }) => declarations.set(node.name.value, node.name);

  // Definitions and extensions share a name, so both contribute references.
  const collectFieldedType = (node: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) => {
    for (const iface of node.interfaces ?? []) {
      markUsed(iface);
    }
    for (const field of node.fields ?? []) {
      markUsed(field.type);
      for (const arg of field.arguments ?? []) {
        markUsed(arg.type);
      }
    }
  };

  const collectUnion = (node: UnionTypeDefinitionNode) => {
    for (const member of node.types ?? []) {
      markUsed(member);
    }
  };

  const collectInputObject = (node: InputObjectTypeDefinitionNode) => {
    for (const field of node.fields ?? []) {
      markUsed(field.type);
    }
  };

  const collectSchema = (node: SchemaDefinitionNode) => {
    hasExplicitSchema = true;
    for (const operation of node.operationTypes ?? []) {
      roots.add(operation.type.name.value);
    }
  };

  return {
    SchemaDefinition: collectSchema,
    SchemaExtension: collectSchema,
    DirectiveDefinition: (node: DirectiveDefinitionNode) => {
      for (const arg of node.arguments ?? []) {
        markUsed(arg.type);
      }
    },

    ObjectTypeDefinition: (node) => {
      declare(node);
      collectFieldedType(node);
    },
    ObjectTypeExtension: collectFieldedType,
    InterfaceTypeDefinition: (node) => {
      declare(node);
      collectFieldedType(node);
    },
    InterfaceTypeExtension: collectFieldedType,
    UnionTypeDefinition: (node) => {
      declare(node);
      collectUnion(node);
    },
    UnionTypeExtension: collectUnion,
    InputObjectTypeDefinition: (node) => {
      declare(node);
      collectInputObject(node);
    },
    InputObjectTypeExtension: collectInputObject,
    EnumTypeDefinition: declare,
    ScalarTypeDefinition: declare,

    Document: {
      leave: (_node, ctx) => {
        if (!hasExplicitSchema) {
          for (const name of DEFAULT_ROOT_TYPES) {
            if (declarations.has(name)) roots.add(name);
          }
        }

        // Without an entry point, "unused" is undefined: report nothing.
        if (roots.size === 0) return;

        for (const [name, nameNode] of declarations) {
          if (used.has(name) || roots.has(name)) continue;
          ctx.report({
            message: `Type \`${name}\` is declared but never used.`,
            node: nameNode,
          });
        }
      },
    },
  };
};
