import type { JSONSchema } from 'json-schema-to-ts';

import { isPlainObject } from '../utils/is-plain-object.js';
import type { NodeType, ResolveTypeFn } from './index.js';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';

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
    items: (value: unknown) => {
      if (isPlainObject(value)) {
        const typeValue = value[ENTITY_DISCRIMINATOR_PROPERTY_NAME] as string | undefined;

        if (!typeValue) return 'Entity';

        const resolvedType = namedDiscriminatorResolver?.(value, typeValue);

        if (resolvedType && typeof resolvedType === 'string') {
          return resolvedType;
        }
      }
      return 'Entity';
    },
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
