import { listOf, mapOf, type NodeType } from './index.js';
import { Oas3Types } from './oas3.js';
import { Oas3_1Types } from './oas3_1.js';

const Root: NodeType = {
  ...Oas3_1Types.Root,
  properties: {
    ...Oas3_1Types.Root.properties,
    $self: { type: 'string' },
  },
};

const Tag: NodeType = {
  ...Oas3_1Types.Tag,
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
};

const Server: NodeType = {
  ...Oas3_1Types.Server,
  properties: {
    ...Oas3_1Types.Server.properties,
    name: { type: 'string' },
  },
};

const PathItem: NodeType = {
  ...Oas3Types.PathItem,
  properties: {
    ...Oas3Types.PathItem.properties,
    query: 'Operation',
    additionalOperations: mapOf('Operation'),
  },
};

const MediaType: NodeType = {
  ...Oas3_1Types.MediaType,
  properties: {
    ...Oas3_1Types.MediaType.properties,
    itemSchema: 'Schema',
    prefixEncodingList: listOf('Encoding'),
    itemEncoding: 'Encoding',
  },
};

export const Oas3_2Types = {
  ...Oas3_1Types,
  Root,
  Tag,
  Server,
  PathItem,
  MediaType,
} as const;
