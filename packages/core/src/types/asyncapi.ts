import { NodeType, listOf, mapOf } from '.';
import { isMappingRef } from '../ref-utils';

const Root: NodeType = {
  properties: {
    asyncapi: null, // TODO validate semver format and supported version
    info: 'Info',
    id: { type: 'string' },
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
    description: { type: 'string' },
    subscribe: 'Operation',
    publish: 'Operation',
    parameters: 'ParametersMap',
    bindings: 'ChannelBindings',
    servers: { type: 'array', items: { type: 'string' } },
  },
};

const ChannelMap: NodeType = {
  properties: {},
  additionalProperties: 'Channel',
};

const ChannelBindings: NodeType = {
  properties: {
  },
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


const ServerBindings: NodeType = {
  properties: {
  },
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

const ServerMap: NodeType = {
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
  properties: {
    description: { type: 'string' },
    location: { type: 'string' },
    },
  required: ['location'],
}

const Message: NodeType = {
  properties: {
    messageId: { type: 'string' },
    headers: 'Schema',
    payload: 'Schema', // TODO strictly this does not cover all cases
    correlationId: 'CorrelationId',

    schemaFormat: { type: 'string' }, // todo
    contentType: { type: 'string' },
    name: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    bindings: 'MessageBindings',
    // examples: 'MessageExampleList', // TODO
    traits: 'MessageTraitList',
  },
  additionalProperties: {},
};

const MessageBindings: NodeType = {
  properties: {
  },
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
  properties: {
    messageId: { type: 'string' },
    headers: 'Schema',
    correlationId: 'CorrelationId',

    schemaFormat: { type: 'string' }, // todo
    contentType: { type: 'string' },
    name: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    bindings: 'MessageBindings',
    // examples: 'MessageExampleList', // TODO
  },
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
  },
  required: [],
};

const MessageExample: NodeType = {
  properties: {
    payload: { isExample: true },
    summary: { type: 'string' },
    name: { type: 'string' },
    headers: { type: 'object' },
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
    servers: 'ServerMap',
    serverVariables: 'ServerVariablesMap',
    channels: 'ChannelMap',
    serverBindings: 'ServerBindings',
    channelBindings: 'ChannelBindings',
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

// --- Per-protocol node types

// http
const HttpChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.http = HttpChannelBinding;

const HttpServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.http = HttpServerBinding;

const HttpMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  }
}
MessageBindings.properties.http = HttpMessageBinding;

// ws
const WsChannelBinding: NodeType = {
  properties: {
    method: { type: 'string' },
    query: 'Schema',
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
};
ChannelBindings.properties.ws = WsChannelBinding;

const WsServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.ws = WsServerBinding;

const WsMessageBinding: NodeType = {
  properties: {}, // empty object
};
MessageBindings.properties.ws = WsMessageBinding;

// kafka
const KafkaTopicConfiguration: NodeType = {
  properties: {
    'cleanup.policy': { type: 'array', items: { enum: ['delete', 'compact'] }},
    'retention.ms': { type: 'integer' },
    'retention.bytes': {type: 'integer' },
    'delete.retention.ms': {type: 'integer' },
    'max.message.bytes': {type: 'integer' },
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
};
ChannelBindings.properties.kafka = KafkaChannelBinding;

const KafkaServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.kafka = KafkaServerBinding;

const KafkaMessageBinding: NodeType = {
  properties: {
    key: 'Schema', // TODO add avro support
    schemaIdLocation: { type: 'string' },
    schemaIdPayloadEncoding: { type: 'string' },
    schemaLookupStrategy: { type: 'string' },
    bindingVersion: { type: 'string' },
  }
}
MessageBindings.properties.kafka = KafkaMessageBinding;

// anypointmq
const AnypointmqChannelBinding: NodeType = {
  properties: {
    destination: { type: 'string' },
    destinationType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
};
ChannelBindings.properties.anypointmq = AnypointmqChannelBinding;

const AnypointmqServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.anypointmq = AnypointmqServerBinding;

const AnypointmqMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  }
}
MessageBindings.properties.anypointmq = AnypointmqMessageBinding;

// amqp
const AmqpChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.amqp = AmqpChannelBinding;

const AmqpServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.amqp = AmqpServerBinding;

const AmqpMessageBinding: NodeType = {
  properties: {
    contentEncoding: { type: 'string' },
    messageType: { type: 'string' },
    bindingVersion: { type: 'string' },
  }
}
MessageBindings.properties.amqp = AmqpMessageBinding;

// amqp1
const Amqp1ChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.amqp1 = Amqp1ChannelBinding;

const Amqp1ServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.amqp1 = Amqp1ServerBinding;

const Amqp1MessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.amqp1 = Amqp1MessageBinding;

// mqtt
const MqttChannelBinding: NodeType = {
  properties: {
    qos: { type: 'integer' },
    retain: { type: 'boolean' },
    bindingVersion: { type: 'string' },
  },
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
};
ServerBindings.properties.mqtt = MqttServerBinding;

const MqttMessageBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
  },
}
MessageBindings.properties.mqtt = MqttMessageBinding;


// mqtt5
const Mqtt5ChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.mqtt5 = Mqtt5ChannelBinding;

const Mqtt5ServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.mqtt5 = Mqtt5ServerBinding;

const Mqtt5MessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.mqtt5 = Mqtt5MessageBinding;

// nats
const NatsChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.nats = NatsChannelBinding;

const NatsServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.nats = NatsServerBinding;

const NatsMessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.nats = NatsMessageBinding;

// jms
const JmsChannelBinding: NodeType = {
  properties: {
    destination: { type: 'string' },
    destinationType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
};
ChannelBindings.properties.jms = JmsChannelBinding;

const JmsServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.jms = JmsServerBinding;

const JmsMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  }
}
MessageBindings.properties.jms = JmsMessageBinding;

// sns

// solace
const SolaceChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.solace = SolaceChannelBinding;

const SolaceServerBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
    msgVpn: { type: 'string' },
  },
};
ServerBindings.properties.solace = SolaceServerBinding;

const SolaceMessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.solace = SolaceMessageBinding;

// sqs

// stomp
const StompChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.stomp = StompChannelBinding;

const StompServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.stomp = StompServerBinding;

const StompMessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.stomp = StompMessageBinding;

// redis
const RedisChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.redis = RedisChannelBinding;

const RedisServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.redis = RedisServerBinding;

const RedisMessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.redis = RedisMessageBinding;

// mercure
const MercureChannelBinding: NodeType = {
  properties: {}, // empty object
};
ChannelBindings.properties.mercure = MercureChannelBinding;

const MercureServerBinding: NodeType = {
  properties: {}, // empty object
};
ServerBindings.properties.mercure = MercureServerBinding;

const MercureMessageBinding: NodeType = {
  properties: {}, // empty object
}
MessageBindings.properties.mercure = MercureMessageBinding;

// ibmmq
// googlepubsub
// pulsar

// --- End per-protocol node types


export const AsyncApi2Types: Record<string, NodeType> = {
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

  HttpServerBinding,
  HttpChannelBinding,

  WsServerBinding,
  WsChannelBinding,

  KafkaServerBinding,
  KafkaTopicConfiguration,
  KafkaChannelBinding,

  AnypointmqServerBinding,
  AnypointmqChannelBinding,

  AmqpServerBinding,

  Amqp1ServerBinding,
  Amqp1ChannelBinding,

  MqttServerBindingLastWill,
  MqttServerBinding,
  MqttChannelBinding,

  Mqtt5ServerBinding,
  Mqtt5ChannelBinding,

  NatsServerBinding,
  NatsChannelBinding,

  JmsServerBinding,
  JmsChannelBinding,

  SolaceServerBinding,
  SolaceChannelBinding,

  StompServerBinding,
  StompChannelBinding,

  RedisServerBinding,
  RedisChannelBinding,

  MercureServerBinding,
  MercureChannelBinding,

  ServerBindings,
  ChannelBindings,
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
  NamedStreamHeaders: mapOf('StreamHeader'),
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  SecuritySchemeFlows,
  SecurityScheme,
  Message,
  MessageBindings,
  OperationBinding,
  OperationBindingsMap: mapOf('OperationBinding'),
  OperationTrait,
  OperationTraitList: listOf('OperationTrait'),
  MessageTrait,
  MessageTraitList: listOf('MessageTrait'),
  CorrelationId,
};
