import { listOf, mapOf, type NodeType } from './index.js';
import { Oas3_1Types } from './oas3_1.js';

const Root: NodeType = {
  ...Oas3_1Types.Root,
  properties: {
    $self: { type: 'string' },
  },
};

const Discriminator: NodeType = {
  ...Oas3_1Types.Discriminator,
  properties: {
    defaultMapping: { type: 'string' },
  },
};

const MediaType: NodeType = {
  ...Oas3_1Types.MediaType,
  properties: {
    itemSchema: 'Schema',
    prefixEncodingList: listOf('Encoding'),
    itemEncoding: 'Encoding',
  },
};

const DeviceAuthorization: NodeType = {
  properties: {
    deviceAuthorizationUrl: { type: 'string' },
    tokenUrl: { type: 'string' },
    refreshUrl: { type: 'string' },
    scopes: mapOf('string'),
  },
  required: ['deviceAuthorizationUrl', 'tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const OAuth2Flows: NodeType = {
  ...Oas3_1Types.OAuth2Flows,
  properties: {
    deviceAuthorization: 'DeviceAuthorization',
  },
};

const PathItem: NodeType = {
  ...Oas3_1Types.PathItem,
  properties: {
    query: 'Operation',
    additionalOperations: mapOf('Operation'),
  },
};

const Parameter: NodeType = {
  ...Oas3_1Types.Parameter,
  properties: {
    in: { enum: ['query', 'header', 'path', 'cookie', 'queryString'] },
  },
};

const Response: Omit<NodeType, 'required'> = {
  ...Oas3_1Types.Response,
  properties: {
    summary: { type: 'string' },
  },
};

const SecurityScheme: NodeType = {
  ...Oas3_1Types.SecurityScheme,
  properties: {
    deprecated: { type: 'boolean' },
    oauth2MetadataUrl: { type: 'string' },
  },
};

const Server: NodeType = {
  ...Oas3_1Types.Server,
  properties: {
    name: { type: 'string' },
  },
};

const Tag: NodeType = {
  ...Oas3_1Types.Tag,
  properties: {
    summary: { type: 'string' },
    kind: { type: 'string' },
    parent: { type: 'string' },
  },
};

export const Oas3_2Types = {
  ...Oas3_1Types,
  Discriminator,
  MediaType,
  OAuth2Flows,
  Parameter,
  PathItem,
  Response,
  Root,
  SecurityScheme,
  DeviceAuthorization,
  Server,
  Tag,
} as const;
