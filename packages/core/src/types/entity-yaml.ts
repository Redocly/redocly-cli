import { entityFileSchema } from '@redocly/config';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType } from './index.js';

export function createEntityTypes(entityFileSchema: JSONSchema) {
  const entityFileSchemaTypes = getNodeTypesFromJSONSchema('entityFileSchema', {
    oneOf: [
      entityFileSchema,
      {
        type: 'array',
        items: entityFileSchema,
      },
    ],
  });

  return {
    EntityFileTypes: entityFileSchemaTypes.entityFileSchema,
  };
}

export const EntityTypes: Record<string, NodeType> = createEntityTypes(entityFileSchema);
