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

const SecurityScheme: NodeType = {
  ...Oas3_1Types.SecurityScheme,
  properties: {
    ...Oas3_1Types.SecurityScheme.properties,
    deprecated: { type: 'boolean' }, // added in OAS 3.2
    oauth2MetadataUrl: { type: 'string' }, // added in OAS 3.2
  },
  allowed(value) {
    switch (value?.type) {
      case 'apiKey':
        return [
          'type',
          'name',
          'in',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      case 'http':
        return [
          'type',
          'scheme',
          'bearerFormat',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      case 'oauth2':
        switch (value?.flows) {
          case 'implicit':
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
          case 'password':
          case 'clientCredentials':
            return [
              'type',
              'flows',
              'tokenUrl',
              'refreshUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
          case 'authorizationCode':
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
          default:
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
        }
      case 'openIdConnect':
        return [
          'type',
          'openIdConnectUrl',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      case 'mutualTLS':
        return [
          'type',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      default:
        return [
          'type',
          'description',
          'deprecated', // added in OAS 3.2
        ];
    }
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

const Parameter: NodeType = {
  ...Oas3_1Types.Parameter,
  properties: {
    ...Oas3_1Types.Parameter.properties,
    in: { enum: ['query', 'header', 'path', 'cookie', 'querystring'] },
  },
};

const Response: Omit<NodeType, 'required'> = {
  ...Oas3_1Types.Response,
  properties: {
    ...Oas3_1Types.Response.properties,
    summary: { type: 'string' },
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

const Discriminator: NodeType = {
  ...Oas3_1Types.Discriminator,
  properties: {
    ...Oas3_1Types.Discriminator.properties,
    defaultMapping: { type: 'string' },
  },
};

const Example: NodeType = {
  ...Oas3_1Types.Example,
  properties: {
    ...Oas3_1Types.Example.properties,
    dataValue: { isExample: true },
    serializedValue: { type: 'string' },
  },
};

export const Oas3_2Types = {
  ...Oas3_1Types,
  Root,
  Tag,
  Server,
  SecurityScheme,
  PathItem,
  Parameter,
  Response,
  MediaType,
  Discriminator,
  Example,
} as const;
