import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { entityNodeTypes } from './entity-types.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType } from './index.js';

export const ENTITY_DISCRIMINATOR_NAME = 'type';
export const TYPES_OF_ENTITY = ['api-description', 'api-operation'];

/**
 * Enhances an entity NodeType by overriding metadata and relations properties
 * to use typed EntityMetadata and EntityRelations nodes
 */
function enhanceEntityNodeType(nodeType: NodeType): NodeType {
  if (!nodeType?.properties) {
    return nodeType;
  }

  return {
    ...nodeType,
    properties: {
      ...nodeType.properties,
      ...('metadata' in nodeType.properties && { metadata: 'EntityMetadata' }),
      ...('relations' in nodeType.properties && { relations: 'EntityRelations' }),
    },
  };
}

/**
 * Enhances all entity types in a record by overriding metadata and relations properties
 */
function enhanceEntityTypes(types: Record<string, NodeType>): Record<string, NodeType> {
  return Object.fromEntries(
    Object.entries(types).map(([name, nodeType]) => [name, enhanceEntityNodeType(nodeType)])
  );
}

export function createEntityTypes(
  entitySchema: JSONSchema,
  entityDefaultSchema: JSONSchema
): Record<string, NodeType> {
  const defaultNodeTypes = getNodeTypesFromJSONSchema('EntityFileDefault', entityDefaultSchema);
  const namedNodeTypes = getNodeTypesFromJSONSchema('EntityFile', entitySchema);

  const arrayNodeType: NodeType = {
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

  // Merge custom entity node types with schema-generated types
  // This ensures properties like 'metadata' and 'relations' are recognized as typed nodes
  return {
    ...enhanceEntityTypes(defaultNodeTypes),
    ...enhanceEntityTypes(namedNodeTypes),
    ...entityNodeTypes,
    EntityFileArray: arrayNodeType,
  };
}
