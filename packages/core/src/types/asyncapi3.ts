import { listOf, mapOf } from './index.js';
import {
  AsyncApi2Bindings,
  CorrelationId,
  Tag,
  ServerMap,
  ExternalDocs,
  SecuritySchemeFlows,
  ServerVariable,
  Contact,
  License,
  MessageExample,
} from './asyncapi2.js';
import {
  Dependencies,
  Discriminator,
  DiscriminatorMapping,
  Schema,
  SchemaProperties,
} from './json-schema-draft7.shared.js';

import type { NodeType } from './index.js';

const Root: NodeType = {
  properties: {
    asyncapi: {
      type: 'string',
      enum: ['3.0.0'],
      description:
        'REQUIRED. Specifies the AsyncAPI Specification version being used. It can be used by tooling Specifications and clients to interpret the version. The structure shall be major.minor.patch, where patch versions must be compatible with the existing major.minor tooling. Typically patch versions will be introduced to address errors in the documentation, and tooling should typically be compatible with the corresponding major.minor (1.0.*). Patch versions will correspond to patches of this document.',
      documentationLink:
        'https://www.asyncapi.com/docs/reference/specification/v3.0.0#A2SVersionString',
    },
    info: 'Info',
    id: {
      type: 'string',
      description: 'Identifier of the application the AsyncAPI document is defining.',
      documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#A2SIdString',
    },
    servers: 'ServerMap',
    channels: 'NamedChannels',
    components: 'Components',
    operations: 'NamedOperations',
    defaultContentType: {
      type: 'string',
      description: `Default content type to use when encoding/decoding a message's payload.`,
      documentationLink:
        'https://www.asyncapi.com/docs/reference/specification/v3.0.0#defaultContentTypeString',
    },
  },
  required: ['asyncapi', 'info'],
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#A2SObject',
  description:
    'This is the root document object for the API specification. It combines resource listing and API declaration together into one document.',
};

const Channel: NodeType = {
  properties: {
    address: {
      type: 'string',
      description: `An optional string representation of this channel's address. The address is typically the "topic name", "routing key", "event type", or "path". When null or absent, it MUST be interpreted as unknown. This is useful when the address is generated dynamically at runtime or can't be known upfront. It MAY contain Channel Address Expressions. Query parameters and fragments SHALL NOT be used, instead use bindings to define them.`,
    },
    messages: 'NamedMessages',
    title: {
      type: 'string',
      description: 'A human-friendly title for the channel.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of the channel.',
    },
    description: {
      type: 'string',
      description:
        'An optional description of this channel. CommonMark syntax can be used for rich text representation.',
    },
    servers: 'ServerList',
    parameters: 'ParametersMap',
    bindings: 'ChannelBindings',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
  },
  description: 'Describes a shared communication channel.',
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#channelObject',
};

const Server: NodeType = {
  properties: {
    host: {
      type: 'string',
      description:
        'REQUIRED. The server host name. It MAY include the port. This field supports Server Variables. Variable substitutions will be made when a variable is named in {braces}.',
    },
    pathname: {
      type: 'string',
      description:
        'The path to a resource in the host. This field supports Server Variables. Variable substitutions will be made when a variable is named in {braces}.',
    },
    protocol: {
      type: 'string',
      description: 'REQUIRED. The protocol this server supports for connection.',
    },
    protocolVersion: {
      type: 'string',
      description:
        'The version of the protocol used for connection. For instance: AMQP 0.9.1, HTTP 2.0, Kafka 1.0.0, etc.',
    },
    description: {
      type: 'string',
      description:
        'An optional string describing the server. CommonMark syntax MAY be used for rich text representation.',
    },
    variables: 'ServerVariablesMap',
    security: 'SecuritySchemeList',
    bindings: 'ServerBindings',
    externalDocs: 'ExternalDocs',
    tags: 'TagList',
  },
  required: ['host', 'protocol'],
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#serverObject',
  description:
    'An object representing a message broker, a server or any other kind of computer program capable of sending and/or receiving data. This object is used to capture details such as URIs, protocols and security configuration. Variable substitution can be used so that some details, for example usernames and passwords, can be injected by code generation tools.',
};

const Info: NodeType = {
  properties: {
    title: {
      type: 'string',
      description: 'REQUIRED. The title of the application.',
    },
    version: {
      type: 'string',
      description:
        'REQUIRED Provides the version of the application API (not to be confused with the specification version).',
    },
    description: {
      type: 'string',
      description:
        'A short description of the application. CommonMark syntax can be used for rich text representation.',
    },
    termsOfService: {
      type: 'string',
      description:
        'A URL to the Terms of Service for the API. This MUST be in the form of an absolute URL.',
    },
    contact: 'Contact',
    license: 'License',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
  },
  required: ['title', 'version'],
  description:
    'The object provides metadata about the API. The metadata can be used by the clients if needed.',
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#infoObject',
};

const Parameter: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'An optional description for the parameter. CommonMark syntax MAY be used for rich text representation.',
    },
    enum: {
      type: 'array',
      items: { type: 'string' },
      description:
        'An enumeration of string values to be used if the substitution options are from a limited set.',
    },
    default: {
      type: 'string',
      description:
        'The default value to use for substitution, and to send, if an alternate value is not supplied.',
    },
    examples: {
      type: 'array',
      items: { type: 'string' },
      description: 'An array of examples of the parameter value.',
    },
    location: {
      type: 'string',
      description: 'A runtime expression that specifies the location of the parameter value.',
    },
  },
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#parameterObject',
  description: 'Describes a parameter included in a channel address.',
};

const Message: NodeType = {
  properties: {
    headers: 'Schema',
    payload: (value: Record<string, unknown>) => {
      if (!!value && value?.['schemaFormat']) {
        return {
          properties: {
            schema: 'Schema',
            schemaFormat: { type: 'string' },
          },
          required: ['schema', 'schemaFormat'],
        };
      } else {
        return 'Schema';
      }
    },
    correlationId: 'CorrelationId',

    contentType: {
      type: 'string',
      description: `The content type to use when encoding/decoding a message's payload. The value MUST be a specific media type (e.g. application/json). When omitted, the value MUST be the one specified on the defaultContentType field.`,
    },
    name: {
      type: 'string',
      description: 'A machine-friendly name for the message.',
    },
    title: {
      type: 'string',
      description: 'A human-friendly title for the message.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the message is about.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the message. CommonMark syntax can be used for rich text representation.',
    },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    bindings: 'MessageBindings',
    examples: 'MessageExampleList',
    traits: 'MessageTraitList',
  },
  additionalProperties: {},
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#messageObject',
  description: 'Describes a message received on a given channel and operation.',
};

const OperationTrait: NodeType = {
  properties: {
    tags: 'TagList',
    title: {
      type: 'string',
      description: 'A human-friendly title for the operation.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the operation is about.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the operation. CommonMark syntax can be used for rich text representation.',
    },
    externalDocs: 'ExternalDocs',
    security: 'SecuritySchemeList',

    bindings: 'OperationBindings',
  },
  required: [],
  documentationLink:
    'https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationTraitObject',
  description:
    'Describes a trait that MAY be applied to an Operation Object. This object MAY contain any property from the Operation Object, except the action, channel, messages and traits ones.',
};

const MessageTrait: NodeType = {
  properties: {
    headers: (value: unknown) => {
      if (typeof value === 'function' || (typeof value === 'object' && !!value)) {
        return {
          properties: {
            schema: 'Schema',
            schemaFormat: { type: 'string' },
          },
        };
      } else {
        return 'Schema';
      }
    },
    correlationId: 'CorrelationId',

    contentType: {
      type: 'string',
      description: `The content type to use when encoding/decoding a message's payload. The value MUST be a specific media type (e.g. application/json). When omitted, the value MUST be the one specified on the defaultContentType field.`,
    },
    name: {
      type: 'string',
      description: 'A machine-friendly name for the message.',
    },
    title: {
      type: 'string',
      description: 'A human-friendly title for the message.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the message is about.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the message. CommonMark syntax can be used for rich text representation.',
    },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    bindings: 'MessageBindings',
    examples: 'MessageExampleList',
  },
  additionalProperties: {},
  documentationLink:
    'https://www.asyncapi.com/docs/reference/specification/v3.0.0#messageTraitObject',
  description:
    'Describes a trait that MAY be applied to a Message Object. This object MAY contain any property from the Message Object, except payload and traits.',
};

const Operation: NodeType = {
  properties: {
    action: {
      type: 'string',
      enum: ['send', 'receive'],
      description: `Required. Use send when it's expected that the application will send a message to the given channel, and receive when the application should expect receiving messages from the given channel.`,
    },
    channel: 'Channel',
    title: {
      type: 'string',
      description: 'A human-friendly title for the operation.',
    },
    tags: 'TagList',
    summary: {
      type: 'string',
      description: 'A short summary of what the operation is about.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the operation. CommonMark syntax can be used for rich text representation.',
    },
    externalDocs: 'ExternalDocs',
    operationId: { type: 'string' },
    security: 'SecuritySchemeList',

    bindings: 'OperationBindings',
    traits: 'OperationTraitList',
    messages: 'MessageList',
    reply: 'OperationReply',
  },
  required: ['action', 'channel'],
  documentationLink: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationObject',
  description: 'https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationObject',
};

const OperationReply: NodeType = {
  properties: {
    channel: 'Channel',
    messages: 'MessageList',
    address: 'OperationReplyAddress',
  },
  documentationLink:
    'https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationReplyObject',
  description:
    'Describes the reply part that MAY be applied to an Operation Object. If an operation implements the request/reply pattern, the reply object represents the response message.',
};

const OperationReplyAddress: NodeType = {
  properties: {
    location: {
      type: 'string',
      description:
        'REQUIRED. A runtime expression that specifies the location of the reply address.',
    },
    description: {
      type: 'string',
      description:
        'An optional description of the address. CommonMark syntax can be used for rich text representation.',
    },
  },
  required: ['location'],
  documentationLink:
    'https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationReplyAddressObject',
  description: 'An object that specifies where an operation has to send the reply.',
};

const Components: NodeType = {
  properties: {
    messages: 'NamedMessages',
    parameters: 'NamedParameters',
    schemas: 'NamedSchemas',
    replies: 'NamedOperationReplies',
    replyAddresses: 'NamedOperationRelyAddresses',
    correlationIds: 'NamedCorrelationIds',
    messageTraits: 'NamedMessageTraits',
    operationTraits: 'NamedOperationTraits',
    tags: 'NamedTags',
    externalDocs: 'NamedExternalDocs',
    securitySchemes: 'NamedSecuritySchemes',
    servers: 'ServerMap',
    serverVariables: 'ServerVariablesMap',
    channels: 'NamedChannels',
    operations: 'NamedOperations',
    serverBindings: 'ServerBindings',
    channelBindings: 'ChannelBindings',
    operationBindings: 'OperationBindings',
    messageBindings: 'MessageBindings',
  },
  documentationLink:
    'https://www.asyncapi.com/docs/reference/specification/v3.0.0#componentsObject',
  description:
    'Holds a set of reusable objects for different aspects of the AsyncAPI specification. All objects defined within the components object will have no effect on the API unless they are explicitly referenced from properties outside the components object.',
};

const ImplicitFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'availableScopes'],
  description: 'Configuration for the OAuth Implicit flow.',
};

const PasswordFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'availableScopes'],
  description: 'Configuration for the OAuth Resource Owner Protected Credentials flow.',
};

const ClientCredentials: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'availableScopes'],
  description: 'Configuration for the OAuth Client Credentials flow.',
};

const AuthorizationCode: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    tokenUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'tokenUrl', 'availableScopes'],
  description: 'Configuration for the OAuth Authorization Code flow.',
};

const SecurityScheme: NodeType = {
  properties: {
    type: {
      enum: [
        'userPassword',
        'apiKey',
        'X509',
        'symmetricEncryption',
        'asymmetricEncryption',
        'httpApiKey',
        'http',
        'oauth2',
        'openIdConnect',
        'plain',
        'scramSha256',
        'scramSha512',
        'gssapi',
      ],
      description:
        'REQUIRED. The type of the security scheme. Valid values are "userPassword", "apiKey", "X509", "symmetricEncryption", "asymmetricEncryption", "httpApiKey", "http", "oauth2", "openIdConnect", "plain", "scramSha256", "scramSha512", and "gssapi".',
    },
    description: {
      type: 'string',
      description:
        'A short description for security scheme. CommonMark syntax MAY be used for rich text representation.',
    },
    name: {
      type: 'string',
      description: 'REQUIRED. The name of the header, query or cookie parameter to be used.',
    },
    in: {
      type: 'string',
      enum: ['query', 'header', 'cookie', 'user', 'password'],
      description:
        'REQUIRED. The location of the API key. Valid values are "user" and "password" for apiKey and "query", "header" or "cookie" for httpApiKey.',
    },
    scheme: {
      type: 'string',
      description:
        'REQUIRED. The name of the HTTP Authorization scheme to be used in the Authorization header as defined in RFC7235.',
    },
    bearerFormat: {
      type: 'string',
      description:
        'A hint to the client to identify how the bearer token is formatted. Bearer tokens are usually generated by an authorization server, so this information is primarily for documentation purposes.',
    },
    flows: 'SecuritySchemeFlows',
    openIdConnectUrl: {
      type: 'string',
      description:
        'REQUIRED. OpenId Connect URL to discover OAuth2 configuration values. This MUST be in the form of an absolute URL.',
    },
    scopes: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of the needed scope names. An empty array means no scopes are needed.',
    },
  },
  required(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'in'];
      case 'httpApiKey':
        return ['type', 'name', 'in'];
      case 'http':
        return ['type', 'scheme'];
      case 'oauth2':
        return ['type', 'flows'];
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl'];
      default:
        return ['type'];
    }
  },
  allowed(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'in', 'description'];
      case 'httpApiKey':
        return ['type', 'name', 'in', 'description'];
      case 'http':
        return ['type', 'scheme', 'bearerFormat', 'description'];
      case 'oauth2':
        return ['type', 'flows', 'description', 'scopes'];
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl', 'description', 'scopes'];
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
  documentationLink:
    'https://www.asyncapi.com/docs/reference/specification/v3.0.0#securitySchemeObject',
  description: 'Defines a security scheme that can be used by the operations.',
};

export const AsyncApi3Types: Record<string, NodeType> = {
  // from asyncapi2
  ...AsyncApi2Bindings,
  CorrelationId,
  SecuritySchemeFlows,
  ServerVariable,
  Contact,
  License,
  MessageExample,
  Tag,
  Dependencies,
  Schema,
  Discriminator,
  DiscriminatorMapping,
  SchemaProperties,
  ServerMap,
  ExternalDocs,
  Root,
  Channel,
  Parameter,
  Info,
  Server,
  MessageTrait,
  Operation,
  OperationReply,
  OperationReplyAddress,
  Components,
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  SecurityScheme,
  Message,
  OperationTrait,
  ServerVariablesMap: mapOf('ServerVariable'),
  NamedTags: mapOf('Tag'),
  NamedExternalDocs: mapOf('ExternalDocs'),
  NamedChannels: mapOf('Channel'),
  ParametersMap: mapOf('Parameter'),
  NamedOperations: mapOf('Operation'),
  NamedOperationReplies: mapOf('OperationReply'),
  NamedOperationRelyAddresses: mapOf('OperationReplyAddress'),
  NamedSchemas: mapOf('Schema'),
  NamedMessages: mapOf('Message'),
  NamedMessageTraits: mapOf('MessageTrait'),
  NamedOperationTraits: mapOf('OperationTrait'),
  NamedParameters: mapOf('Parameter'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  NamedCorrelationIds: mapOf('CorrelationId'),
  ServerList: listOf('Server'),
  SecuritySchemeList: listOf('SecurityScheme'),
  MessageList: listOf('Message'),
  OperationTraitList: listOf('OperationTrait'),
  MessageTraitList: listOf('MessageTrait'),
  MessageExampleList: listOf('MessageExample'),
  TagList: listOf('Tag'),
};
