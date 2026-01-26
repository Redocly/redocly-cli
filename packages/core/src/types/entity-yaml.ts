import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType, ResolveTypeFn } from './index.js';

export const ENTITY_DISCRIMINATOR_PROPERTY_NAME = 'type';
export const ENTITY_TYPES_WITH_API_SUPPORT = ['api-description', 'api-operation', 'data-schema'];

export function createEntityTypes(
  entitySchema: JSONSchema,
  entityDefaultSchema: JSONSchema
): {
  entityTypes: Record<string, NodeType>;
  discriminatorResolver?: ResolveTypeFn;
} {
  const { ctx: defaultNodeTypes } = getNodeTypesFromJSONSchema(
    'EntityFileDefault',
    entityDefaultSchema
  );

  const { ctx: namedNodeTypes, discriminatorResolver: namedDiscriminatorResolver } =
    getNodeTypesFromJSONSchema('EntityFile', entitySchema);

  const arrayNodeType = {
    properties: {},
    items: namedDiscriminatorResolver,
  };

  return {
    entityTypes: {
      ...defaultNodeTypes,
      ...namedNodeTypes,
      EntityFileArray: arrayNodeType,
    },
    discriminatorResolver: namedDiscriminatorResolver,
  };
}
