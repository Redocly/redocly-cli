import { NodeType, listOf, mapOf } from '.';
import { isMappingRef } from '../ref-utils';
const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

const DefinitionRoot: NodeType = {
  properties: {
    asyncapi: null, // done
    info: 'Info', // done,
    id: { type: 'string' }, // done
    servers: 'ServeMap',
    channels: 'ChannelMap',
    components: 'Components',
    tags: listOf('Tag'),
    externalDocs: 'ExternalDocs',
  },
  required: ['openapi', 'channels', 'info'],
};


const Channel: NodeType = {
  properties: {
    description: { type: 'string' },
    subscribe: 'Operation',
    publish: 'Operation',
    Parameter: mapOf('Parameter'),
    bindings: mapOf('ChannelBinding'), // todo
  },
}


const ChannelMap: NodeType = {
  properties: {},
  additionalProperties: 'Channel',
}

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
const Nats5ServerBinding: NodeType = {
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
    http: 'HTTPServerBinding',
    ws: 'WSServerBinding',
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
  // done
  properties: {
    url: { type: 'string' },
    protocol: { type: 'string' },
    protocolVersion: { type: 'string' },
    description: { type: 'string' },
    variables: mapOf('ServerVariable'),
    security: listOf('SecurityRequirement'),
    bindings: 'ServerBindings',
  },
  required: ['url', 'protocol'],
};

const ServeMap: NodeType = {
  // done
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
  required: ['default'],
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

const PathMap: NodeType = {
  properties: {},
  additionalProperties: (_value: any, key: string) =>
    key.startsWith('/') ? 'PathItem' : undefined,
};

const PathItem: NodeType = {
  properties: {
    $ref: { type: 'string' }, // TODO: verify special $ref handling for Path Item
    servers: listOf('Server'),
    parameters: listOf('Parameter'),
    summary: { type: 'string' },
    description: { type: 'string' },
    get: 'Operation',
    put: 'Operation',
    post: 'Operation',
    delete: 'Operation',
    options: 'Operation',
    head: 'Operation',
    patch: 'Operation',
    trace: 'Operation',
  },
};

const Parameter: NodeType = { // done
  properties: {
    description: { type: 'string' },
    schema: 'Schema',
    location: { type: 'string' },
  },
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
    parameters: listOf('Parameter'),
    security: listOf('SecurityRequirement'),
    servers: listOf('Server'),
    requestBody: 'RequestBody',
    responses: 'ResponsesMap',
    deprecated: { type: 'boolean' },
    callbacks: mapOf('Callback'),
    'x-codeSamples': listOf('XCodeSample'),
    'x-code-samples': listOf('XCodeSample'), // deprecated
    'x-hideTryItPanel': { type: 'boolean' },
  },
  required: ['responses'],
};

const XCodeSample: NodeType = {
  properties: {
    lang: { type: 'string' },
    label: { type: 'string' },
    source: { type: 'string' },
  },
};

const RequestBody: NodeType = {
  properties: {
    description: { type: 'string' },
    required: { type: 'boolean' },
    content: 'MediaTypeMap',
  },
  required: ['content'],
};

const MediaTypeMap: NodeType = {
  properties: {},
  additionalProperties: 'MediaType',
};

const MediaType: NodeType = {
  properties: {
    schema: 'Schema',
    example: { isExample: true },
    examples: mapOf('Example'),
    encoding: mapOf('Encoding'),
  },
};

const Example: NodeType = {
  properties: {
    value: { isExample: true },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalValue: { type: 'string' },
  },
};

const Encoding: NodeType = {
  properties: {
    contentType: { type: 'string' },
    headers: mapOf('Header'),
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: { type: 'boolean' },
    allowReserved: { type: 'boolean' },
  },
};

const Header: NodeType = {
  properties: {
    description: { type: 'string' },
    required: { type: 'boolean' },
    deprecated: { type: 'boolean' },
    allowEmptyValue: { type: 'boolean' },
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: { type: 'boolean' },
    allowReserved: { type: 'boolean' },
    schema: 'Schema',
    example: { isExample: true },
    examples: mapOf('Example'),
    content: 'MediaTypeMap',
  },
};

const ResponsesMap: NodeType = {
  properties: { default: 'Response' },
  additionalProperties: (_v: any, key: string) =>
    responseCodeRegexp.test(key) ? 'Response' : undefined,
};

const Response: NodeType = {
  properties: {
    description: { type: 'string' },
    headers: mapOf('Header'),
    content: 'MediaTypeMap',
    links: mapOf('Link'),
  },
  required: ['description'],
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
    xml: 'Xml',
    examples: { type: 'array' },
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    const: null,
    $comment: { type: 'string' },
  },
};

const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: 'Schema',
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
    parameters: 'NamedParameters',
    schemas: 'NamedSchemas',
    responses: 'NamedResponses',
    examples: 'NamedExamples',
    requestBodies: 'NamedRequestBodies',
    headers: 'NamedHeaders',
    securitySchemes: 'NamedSecuritySchemes',
    links: 'NamedLinks',
    callbacks: 'NamedCallbacks',
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
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'SecuritySchemeFlows',
    openIdConnectUrl: { type: 'string' },
  },
  required(value) {
    switch (value?.type) {
      case 'apiKey':
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

export const Oas3Types: Record<string, NodeType> = {
  DefinitionRoot,
  Tag,
  ExternalDocs,
  Server,
  ServerVariable,
  SecurityRequirement,
  Info,
  Contact,
  License,
  PathMap,
  PathItem,
  Parameter,
  Operation,
  Callback: mapOf('PathItem'),
  RequestBody,
  MediaTypeMap,
  MediaType,
  Example,
  Encoding,
  Header,
  ResponsesMap,
  Response,
  Link,
  Schema,
  Xml,
  SchemaProperties,
  DiscriminatorMapping,
  Discriminator,
  Components,
  NamedSchemas: mapOf('Schema'),
  NamedResponses: mapOf('Response'),
  NamedParameters: mapOf('Parameter'),
  NamedExamples: mapOf('Example'),
  NamedRequestBodies: mapOf('RequestBody'),
  NamedHeaders: mapOf('Header'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  NamedLinks: mapOf('Link'),
  NamedCallbacks: mapOf('Callback'),
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  SecuritySchemeFlows,
  SecurityScheme,
  XCodeSample,
  WebhooksMap,
};
