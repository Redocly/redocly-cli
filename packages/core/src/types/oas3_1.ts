import { NodeType, listOf, mapOf } from '.';
import { Oas3Types } from './oas3'

const DefinitionRoot: NodeType = {
  properties: {
    openapi: null,
    info: 'Info',
    servers: listOf('Server'),
    security: listOf('SecurityRequirement'),
    tags: listOf('Tag'),
    externalDocs: 'ExternalDocs',
    paths: 'PathMap',
    webhooks: 'WebhooksMap',
    components: 'Components',
    jsonSchemaDialect: { type: 'string' },
  },
  required: ['openapi', 'info'],
  requiredOneOf: ['paths', 'components', 'webhooks']
};

const License: NodeType = {
  properties: {
    name: {
      type: 'string',
    },
    url: {
      type: 'string',
    },
    identifier: {
      type: 'string',
    },
  },
  required: ['name'],
};

const Info: NodeType = {
  properties: {
    title: {
      type: 'string',
    },
    version: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    termsOfService: {
      type: 'string',
    },
    summary: {
      type: 'string',
    },
    contact: 'Contact',
    license: 'License',
  },
  required: ['title', 'version'],
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
    pathItems: 'NamedPathItems',
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
    deprecated: {
      type: 'boolean',
    },
    callbacks: mapOf('Callback'),
    'x-codeSamples': listOf('XCodeSample'),
    'x-code-samples': listOf('XCodeSample'), // deprecated
  },
};

const Schema: NodeType = {
  properties: {
    externalDocs: 'ExternalDocs',
    discriminator: 'Discriminator',
    myArbitraryKeyword: { type: 'boolean' },
    title: { type: 'string' },
    multipleOf: { type: 'number' },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'number' },
    exclusiveMinimum: { type: 'number' },
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
    type: (value: any) => {
      if (Array.isArray(value)) {
        return { type: 'array', items: { enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'] } }
      } else {
        return {
          enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
        }
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
    prefixItems: { type: 'array' },
    contains: 'Schema',
    patternProperties: { type: 'object' },
    propertyNames: 'Schema',
    unevaluatedItems: 'Schema',
    unevaluatedProperties: 'Schema',
    summary: { type: 'string' },

    properties: 'SchemaProperties',
    items: (value: any) => {
      if (Array.isArray(value)) {
        return listOf('Schema');
      } else {
        return 'Schema';
      }
    },
    additionalProperties: (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
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
    const: {
      enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
    },
    $comment: { type: 'string' },
  },
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string' },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'SecuritySchemeFlows',
    openIdConnectUrl: { type: 'string' },
  },
  required(value) {
    if (!value?.type) {
      return ['type'];
    }

    if (value.type === 'apiKey') {
      return ['type', 'name', 'in'];
    } else if (value.type === 'http') {
      return ['type', 'scheme'];
    } else if (value.type === 'oauth2') {
      return ['type', 'flows'];
    } else if (value.type === 'openIdConnect') {
      return ['type', 'openIdConnectUrl'];
    }

    return ['type'];
  },
};

export const Oas3_1Types: Record<string, NodeType> = {
  ...Oas3Types,
  Info,
  DefinitionRoot,
  Schema,
  License,
  Components,
  NamedPathItems: mapOf('PathItem'),
  SecurityScheme,
  Operation,
};
