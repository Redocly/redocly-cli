import { NodeType, listOf, mapOf } from '.';
import { isMappingRef } from '../ref-utils';

const Root: NodeType = {
  properties: {
    asyncapi: null,
    info: 'Info',
    id: { type: 'string' },
    servers: 'ServeMap',
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
    description: { type: 'string' },
    subscribe: 'Operation',
    publish: 'Operation',
    parameters: 'ParametersMap',
    bindings: 'ChannelBindingsMap',
    servers: { type: 'array', items: { type: 'string' } },
  },
};

const ChannelMap: NodeType = {
  properties: {},
  additionalProperties: 'Channel',
};

const ChannelBinding: NodeType = {
  properties: {},
};

const Tag: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
  },
  required: ['name'],
};

const ExternalDocs: NodeType = {
  properties: {
    description: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['url'],
};

const SecurityRequirement: NodeType = {
  // done
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

const HttpServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const WsServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const KafkaServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const AmqpServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const Amqp1ServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
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
};
const Mqtt5ServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const NatsServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const JmsServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const SnsServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const SqsServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const StompServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};
const RedisServerBinding: NodeType = {
  properties: {}, // some way to enforce empty object
};

const ServerBindings: NodeType = {
  properties: {
    http: 'HttpServerBinding',
    ws: 'WsServerBinding',
    kafka: 'KafkaServerBinding',
    amqp: 'AmqpServerBinding',
    amqp1: 'Amqp1ServerBinding',
    mqtt: 'MqttServerBinding',
    mqtt5: 'Mqtt5ServerBinding',
    nats: 'NatsServerBinding',
    jms: 'JmsServerBinding',
    sns: 'SnsServerBinding',
    sqs: 'SqsServerBinding',
    stomp: 'StompServerBinding',
    redis: 'RedisServerBinding',
  },
  additionalProperties: { type: 'object' },
};

const Server: NodeType = {
  properties: {
    url: { type: 'string' },
    protocol: { type: 'string' },
    protocolVersion: { type: 'string' },
    description: { type: 'string' },
    variables: 'ServerVariablesMap',
    security: 'SecurityRequirementList',
    bindings: 'ServerBindings',
    tags: 'TagList',
  },
  required: ['url', 'protocol'],
};

const ServeMap: NodeType = {
  properties: {},
  additionalProperties: (_value: any, key: string) =>
    key.match(/^[A-Za-z0-9_\-]+$/) ? 'Server' : undefined,
};

const ServerVariable: NodeType = {
  // done
  properties: {
    enum: {
      type: 'array',
      items: { type: 'string' },
    },
    default: { type: 'string' },
    description: { type: 'string' },
    examples: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [],
};

const Info: NodeType = {
  // done
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
  },
  required: ['title', 'version'],
};

const Contact: NodeType = {
  // done
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    email: { type: 'string' },
  },
};

const License: NodeType = {
  // done
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['name'],
};

const Parameter: NodeType = {
  properties: {
    description: { type: 'string' },
    schema: 'Schema',
    location: { type: 'string' },
  },
};

const CorrelationId: NodeType = {
  properties: {}, // TODO
  additionalProperties: {},
}

const Message: NodeType = {
  properties: {
    messageId: { type: 'string' },
    headers: 'Schema',
    // payload: 'Schema', // TODO
    correlationId: 'CorrelationId',

    schemaFormat: { type: 'string' }, // todo
    contentType: { type: 'string' },
    name: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    // bindings: 'MessageBindingsMap', TODO
    // examples: 'MessageExampleList', // TODO
    traits: 'MessageTraitList',
     // TODO
  },
  additionalProperties: {},
};

const OperationBinding: NodeType = {
  properties: {}, // TODO
  additionalProperties: {},
};

const OperationTrait: NodeType = {
  properties: {}, // TODO
  additionalProperties: {},
};

const MessageTrait: NodeType = {
  properties: {}, // TODO
  additionalProperties: {},
};

const Operation: NodeType = {
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    operationId: { type: 'string' },
    security: 'SecurityRequirementList',

    bindings: 'OperationBindingsMap',
    traits: 'OperationTraitList',
    message: 'Message',

    'x-codeSamples': 'XCodeSampleList',
  },
  required: [],
};

const XCodeSample: NodeType = {
  properties: {
    lang: { type: 'string' },
    label: { type: 'string' },
    source: { type: 'string' },
  },
};
const MessageExample: NodeType = {
  properties: {
    payload: { isExample: true },
    summary: { type: 'string' },
    name: { type: 'string' },
    headers: { type: 'object' },
  },
};

const Link: NodeType = {
  properties: {
    operationRef: { type: 'string' },
    operationId: { type: 'string' },
    parameters: null, // TODO: figure out how to describe/validate this
    requestBody: null, // TODO: figure out how to describe/validate this
    description: { type: 'string' },
    server: 'Server',
  },
};

const Schema: NodeType = {
  properties: {
    $id: { type: 'string' },
    id: { type: 'string' },
    $schema: { type: 'string' },
    definitions: 'NamedSchemas',
    $defs: 'NamedSchemas',
    $vocabulary: { type: 'string' },
    externalDocs: 'ExternalDocs',
    discriminator: 'Discriminator',
    myArbitraryKeyword: { type: 'boolean' },
    title: { type: 'string' },
    multipleOf: { type: 'number', minimum: 0 },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'number' },
    exclusiveMinimum: { type: 'number' },
    maxLength: { type: 'integer', minimum: 0 },
    minLength: { type: 'integer', minimum: 0 },
    pattern: { type: 'string' },
    maxItems: { type: 'integer', minimum: 0 },
    minItems: { type: 'integer', minimum: 0 },
    uniqueItems: { type: 'boolean' },
    maxProperties: { type: 'integer', minimum: 0 },
    minProperties: { type: 'integer', minimum: 0 },
    required: { type: 'array', items: { type: 'string' } },
    enum: { type: 'array' },
    type: (value: any) => {
      if (Array.isArray(value)) {
        return {
          type: 'array',
          items: { enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'] },
        };
      } else {
        return {
          enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
        };
      }
    },
    allOf: listOf('Schema'),
    anyOf: listOf('Schema'),
    oneOf: listOf('Schema'),
    not: 'Schema',
    if: 'Schema',
    then: 'Schema',
    else: 'Schema',
    dependentSchemas: listOf('Schema'),
    prefixItems: listOf('Schema'),
    contains: 'Schema',
    minContains: { type: 'integer', minimum: 0 },
    maxContains: { type: 'integer', minimum: 0 },
    patternProperties: { type: 'object' },
    propertyNames: 'Schema',
    unevaluatedItems: 'Schema',
    unevaluatedProperties: (value: unknown) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    summary: { type: 'string' },
    properties: 'SchemaProperties',
    items: (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    additionalProperties: (value: any) => {
      return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
    },
    description: { type: 'string' },
    format: { type: 'string' },
    contentEncoding: { type: 'string' },
    contentMediaType: { type: 'string' },
    default: null,
    readOnly: { type: 'boolean' },
    writeOnly: { type: 'boolean' },
    // xml: 'Xml',
    examples: { type: 'array' },
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    const: null,
    $comment: { type: 'string' },
    dependencies: { type: 'object' }, // TODO
  },
};

const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }
    return 'Schema';
  }
};

const DiscriminatorMapping: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (isMappingRef(value)) {
      return { type: 'string', directResolveAs: 'Schema' };
    } else {
      return { type: 'string' };
    }
  },
};

const Discriminator: NodeType = {
  properties: {
    propertyName: { type: 'string' },
    mapping: 'DiscriminatorMapping',
  },
  required: ['propertyName'],
};

const Components: NodeType = {
  properties: {
    messages: 'NamedMessages',
    parameters: 'NamedParameters',
    schemas: 'NamedSchemas',
    correlationIds: 'NamedCorrelationIds',
    messageTraits: 'NamedMessageTraits',
    operationTraits: 'NamedOperationTraits',
    streamHeaders: 'NamedStreamHeaders',
    securitySchemes: 'NamedSecuritySchemes',
  },
};

const ImplicitFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'scopes'],
};

const PasswordFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
};

const ClientCredentials: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
};

const AuthorizationCode: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'tokenUrl', 'scopes'],
};

const SecuritySchemeFlows: NodeType = {
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
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie', 'user', 'password'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'SecuritySchemeFlows',
    openIdConnectUrl: { type: 'string' },
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
};

export const AsyncApi2Types: Record<string, NodeType> = {
  Root,
  Tag,
  TagList: listOf('Tag'),
  ServeMap,
  ExternalDocs,
  Server,
  ServerVariable,
  ServerVariablesMap: mapOf('ServerVariable'),
  SecurityRequirement,
  SecurityRequirementList: listOf('SecurityRequirement'),
  Info,
  Contact,
  License,

  HttpServerBinding,
  WsServerBinding,
  KafkaServerBinding,
  AmqpServerBinding,
  Amqp1ServerBinding,
  MqttServerBindingLastWill,
  MqttServerBinding,
  Mqtt5ServerBinding,
  NatsServerBinding,
  JmsServerBinding,
  SnsServerBinding,
  SqsServerBinding,
  StompServerBinding,
  RedisServerBinding,
  ServerBindings,
  ChannelBinding,
  ChannelMap,
  Channel,
  ChannelBindingsMap: mapOf('ChannelBinding'),
  Parameter,
  ParametersMap: mapOf('Parameter'),
  Operation,
  Link,
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
  NamedStreamHeaders: mapOf('StreamHeader'),
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  SecuritySchemeFlows,
  SecurityScheme,
  XCodeSample,
  XCodeSampleList: listOf('XCodeSample'),
  Message,
  OperationBinding,
  OperationBindingsMap: mapOf('OperationBinding'),
  OperationTrait,
  OperationTraitList: listOf('OperationTrait'),
  MessageTrait,
  MessageTraitList: listOf('MessageTrait'),
  CorrelationId,
};
