import { entityFileSchema } from '@redocly/config';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType } from './index.js';

export function createEntityTypes(entityFileSchema: JSONSchema) {
  const entitySchemaTypes = getNodeTypesFromJSONSchema('entityFileSchema', entityFileSchema);
  const entitiesSchemaTypes = getNodeTypesFromJSONSchema('entitiesFilesSchema', {
    type: 'array',
    items: entityFileSchema,
  });

  return {
    EntityFileTypes: entitySchemaTypes.entityFileSchema,
    EntitiesFileTypes: entitiesSchemaTypes.entitiesFilesSchema,
  };
}

export const EntityTypes: Record<string, NodeType> = createEntityTypes(entityFileSchema);
