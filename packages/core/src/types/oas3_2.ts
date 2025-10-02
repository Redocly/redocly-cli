import { mapOf, type NodeType } from './index.js';
import { Oas3Types } from './oas3.js';
import { Oas3_1Types } from './oas3_1.js';

const Tag: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    'x-traitTag': { type: 'boolean' },
    'x-displayName': { type: 'string' }, // deprecated
    kind: { type: 'string' },
    parent: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const PathItem: NodeType = {
  ...Oas3Types.PathItem,
  properties: {
    ...Oas3Types.PathItem.properties,
    query: 'Operation',
    additionalOperations: mapOf('Operation'),
  },
};

export const Oas3_2Types = {
  ...Oas3_1Types,
  Tag,
  PathItem,
} as const;
