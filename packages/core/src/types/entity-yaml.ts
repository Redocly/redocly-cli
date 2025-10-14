import { entityFileSchema } from '@redocly/config';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType } from './index.js';

export function createEntityTypes(entityFileSchema: JSONSchema) {
  const entityFileSchemaTypes = getNodeTypesFromJSONSchema('entityFileSchema', entityFileSchema);

  return {
    EntityFileTypes: entityFileSchemaTypes.entityFileSchema,
  };
}

export const EntityTypes: Record<string, NodeType> = createEntityTypes(entityFileSchema);
