import { AsyncApiBindings } from './asyncapi-bindings.js';
import { listOf, mapOf, type NodeType } from './index.js';
import {
  Dependencies,
  Discriminator,
  DiscriminatorMapping,
  Schema,
  SchemaProperties,
} from './json-schema-draft7.shared.js';

const Root: NodeType = {
  properties: {
    asyncapi: null, // TODO: validate semver format and supported version
    info: 'Info',
    id: {
      type: 'string',
      description: 'Identifier of the application the AsyncAPI document is defining.',
    },
    servers: 'ServerMap',
    channels: 'ChannelMap',
    components: 'Components',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    defaultContentType: { type: 'string' },
  },
  required: ['asyncapi', 'channels', 'info'],
};

const Channel: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'An optional description of this channel item. CommonMark syntax can be used for rich text representation.',
    },
    subscribe: 'Operation',
    publish: 'Operation',
    parameters: 'ParametersMap',
    bindings: 'ChannelBindings',
    servers: {
      type: 'array',
      items: { type: 'string' },
      description:
        'The servers on which this channel is available, specified as an optional unordered list of names (string keys) of Server Objects defined in the Servers Object (a map).',
    },
  },
  description: 'Describes the operations available on a single channel.',
};

const ChannelMap: NodeType = {
  properties: {},
  additionalProperties: 'Channel',
};

export const Tag: NodeType = {
  properties: {
    name: { type: 'string', description: 'REQUIRED. The name of the tag.' },
    description: {
      type: 'string',
      description:
        'A short description for the tag. CommonMark syntax can be used for rich text representation.',
    },
    externalDocs: 'ExternalDocs',
  },
  required: ['name'],
  description: 'Allows adding meta data to a single tag.',
};

export const ExternalDocs: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'A short description of the target documentation. CommonMark syntax can be used for rich text representation.',
    },
    url: {
      type: 'string',
      description:
        'REQUIRED. The URL for the target documentation. This MUST be in the form of an absolute URL.',
    },
  },
  required: ['url'],
  description: 'Allows referencing an external resource for extended documentation.',
};

const SecurityRequirement: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
  description:
    'Lists the required security schemes to execute this operation. The name used for each property MUST correspond to a security scheme declared in the Security Schemes under the Components Object.',
};

const Server: NodeType = {
  properties: {
    url: {
      type: 'string',
      description:
        'REQUIRED. A URL to the target host. This URL supports Server Variables and MAY be relative, to indicate that the host location is relative to the location where the AsyncAPI document is being served. Variable substitutions will be made when a variable is named in {braces}.',
    },
    protocol: {
      type: 'string',
      description:
        'REQUIRED. The protocol this URL supports for connection. Supported protocol include, but are not limited to: amqp, amqps, http, https, ibmmq, jms, kafka, kafka-secure, anypointmq, mqtt, secure-mqtt, solace, stomp, stomps, ws, wss, mercure, googlepubsub, pulsar.',
    },
    protocolVersion: {
      type: 'string',
      description:
        'The version of the protocol used for connection. For instance: AMQP 0.9.1, HTTP 2.0, Kafka 1.0.0, etc.',
    },
    description: {
      type: 'string',
      description:
        'An optional string describing the host designated by the URL. CommonMark syntax MAY be used for rich text representation.',
    },
    variables: 'ServerVariablesMap',
    security: 'SecurityRequirementList',
    bindings: 'ServerBindings',
    tags: 'TagList',
  },
  required: ['url', 'protocol'],
  description:
    'An object representing a message broker, a server or any other kind of computer program capable of sending and/or receiving data. This object is used to capture details such as URIs, protocols and security configuration. Variable substitution can be used so that some details, for example usernames and passwords, can be injected by code generation tools.',
};

export const ServerMap: NodeType = {
  properties: {},
  additionalProperties: (_value: unknown, key: string) =>
    // eslint-disable-next-line no-useless-escape
    key.match(/^[A-Za-z0-9_\-]+$/) ? 'Server' : undefined,
};

export const ServerVariable: NodeType = {
  properties: {
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
    description: {
      type: 'string',
      description:
        'An optional description for the server variable. CommonMark syntax MAY be used for rich text representation.',
    },
    examples: {
      type: 'array',
      items: { type: 'string' },
      description: 'An array of examples of the server variable.',
    },
  },
  required: [],
  description: 'An object representing a Server Variable for server URL template substitution.',
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
  },
  required: ['title', 'version'],
  description:
    'The object provides metadata about the API. The metadata can be used by the clients if needed.',
};

export const Contact: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'The identifying name of the contact person/organization.',
    },
    url: {
      type: 'string',
      description:
        'The URL pointing to the contact information. This MUST be in the form of an absolute URL.',
    },
    email: {
      type: 'string',
      description:
        'The email address of the contact person/organization. MUST be in the format of an email address.',
    },
  },
  description: 'Contact information for the exposed API.',
};

export const License: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'REQUIRED. The license name used for the API.',
    },
    url: {
      type: 'string',
      description:
        'A URL to the license used for the API. This MUST be in the form of an absolute URL.',
    },
  },
  required: ['name'],
  description: 'License information for the exposed API.',
};

const Parameter: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'A verbose explanation of the parameter. CommonMark syntax can be used for rich text representation.',
    },
    schema: 'Schema',
    location: {
      type: 'string',
      description:
        'A runtime expression that specifies the location of the parameter value. Even when a definition for the target field exists, it MUST NOT be used to validate this parameter but, instead, the schema property MUST be used.',
    },
  },
  description: 'Describes a parameter included in a channel name.',
};

export const CorrelationId: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'An optional description of the identifier. CommonMark syntax can be used for rich text representation.',
    },
    location: {
      type: 'string',
      description:
        'REQUIRED. A runtime expression that specifies the location of the correlation ID.',
    },
  },
  required: ['location'],
  description:
    'An object that specifies an identifier at design time that can used for message tracing and correlation.',
};

const Message: NodeType = {
  properties: {
    messageId: {
      type: 'string',
      description:
        'Unique string used to identify the message. The id MUST be unique among all messages described in the API. The messageId value is case-sensitive. Tools and libraries MAY use the messageId to uniquely identify a message, therefore, it is RECOMMENDED to follow common programming naming conventions.',
    },
    headers: 'Schema',
    payload: 'Schema', // TODO: strictly this does not cover all cases
    correlationId: 'CorrelationId',

    schemaFormat: {
      type: 'string',
      description:
        'A string containing the name of the schema format used to define the message payload. If omitted, implementations should parse the payload as a Schema object. When the payload is defined using a $ref to a remote file, it is RECOMMENDED the schema format includes the file encoding type to allow implementations to parse the file correctly.',
    }, // TODO: support official list of schema formats and custom values
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
  description: 'Describes a message received on a given channel and operation.',
};

const OperationTrait: NodeType = {
  properties: {
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
    operationId: {
      type: 'string',
      description:
        'Unique string used to identify the operation. The id MUST be unique among all operations described in the API. The operationId value is case-sensitive. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.',
    },
    security: 'SecurityRequirementList',

    bindings: 'OperationBindings',
  },
  required: [],
  description:
    'Describes a trait that MAY be applied to an Operation Object. This object MAY contain any property from the Operation Object, except message and traits.',
};

const MessageTrait: NodeType = {
  properties: {
    messageId: {
      type: 'string',
      description:
        'Unique string used to identify the message. The id MUST be unique among all messages described in the API. The messageId value is case-sensitive. Tools and libraries MAY use the messageId to uniquely identify a message, therefore, it is RECOMMENDED to follow common programming naming conventions.',
    },
    headers: 'Schema',
    correlationId: 'CorrelationId',

    schemaFormat: {
      type: 'string',
      description:
        'A string containing the name of the schema format/language used to define the message payload. If omitted, implementations should parse the payload as a Schema object.',
    },
    contentType: {
      type: 'string',
      description: `The content type to use when encoding/decoding a message's payload. The value MUST be a specific media type (e.g. application/json). When omitted, the value MUST be the one specified on the defaultContentType field.`,
    },
    name: {
      type: 'string',
      description:
        'A verbose explanation of the message. CommonMark syntax can be used for rich text representation.',
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
  description:
    'Describes a trait that MAY be applied to a Message Object. This object MAY contain any property from the Message Object, except payload and traits.',
};

const Operation: NodeType = {
  properties: {
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
    operationId: {
      type: 'string',
      description:
        'Unique string used to identify the operation. The id MUST be unique among all operations described in the API. The operationId value is case-sensitive. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.',
    },
    security: 'SecurityRequirementList',

    bindings: 'OperationBindings',
    traits: 'OperationTraitList',
    message: 'Message',
  },
  required: [],
  description:
    'Describes a publish or a subscribe operation. This provides a place to document how and why messages are sent and received.',
};

export const MessageExample: NodeType = {
  properties: {
    payload: {
      isExample: true,
      description: `The value of this field MUST validate against the Message Object's payload field.`,
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the example is about.',
    },
    name: {
      type: 'string',
      description: 'A machine-friendly name.',
    },
    headers: {
      type: 'object',
      description: `The value of this field MUST validate against the Message Object's headers field.`,
    },
  },
  description:
    'Message Example Object represents an example of a Message Object and MUST contain either headers and/or payload fields.',
};

const Components: NodeType = {
  properties: {
    messages: 'NamedMessages',
    parameters: 'NamedParameters',
    schemas: 'NamedSchemas',
    correlationIds: 'NamedCorrelationIds',
    messageTraits: 'NamedMessageTraits',
    operationTraits: 'NamedOperationTraits',
    securitySchemes: 'NamedSecuritySchemes',
    servers: 'ServerMap',
    serverVariables: 'ServerVariablesMap',
    channels: 'ChannelMap',
    serverBindings: 'ServerBindings',
    channelBindings: 'ChannelBindings',
    operationBindings: 'OperationBindings',
    messageBindings: 'MessageBindings',
  },
};

const ImplicitFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'scopes'],
  description: 'Configuration for the OAuth Implicit flow.',
};

const PasswordFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
  description: 'Configuration for the OAuth Password flow.',
};

const ClientCredentials: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
  description: 'Configuration for the OAuth Client Credentials flow.',
};

const AuthorizationCode: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'tokenUrl', 'scopes'],
  description: 'Configuration for the OAuth Authorization Code flow.',
};

export const SecuritySchemeFlows: NodeType = {
  properties: {
    implicit: 'ImplicitFlow',
    password: 'PasswordFlow',
    clientCredentials: 'ClientCredentials',
    authorizationCode: 'AuthorizationCode',
  },
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
        return ['type', 'flows', 'description'];
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl', 'description'];
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
  description: 'Defines a security scheme that can be used by the operations.',
};

export const AsyncApi2Types: Record<string, NodeType> = {
  ...AsyncApiBindings,
  Root,
  Tag,
  TagList: listOf('Tag'),
  ServerMap,
  ExternalDocs,
  Server,
  ServerVariable,
  ServerVariablesMap: mapOf('ServerVariable'),
  SecurityRequirement,
  SecurityRequirementList: listOf('SecurityRequirement'),
  Info,
  Contact,
  License,
  ChannelMap,
  Channel,
  Parameter,
  ParametersMap: mapOf('Parameter'),
  Operation,
  Schema,
  MessageExample,
  SchemaProperties,
  DiscriminatorMapping,
  Discriminator,
  Components,
  NamedSchemas: mapOf('Schema'),
  NamedMessages: mapOf('Message'),
  NamedMessageTraits: mapOf('MessageTrait'),
  NamedOperationTraits: mapOf('OperationTrait'),
  NamedParameters: mapOf('Parameter'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  NamedCorrelationIds: mapOf('CorrelationId'),
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  SecuritySchemeFlows,
  SecurityScheme,
  Message,
  OperationTrait,
  OperationTraitList: listOf('OperationTrait'),
  MessageTrait,
  MessageTraitList: listOf('MessageTrait'),
  MessageExampleList: listOf('MessageExample'),
  CorrelationId,
  Dependencies,
};
