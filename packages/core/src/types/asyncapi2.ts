import { listOf, mapOf } from './index.js';
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.0.0',
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
  documentationLink: 'https://v2.asyncapi.com/docs/concepts/channel',
};

const ChannelMap: NodeType = {
  properties: {},
  additionalProperties: 'Channel',
};

const ChannelBindings: NodeType = {
  properties: {},
  allowed() {
    // allow all supported values, not all have deep linting
    return [
      'http',
      'ws',
      'kafka',
      'anypointmq',
      'amqp',
      'amqp1',
      'mqtt',
      'mqtt5',
      'nats',
      'jms',
      'sns',
      'solace',
      'sqs',
      'stomp',
      'redis',
      'mercure',
      'ibmmq',
      'googlepubsub',
      'pulsar',
    ];
  },
  additionalProperties: { type: 'object' },
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#channelBindingsObject',
  description: 'Map describing protocol-specific definitions for a channel.',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#tagObject',
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#externalDocumentationObject',
  description: 'Allows referencing an external resource for extended documentation.',
};

const SecurityRequirement: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#securityRequirementObject',
  description:
    'Lists the required security schemes to execute this operation. The name used for each property MUST correspond to a security scheme declared in the Security Schemes under the Components Object.',
};

const ServerBindings: NodeType = {
  properties: {},
  allowed() {
    // allow all supported values, not all have deep linting
    return [
      'http',
      'ws',
      'kafka',
      'anypointmq',
      'amqp',
      'amqp1',
      'mqtt',
      'mqtt5',
      'nats',
      'jms',
      'sns',
      'solace',
      'sqs',
      'stomp',
      'redis',
      'mercure',
      'ibmmq',
      'googlepubsub',
      'pulsar',
    ];
  },
  additionalProperties: { type: 'object' },
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#serverBindingsObject',
  description: 'Map describing protocol-specific definitions for a server.',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#serverObject',
  description:
    'An object representing a message broker, a server or any other kind of computer program capable of sending and/or receiving data. This object is used to capture details such as URIs, protocols and security configuration. Variable substitution can be used so that some details, for example usernames and passwords, can be injected by code generation tools.',
};

export const ServerMap: NodeType = {
  properties: {},
  additionalProperties: (_value: any, key: string) =>
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#serverVariableObject',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#infoObject',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#contactObject',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#licenseObject',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#parameterObject',
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#correlationIdObject',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#messageObject',
  description: 'Describes a message received on a given channel and operation.',
};

const MessageBindings: NodeType = {
  properties: {},
  allowed() {
    // allow all supported values, not all have deep linting
    return [
      'http',
      'ws',
      'kafka',
      'anypointmq',
      'amqp',
      'amqp1',
      'mqtt',
      'mqtt5',
      'nats',
      'jms',
      'sns',
      'solace',
      'sqs',
      'stomp',
      'redis',
      'mercure',
      'ibmmq',
      'googlepubsub',
      'pulsar',
    ];
  },
  additionalProperties: { type: 'object' },
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#messageBindingsObject',
  description: 'Map describing protocol-specific definitions for a message.',
};

const OperationBindings: NodeType = {
  properties: {},
  allowed() {
    // allow all supported values, not all have deep linting
    return [
      'http',
      'ws',
      'kafka',
      'anypointmq',
      'amqp',
      'amqp1',
      'mqtt',
      'mqtt5',
      'nats',
      'jms',
      'sns',
      'solace',
      'sqs',
      'stomp',
      'redis',
      'mercure',
      'ibmmq',
      'googlepubsub',
      'pulsar',
    ];
  },
  additionalProperties: { type: 'object' },
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#operationBindingsObject',
  description: 'Map describing protocol-specific definitions for an operation.',
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#operationTraitObject',
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#messageTraitObject',
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
  documentationLink: 'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#operationObject',
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#messageExampleObject',
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
  documentationLink:
    'https://v2.asyncapi.com/docs/reference/specification/v2.6.0#securitySchemeObject',
  description: 'Defines a security scheme that can be used by the operations.',
};

// --- Per-protocol node types

// http
const HttpChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an HTTP channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/http/README.md#channel',
};
ChannelBindings.properties.http = HttpChannelBinding;

const HttpServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an HTTP server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/http#server',
};
ServerBindings.properties.http = HttpServerBinding;

const HttpMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an HTTP message, i.e., a request or a response.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/http/README.md#message',
};
MessageBindings.properties.http = HttpMessageBinding;

const HttpOperationBinding: NodeType = {
  properties: {
    type: { type: 'string' },
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'],
    },
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an HTTP operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/http/README.md#operation',
};
OperationBindings.properties.http = HttpOperationBinding;

// ws
const WsChannelBinding: NodeType = {
  properties: {
    method: { type: 'string' },
    query: 'Schema',
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a WebSockets channel.',
  documentationLink:
    'https://github.com/asyncapi/bindings/blob/master/websockets/README.md#channel',
};
ChannelBindings.properties.ws = WsChannelBinding;

const WsServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a WebSockets server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/websockets#server',
};
ServerBindings.properties.ws = WsServerBinding;

const WsMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a WebSockets message.',
  documentationLink:
    'https://github.com/asyncapi/bindings/blob/master/websockets/README.md#message',
};
MessageBindings.properties.ws = WsMessageBinding;

const WsOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a WebSockets operation.',
  documentationLink:
    'https://github.com/asyncapi/bindings/blob/master/websockets/README.md#operation',
};
OperationBindings.properties.ws = WsOperationBinding;

// kafka
const KafkaTopicConfiguration: NodeType = {
  properties: {
    'cleanup.policy': { type: 'array', items: { enum: ['delete', 'compact'] } },
    'retention.ms': { type: 'integer' },
    'retention.bytes': { type: 'integer' },
    'delete.retention.ms': { type: 'integer' },
    'max.message.bytes': { type: 'integer' },
  },
};
const KafkaChannelBinding: NodeType = {
  properties: {
    topic: { type: 'string' },
    partitions: { type: 'integer' },
    replicas: { type: 'integer' },
    topicConfiguration: 'KafkaTopicConfiguration',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/kafka/README.md#channel',
};
ChannelBindings.properties.kafka = KafkaChannelBinding;

const KafkaServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Kafka server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/kafka#server',
};
ServerBindings.properties.kafka = KafkaServerBinding;

const KafkaMessageBinding: NodeType = {
  properties: {
    key: 'Schema', // TODO: add avro support
    schemaIdLocation: { type: 'string' },
    schemaIdPayloadEncoding: { type: 'string' },
    schemaLookupStrategy: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/kafka/README.md#message',
};
MessageBindings.properties.kafka = KafkaMessageBinding;

const KafkaOperationBinding: NodeType = {
  properties: {
    groupId: 'Schema',
    clientId: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/kafka/README.md#operation',
};
OperationBindings.properties.kafka = KafkaOperationBinding;

// anypointmq
const AnypointmqChannelBinding: NodeType = {
  properties: {
    destination: { type: 'string' },
    destinationType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an Anypoint MQ channel.',
  documentationLink:
    'https://github.com/asyncapi/bindings/blob/master/anypointmq/README.md#channel',
};
ChannelBindings.properties.anypointmq = AnypointmqChannelBinding;

const AnypointmqServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an Anypoint MQ server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/anypointmq#server',
};
ServerBindings.properties.anypointmq = AnypointmqServerBinding;

const AnypointmqMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an Anypoint MQ message.',
  documentationLink:
    'https://github.com/asyncapi/bindings/blob/master/anypointmq/README.md#message',
};
MessageBindings.properties.anypointmq = AnypointmqMessageBinding;

const AnypointmqOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an Anypoint MQ operation.',
  documentationLink:
    'https://github.com/asyncapi/bindings/blob/master/anypointmq/README.md#operation',
};
OperationBindings.properties.anypointmq = AnypointmqOperationBinding;

// amqp
const AmqpChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 0-9-1 channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/amqp/README.md#channel',
};
ChannelBindings.properties.amqp = AmqpChannelBinding;

const AmqpServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 0-9-1 server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/amqp#server',
};
ServerBindings.properties.amqp = AmqpServerBinding;

const AmqpMessageBinding: NodeType = {
  properties: {
    contentEncoding: { type: 'string' },
    messageType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an AMQP 0-9-1 message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/amqp/README.md#message',
};
MessageBindings.properties.amqp = AmqpMessageBinding;

const AmqpOperationBinding: NodeType = {
  // TODO: some fields are subscribe only
  properties: {
    expiration: { type: 'integer' },
    userId: { type: 'string' },
    cc: { type: 'array', items: { type: 'string' } },
    priority: { type: 'integer' },
    deliveryMode: { type: 'integer' }, // TODO: enum: [1, 2]
    mandatory: { type: 'boolean' },
    bcc: { type: 'array', items: { type: 'string' } },
    replyTo: { type: 'string' },
    timestamp: { type: 'boolean' },
    ack: { type: 'boolean' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an AMQP 0-9-1 operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/amqp/README.md#operation',
};
OperationBindings.properties.amqp = AmqpOperationBinding;

// amqp1
const Amqp1ChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 1.0 channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/amqp1/README.md#channel',
};
ChannelBindings.properties.amqp1 = Amqp1ChannelBinding;

const Amqp1ServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 1.0 server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/amqp1#server',
};
ServerBindings.properties.amqp1 = Amqp1ServerBinding;

const Amqp1MessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Binding	Protocol-specific information for an AMQP 1.0 message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/amqp1/README.md#message',
};
MessageBindings.properties.amqp1 = Amqp1MessageBinding;

const Amqp1OperationBinding: NodeType = {
  properties: {}, // empty object,
  description: 'Protocol-specific information for an AMQP 1.0 operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/amqp1/README.md#operation',
};
OperationBindings.properties.amqp1 = Amqp1OperationBinding;

// mqtt
const MqttChannelBinding: NodeType = {
  properties: {
    qos: { type: 'integer' },
    retain: { type: 'boolean' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/mqtt/README.md#channel',
};
ChannelBindings.properties.mqtt = MqttChannelBinding;

const MqttServerBindingLastWill: NodeType = {
  properties: {
    topic: { type: 'string' },
    qos: { type: 'integer' },
    message: { type: 'string' },
    retain: { type: 'boolean' },
  },
};
const MqttServerBinding: NodeType = {
  properties: {
    clientId: { type: 'string' },
    cleanSession: { type: 'boolean' },
    lastWill: 'MqttServerBindingLastWill',
    keepAlive: { type: 'integer' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mqtt#server',
};
ServerBindings.properties.mqtt = MqttServerBinding;

const MqttMessageBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/mqtt/README.md#message',
};
MessageBindings.properties.mqtt = MqttMessageBinding;

const MqttOperationBinding: NodeType = {
  properties: {
    qos: { type: 'integer' },
    retain: { type: 'boolean' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/mqtt/README.md#operation',
};
OperationBindings.properties.mqtt = MqttOperationBinding;

// mqtt5
const Mqtt5ChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mqtt5#channel',
};
ChannelBindings.properties.mqtt5 = Mqtt5ChannelBinding;

const Mqtt5ServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mqtt5#server',
};
ServerBindings.properties.mqtt5 = Mqtt5ServerBinding;

const Mqtt5MessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/mqtt5/README.md#message',
};
MessageBindings.properties.mqtt5 = Mqtt5MessageBinding;

const Mqtt5OperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/mqtt5/README.md#operation',
};
OperationBindings.properties.mqtt5 = Mqtt5OperationBinding;

// nats
const NatsChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a NATS channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/nats/README.md#channel',
};
ChannelBindings.properties.nats = NatsChannelBinding;

const NatsServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a NATS server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/nats#server',
};
ServerBindings.properties.nats = NatsServerBinding;

const NatsMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a NATS message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/nats/README.md#message',
};
MessageBindings.properties.nats = NatsMessageBinding;

const NatsOperationBinding: NodeType = {
  properties: {
    queue: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a NATS operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/nats/README.md#operation',
};
OperationBindings.properties.nats = NatsOperationBinding;

// jms
const JmsChannelBinding: NodeType = {
  properties: {
    destination: { type: 'string' },
    destinationType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a JMS channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/jms/README.md#channel',
};
ChannelBindings.properties.jms = JmsChannelBinding;

const JmsServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a JMS server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/jms#server',
};
ServerBindings.properties.jms = JmsServerBinding;

const JmsMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a JMS message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/jms/README.md#message',
};
MessageBindings.properties.jms = JmsMessageBinding;

const JmsOperationBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a JMS operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/jms/README.md#operation',
};
OperationBindings.properties.jms = JmsOperationBinding;

// sns

// solace
const SolaceChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Solace channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/solace#channel',
};
ChannelBindings.properties.solace = SolaceChannelBinding;

const SolaceServerBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
    msgVpn: { type: 'string' },
  },
  description: 'Protocol-specific information for a Solace message.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/solace#message',
};
ServerBindings.properties.solace = SolaceServerBinding;

const SolaceMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Solace message.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/solace#message',
};
MessageBindings.properties.solace = SolaceMessageBinding;

const SolaceDestination: NodeType = {
  properties: {
    destinationType: { type: 'string', enum: ['queue', 'topic'] },
    deliveryMode: { type: 'string', enum: ['direct', 'persistent'] },
    'queue.name': { type: 'string' },
    'queue.topicSubscriptions': { type: 'array', items: { type: 'string' } },
    'queue.accessType': { type: 'string', enum: ['exclusive', 'nonexclusive'] },
    'queue.maxMsgSpoolSize': { type: 'string' },
    'queue.maxTtl': { type: 'string' },
    'topic.topicSubscriptions': { type: 'array', items: { type: 'string' } },
  },
};
const SolaceOperationBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
    destinations: listOf('SolaceDestination'),
  },
  description: 'Protocol-specific information for a Solace operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/solace#operation',
};
OperationBindings.properties.solace = SolaceOperationBinding;

// sqs

// stomp
const StompChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/stomp/README.md#channel',
};
ChannelBindings.properties.stomp = StompChannelBinding;

const StompServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/stomp#server',
};
ServerBindings.properties.stomp = StompServerBinding;

const StompMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP message.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/stomp/README.md#message',
};
MessageBindings.properties.stomp = StompMessageBinding;

const StompOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/blob/master/stomp/README.md#operation',
};
OperationBindings.properties.stomp = StompOperationBinding;

// redis
const RedisChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/redis#channel',
};
ChannelBindings.properties.redis = RedisChannelBinding;

const RedisServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/redis#server',
};
ServerBindings.properties.redis = RedisServerBinding;

const RedisMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis message.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/redis#message',
};
MessageBindings.properties.redis = RedisMessageBinding;

const RedisOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/redis#operation',
};
OperationBindings.properties.redis = RedisOperationBinding;

// mercure
const MercureChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure channel.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mercure#channel',
};
ChannelBindings.properties.mercure = MercureChannelBinding;

const MercureServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure server.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mercure#server',
};
ServerBindings.properties.mercure = MercureServerBinding;

const MercureMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure message.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mercure#message',
};
MessageBindings.properties.mercure = MercureMessageBinding;

const MercureOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure operation.',
  documentationLink: 'https://github.com/asyncapi/bindings/tree/master/mercure#operation',
};
OperationBindings.properties.mercure = MercureOperationBinding;

// ibmmq
// googlepubsub
// pulsar

// --- End per-protocol node types
export const AsyncApi2Bindings: Record<string, NodeType> = {
  HttpServerBinding,
  HttpChannelBinding,
  HttpMessageBinding,
  HttpOperationBinding,

  WsServerBinding,
  WsChannelBinding,
  WsMessageBinding,
  WsOperationBinding,

  KafkaServerBinding,
  KafkaTopicConfiguration,
  KafkaChannelBinding,
  KafkaMessageBinding,
  KafkaOperationBinding,

  AnypointmqServerBinding,
  AnypointmqChannelBinding,
  AnypointmqMessageBinding,
  AnypointmqOperationBinding,

  AmqpServerBinding,
  AmqpChannelBinding,
  AmqpMessageBinding,
  AmqpOperationBinding,

  Amqp1ServerBinding,
  Amqp1ChannelBinding,
  Amqp1MessageBinding,
  Amqp1OperationBinding,

  MqttServerBindingLastWill,
  MqttServerBinding,
  MqttChannelBinding,
  MqttMessageBinding,
  MqttOperationBinding,

  Mqtt5ServerBinding,
  Mqtt5ChannelBinding,
  Mqtt5MessageBinding,
  Mqtt5OperationBinding,

  NatsServerBinding,
  NatsChannelBinding,
  NatsMessageBinding,
  NatsOperationBinding,

  JmsServerBinding,
  JmsChannelBinding,
  JmsMessageBinding,
  JmsOperationBinding,

  SolaceServerBinding,
  SolaceChannelBinding,
  SolaceMessageBinding,
  SolaceDestination,
  SolaceOperationBinding,

  StompServerBinding,
  StompChannelBinding,
  StompMessageBinding,
  StompOperationBinding,

  RedisServerBinding,
  RedisChannelBinding,
  RedisMessageBinding,
  RedisOperationBinding,

  MercureServerBinding,
  MercureChannelBinding,
  MercureMessageBinding,
  MercureOperationBinding,

  ServerBindings,
  ChannelBindings,
  MessageBindings,
  OperationBindings,
};

export const AsyncApi2Types: Record<string, NodeType> = {
  ...AsyncApi2Bindings,
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
  MessageBindings,
  OperationBindings,
  OperationTrait,
  OperationTraitList: listOf('OperationTrait'),
  MessageTrait,
  MessageTraitList: listOf('MessageTrait'),
  MessageExampleList: listOf('MessageExample'),
  CorrelationId,
  Dependencies,
};
