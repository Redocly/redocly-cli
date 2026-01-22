import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType, ResolveTypeFn } from './index.js';

export const ENTITY_DISCRIMINATOR_PROPERTY_NAME = 'type';
export const API_TYPES_OF_ENTITY = ['api-description', 'api-operation', 'data-schema'];

export function createEntityTypes(
  entitySchema: JSONSchema,
  entityDefaultSchema: JSONSchema
): {
  entityTypes: Record<string, NodeType>;
  discriminatorFunc?: ResolveTypeFn;
} {
  const { ctx: defaultNodeTypes } = getNodeTypesFromJSONSchema(
    'EntityFileDefault',
    entityDefaultSchema
  );

  const { ctx: namedNodeTypes, discriminatorFunc: namedDiscriminatorFunc } =
    getNodeTypesFromJSONSchema('EntityFile', entitySchema);

  const arrayNodeType = {
    properties: {},
    items: namedDiscriminatorFunc,
  };

  return {
    entityTypes: {
      ...defaultNodeTypes,
      ...namedNodeTypes,
      EntityFileArray: arrayNodeType,
    },
    discriminatorFunc: namedDiscriminatorFunc,
  };
}
