import { NodeType, listOf, mapOf } from '.';

const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

const DefinitionRoot: NodeType = {
  properties: {
    swagger: { type: 'string' },
    info: 'Info',
    host: { type: 'string' },
    basePath: { type: 'string' },
    schemes: { type: 'array', items: { type: 'string' } },
    consumes: { type: 'array', items: { type: 'string' } },
    produces: { type: 'array', items: { type: 'string' } },
    paths: 'PathMap',
    definitions: 'NamedSchemas',
    parameters: 'NamedParameters',
    responses: 'NamedResponses',
    securityDefinitions: 'NamedSecuritySchemes',
    security: listOf('SecurityRequirement'),
    tags: listOf('Tag'),
    externalDocs: 'ExternalDocs',
  },
  required: ['swagger', 'paths', 'info'],
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
    version: { type: 'string' },
  },
  required: ['title', 'version'],
};

const Contact: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    email: { type: 'string' },
  },
};

const License: NodeType = {
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
    parameters: listOf('Parameter'),

    get: 'Operation',
    put: 'Operation',
    post: 'Operation',
    delete: 'Operation',
    options: 'Operation',
    head: 'Operation',
    patch: 'Operation',
  },
};

const Operation: NodeType = {
  properties: {
    tags: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    operationId: { type: 'string' },
    consumes: { type: 'array', items: { type: 'string' } },
    produces: { type: 'array', items: { type: 'string' } },
    parameters: listOf('Parameter'),
    responses: 'ResponsesMap',
    schemes: { type: 'array', items: { type: 'string' } },
    deprecated: { type: 'boolean' },
    security: listOf('SecurityRequirement'),
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

const ExternalDocs: NodeType = {
  properties: {
    description: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['url'],
};

const Parameter: NodeType = {
  properties: {
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'path', 'formData', 'body'] },
    description: { type: 'string' },
    required: { type: 'boolean' },
    schema: 'Schema',
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array', 'file'] },
    format: { type: 'string' },
    allowEmptyValue: { type: 'boolean' },
    items: 'ParameterItems',
    collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
    default: null,
    maximum: { type: 'integer' },
    exclusiveMaximum: { type: 'boolean' },
    minimum: { type: 'integer' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'integer' },
    minLength: { type: 'integer' },
    pattern: { type: 'string' },
    maxItems: { type: 'integer' },
    minItems: { type: 'integer' },
    uniqueItems: { type: 'boolean' },
    enum: { type: 'array' },
    multipleOf: { type: 'number' },
  },
  required(value) {
    if (!value || !value.in) {
      return ['name', 'in'];
    }
    if (value.in === 'body') {
      return ['name', 'in', 'schema'];
    } else {
      if (value.type === 'array') {
        return ['name', 'in', 'type', 'items'];
      } else {
        return ['name', 'in', 'type'];
      }
    }
  },
};

const ParameterItems: NodeType = {
  properties: {
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
    format: { type: 'string' },
    items: 'ParameterItems',
    collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
    default: null,
    maximum: { type: 'integer' },
    exclusiveMaximum: { type: 'boolean' },
    minimum: { type: 'integer' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'integer' },
    minLength: { type: 'integer' },
    pattern: { type: 'string' },
    maxItems: { type: 'integer' },
    minItems: { type: 'integer' },
    uniqueItems: { type: 'boolean' },
    enum: { type: 'array' },
    multipleOf: { type: 'number' },
  },
  required(value) {
    if (value && value.type === 'array') {
      return ['type', 'items'];
    } else {
      return ['type'];
    }
  },
};

const ResponsesMap: NodeType = {
  properties: {
    default: 'Response',
  },
  additionalProperties: (_v: any, key: string) =>
    responseCodeRegexp.test(key) ? 'Response' : undefined,
};

const Response: NodeType = {
  properties: {
    description: { type: 'string' },
    schema: 'Schema',
    headers: mapOf('Header'),
    examples: 'Examples',
  },
  required: ['description'],
};

const Examples: NodeType = {
  properties: {},
  additionalProperties: { isExample: true },
};

const Header: NodeType = {
  properties: {
    description: { type: 'string' },
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
    format: { type: 'string' },
    items: 'ParameterItems',
    collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
    default: null,
    maximum: { type: 'integer' },
    exclusiveMaximum: { type: 'boolean' },
    minimum: { type: 'integer' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'integer' },
    minLength: { type: 'integer' },
    pattern: { type: 'string' },
    maxItems: { type: 'integer' },
    minItems: { type: 'integer' },
    uniqueItems: { type: 'boolean' },
    enum: { type: 'array' },
    multipleOf: { type: 'number' },
  },
  required(value) {
    if (value && value.type === 'array') {
      return ['type', 'items'];
    } else {
      return ['type'];
    }
  },
};

const Tag: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
  },
  required: ['name'],
};

const Schema: NodeType = {
  properties: {
    format: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    default: null,
    multipleOf: { type: 'number' },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'boolean' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'number' },
    minLength: { type: 'number' },
    pattern: { type: 'string' },
    maxItems: { type: 'number' },
    minItems: { type: 'number' },
    uniqueItems: { type: 'boolean' },
    maxProperties: { type: 'number' },
    minProperties: { type: 'number' },
    required: { type: 'array', items: { type: 'string' } },
    enum: { type: 'array' },
    type: {
      type: 'string',
      enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
    },
    items: (value: any) => {
      if (Array.isArray(value)) {
        return listOf('Schema');
      } else {
        return 'Schema';
      }
    },
    allOf: listOf('Schema'),
    properties: 'SchemaProperties',
    additionalProperties: (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    discriminator: { type: 'string' },
    readOnly: { type: 'boolean' },
    xml: 'Xml',
    externalDocs: 'ExternalDocs',
    example: { isExample: true },
    'x-tags': { type: 'array', items: { type: 'string' } },
  },
};

const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: 'Schema',
};

const Xml: NodeType = {
  properties: {
    name: { type: 'string' },
    namespace: { type: 'string' },
    prefix: { type: 'string' },
    attribute: { type: 'boolean' },
    wrapped: { type: 'boolean' },
  },
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['basic', 'apiKey', 'oauth2'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header'] },
    flow: { enum: ['implicit', 'password', 'application', 'accessCode'] },
    authorizationUrl: { type: 'string' },
    tokenUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } },
  },
  required(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'name', 'in'];
      case 'oauth2':
        switch (value?.flow) {
          case 'implicit':
            return ['type', 'flow', 'authorizationUrl', 'scopes'];
          case 'accessCode':
            return ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'scopes'];
          case 'application':
          case 'password':
            return ['type', 'flow', 'tokenUrl', 'scopes'];
          default:
            return ['type', 'flow', 'scopes'];
        }
      default:
        return ['type'];
    }
  },
  allowed(value) {
    switch (value?.type) {
      case 'basic':
        return ['type', 'description'];
      case 'apiKey':
        return ['type', 'name', 'in', 'description'];
      case 'oauth2':
        switch (value?.flow) {
          case 'implicit':
            return ['type', 'flow', 'authorizationUrl', 'description', 'scopes'];
          case 'accessCode':
            return ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'description', 'scopes'];
          case 'application':
          case 'password':
            return ['type', 'flow', 'tokenUrl', 'description', 'scopes'];
          default:
            return ['type', 'flow', 'tokenUrl', 'authorizationUrl', 'description', 'scopes'];
        }
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
};

const SecurityRequirement: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

export const Oas2Types: Record<string, NodeType> = {
  DefinitionRoot,
  Tag,
  ExternalDocs,
  SecurityRequirement,
  Info,
  Contact,
  License,
  PathMap,
  PathItem,
  Parameter,
  ParameterItems,
  Operation,
  Examples,
  Header,
  ResponsesMap,
  Response,
  Schema,
  Xml,
  SchemaProperties,
  NamedSchemas: mapOf('Schema'),
  NamedResponses: mapOf('Response'),
  NamedParameters: mapOf('Parameter'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  SecurityScheme,
  XCodeSample,
};
