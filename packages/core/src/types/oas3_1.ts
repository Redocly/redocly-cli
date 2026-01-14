import { listOf, mapOf, type NodeType } from './index.js';
import { Oas3Types } from './oas3.js';

const Root: NodeType = {
  properties: {
    openapi: null,
    info: 'Info',
    servers: 'ServerList',
    security: 'SecurityRequirementList',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    paths: 'Paths',
    webhooks: 'WebhooksMap',
    components: 'Components',
    jsonSchemaDialect: {
      type: 'string',
      description:
        'The default value for the $schema keyword within Schema Objects contained within this OAS document. This MUST be in the form of a URI.',
    },
  },
  required: ['openapi', 'info'],
  requiredOneOf: ['paths', 'components', 'webhooks'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://redocly.com/learn/openapi/openapi-visual-reference/openapi#openapi',
  description:
    'REQUIRED. This string MUST be the semantic version number of the OpenAPI Specification version that the OpenAPI document uses. The openapi field SHOULD be used by tooling specifications and clients to interpret the OpenAPI document. This is not related to the API info.version string.',
};

const License: NodeType = {
  ...Oas3Types.License,
  properties: {
    ...Oas3Types.License.properties,
    identifier: {
      type: 'string',
      description:
        'An [SPDX-Licenses] expression for the API. The identifier field is mutually exclusive of the url field.',
    },
  },
};

const Info: NodeType = {
  ...Oas3Types.Info,
  properties: {
    ...Oas3Types.Info.properties,
    summary: {
      type: 'string',
      description: 'A short summary of the API. This field MAY be used by tooling as required.',
    },
  },
};

const Components: NodeType = {
  ...Oas3Types.Components,
  properties: {
    ...Oas3Types.Components.properties,
    pathItems: 'NamedPathItems',
  },
};

const Operation: NodeType = {
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string' },
      description:
        'A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the operation does.',
      documentationLink:
        'https://redocly.com/learn/openapi/openapi-visual-reference/operation#summary',
    },
    description: {
      type: 'string',
      description: 'A verbose explanation of the operation behavior.',
      documentationLink:
        'https://redocly.com/learn/openapi/openapi-visual-reference/operation#description',
    },
    externalDocs: 'ExternalDocs',
    operationId: {
      type: 'string',
      description:
        'The operationId is path segment or path fragment in deep links to a specific operation.',
      documentationLink:
        'https://redocly.com/learn/openapi/openapi-visual-reference/operation#operationid',
    },
    parameters: 'ParameterList',
    security: 'SecurityRequirementList',
    servers: 'ServerList',
    requestBody: 'RequestBody',
    responses: 'Responses',
    deprecated: { type: 'boolean' },
    callbacks: 'CallbacksMap',
    'x-codeSamples': 'XCodeSampleList',
    'x-code-samples': 'XCodeSampleList', // deprecated
    'x-hideTryItPanel': { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
  description: `The Operation Object describes a single API operation on a path, including its parameters, responses, and request body (if applicable). Each path can support more than one operation, but those operations must be unique. A unique operation is a combination of a path and an HTTP method, so two GET or two POST methods for the same path are not allowed.`,
  documentationLink: `https://spec.openapis.org/oas/v3.1.0#operation-object`,
};

// draft-2020-12
const Schema: NodeType = {
  properties: {
    $id: { type: 'string' },
    $anchor: { type: 'string' },
    id: { type: 'string' },
    $schema: { type: 'string' },
    definitions: 'NamedSchemas',
    $defs: 'NamedSchemas',
    $vocabulary: { type: 'string' },
    externalDocs: 'ExternalDocs',
    discriminator: 'Discriminator',
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
    dependentSchemas: mapOf('Schema'),
    dependentRequired: 'DependentRequired',
    prefixItems: listOf('Schema'),
    contains: 'Schema',
    minContains: { type: 'integer', minimum: 0 },
    maxContains: { type: 'integer', minimum: 0 },
    patternProperties: 'PatternProperties',
    propertyNames: 'Schema',
    unevaluatedItems: (value: unknown) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
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
    contentSchema: 'Schema',
    default: null,
    readOnly: { type: 'boolean' },
    writeOnly: { type: 'boolean' },
    xml: 'Xml',
    examples: { type: 'array' },
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    const: null,
    $comment: { type: 'string' },
    'x-tags': { type: 'array', items: { type: 'string' } },
    $dynamicAnchor: { type: 'string' },
    $dynamicRef: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    } else {
      return 'Schema';
    }
  },
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'OAuth2Flows',
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
        switch (value?.flows) {
          case 'implicit':
            return ['type', 'flows', 'authorizationUrl', 'refreshUrl', 'description', 'scopes'];
          case 'password':
          case 'clientCredentials':
            return ['type', 'flows', 'tokenUrl', 'refreshUrl', 'description', 'scopes'];
          case 'authorizationCode':
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
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
            ];
        }
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl', 'description'];
      case 'mutualTLS':
        return ['type', 'description'];
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
};

const DependentRequired: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

export const Oas3_1Types = {
  ...Oas3Types,
  Info,
  Root,
  Schema,
  SchemaProperties,
  PatternProperties: SchemaProperties,
  License,
  Components,
  NamedPathItems: mapOf('PathItem'),
  SecurityScheme,
  Operation,
  DependentRequired,
} as const;
