import { isPlainObject } from '../utils/is-plain-object.js';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';
import type { NodeType } from './index.js';
import type { JSONSchema } from 'json-schema-to-ts';

export const ENTITY_DISCRIMINATOR_NAME = 'type';

export function createEntityTypes(
  entitySchema: JSONSchema,
  entityDefaultSchema: JSONSchema
): Record<string, NodeType> {
  const defaultNodeTypes = getNodeTypesFromJSONSchema('EntityFileDefault', entityDefaultSchema);

  const namedNodeTypes = getNodeTypesFromJSONSchema('EntityFile', entitySchema);

  const arrayNodeType = {
    properties: {},
    items: (value: unknown) => {
      if (isPlainObject(value)) {
        const typeValue = value[ENTITY_DISCRIMINATOR_NAME];
        if (typeof typeValue === 'string' && namedNodeTypes[typeValue]) {
          return typeValue;
        }
      }
      return 'EntityFileDefault';
    },
  };

  return {
    ...defaultNodeTypes,
    ...namedNodeTypes,
    EntityFileArray: arrayNodeType,
  };
}
