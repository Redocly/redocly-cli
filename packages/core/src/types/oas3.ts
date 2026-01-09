import { listOf, mapOf, type NodeType } from './index.js';
import { isMappingRef } from '../ref-utils.js';

const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

const Root: NodeType = {
  properties: {
    openapi: null,
    info: 'Info',
    servers: 'ServerList',
    security: 'SecurityRequirementList',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    paths: 'Paths',
    components: 'Components',
    'x-webhooks': 'WebhooksMap',
    'x-tagGroups': 'TagGroups',
    'x-ignoredHeaderParameters': { type: 'array', items: { type: 'string' } },
  },
  required: ['openapi', 'paths', 'info'],
  extensionsPrefix: 'x-',
};

const Tag: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: `The name of the tag.`,
    },
    description: {
      type: 'string',
      description: `A short description for the tag. CommonMark syntax MAY be used for rich text representation.`,
    },
    externalDocs: 'ExternalDocs',
    'x-traitTag': { type: 'boolean' },
    'x-displayName': { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
  description: `The Tag Object represents a tag used by the OAS. It is not mandatory to have a tag object per tag used by the OAS but each tag object can contain additional metadata.`,
  documentationLink: `https://spec.openapis.org/oas/v3.1.0#tag-object`,
};

const TagGroup: NodeType = {
  properties: {
    name: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  extensionsPrefix: 'x-',
};

const ExternalDocs: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'A description of the target documentation. CommonMark syntax MAY be used for rich text representation.',
    },
    url: {
      type: 'string',
      description:
        'REQUIRED. The URL for the target documentation. This MUST be in the format of a URL.',
    },
  },
  required: ['url'],
  extensionsPrefix: 'x-',
  description: 'Additional external documentation for this operation.',
};

const Server: NodeType = {
  properties: {
    url: { type: 'string' },
    description: { type: 'string' },
    variables: 'ServerVariablesMap',
  },
  required: ['url'],
  extensionsPrefix: 'x-',
};

const ServerVariable: NodeType = {
  properties: {
    enum: {
      type: 'array',
      items: { type: 'string' },
    },
    default: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['default'],
  extensionsPrefix: 'x-',
};

const SecurityRequirement: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
    'x-logo': 'Logo',
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};

const Logo: NodeType = {
  properties: {
    url: { type: 'string' },
    altText: { type: 'string' },
    backgroundColor: { type: 'string' },
    href: { type: 'string' },
  },
};

const Contact: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    email: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const License: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const Paths: NodeType = {
  properties: {},
  additionalProperties: (_value: any, key: string) =>
    key.startsWith('/') ? 'PathItem' : undefined,
  description: 'The available paths and operations for the API.',
  documentationLink: 'https://redocly.com/learn/openapi/openapi-visual-reference/paths',
};

const WebhooksMap: NodeType = {
  properties: {},
  additionalProperties: () => 'PathItem',
};

const PathItem: NodeType = {
  properties: {
    $ref: {
      type: 'string',
      description:
        'Allows for a referenced definition of this path item. The referenced structure MUST be in the form of a Path Item Object. In case a Path Item Object field appears both in the defined object and the referenced object, the behavior is undefined. See the rules for resolving Relative References.',
      documentationLink: 'https://redocly.com/learn/openapi/openapi-visual-reference/reference',
    }, // TODO: verify special $ref handling for Path Item
    servers: 'ServerList',
    parameters: 'ParameterList',
    summary: {
      type: 'string',
      description: 'An optional, string summary, intended to apply to all operations in this path.',
    },
    description: {
      type: 'string',
      description:
        'An optional, string description, intended to apply to all operations in this path. CommonMark syntax MAY be used for rich text representation.',
    },

    get: 'Operation',
    put: 'Operation',
    post: 'Operation',
    delete: 'Operation',
    options: 'Operation',
    head: 'Operation',
    patch: 'Operation',
    trace: 'Operation',
  },
  extensionsPrefix: 'x-',
  description:
    'Describes the operations available on a single path. A Path Item MAY be empty, due to ACL constraints. The path itself is still exposed to the documentation viewer but they will not know which operations and parameters are available.',
  documentationLink:
    'https://redocly.com/learn/openapi/openapi-visual-reference/path-item#path-item-object',
};

const Parameter: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'REQUIRED. The name of the parameter. Parameter names are case sensitive.',
    },
    in: {
      enum: ['query', 'header', 'path', 'cookie'],
      description:
        'REQUIRED. The location of the parameter. Possible values are "query", "header", "path", or "cookie".',
    },
    description: {
      type: 'string',
      description:
        'A brief description of the parameter. This could contain examples of use. CommonMark syntax MAY be used for rich text representation.',
    },
    required: {
      type: 'boolean',
      description:
        'Determines whether this parameter is mandatory. If the parameter location is "path", this property is REQUIRED and its value MUST be true. Otherwise, the property MAY be included and its default value is false.',
    },
    deprecated: {
      type: 'boolean',
      description:
        'Specifies that a parameter is deprecated and SHOULD be transitioned out of usage. Default value is false.',
    },
    allowEmptyValue: {
      type: 'boolean',
      description:
        'Sets the ability to pass empty-valued parameters. This is valid only for query parameters and allows sending a parameter with an empty value. Default value is false. If style is used, and if behavior is n/a (cannot be serialized), the value of allowEmptyValue SHALL be ignored. Use of this property is NOT RECOMMENDED, as it is likely to be removed in a later revision.',
    },
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
      description:
        'Describes how the parameter value will be serialized depending on the type of the parameter value. Default values (based on value of in): for query - form; for path - simple; for header - simple; for cookie - form.',
    },
    explode: {
      type: 'boolean',
      description:
        'When this is true, parameter values of type array or object generate separate parameters for each value of the array or key-value pair of the map. For other types of parameters this property has no effect. When style is form, the default value is true. For all other styles, the default value is false.',
    },
    allowReserved: {
      type: 'boolean',
      description: `Determines whether the parameter value SHOULD allow reserved characters, as defined by RFC3986 :/?#[]@!$&'()*+,;= to be included without percent-encoding. This property only applies to parameters with an in value of query. The default value is false.`,
    },
    schema: 'Schema',
    example: { isExample: true },
    examples: 'ExamplesMap',
    content: 'MediaTypesMap',
  },
  required: ['name', 'in'],
  requiredOneOf: ['schema', 'content'],
  extensionsPrefix: 'x-',
  description:
    'Describes a request parameter, which excludes the request body. A unique parameter is defined by a unique combination of the name and in values.',
  documentationLink: 'https://redocly.com/learn/openapi/openapi-visual-reference/parameter',
};

const Operation: NodeType = {
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string' },
      description:
        'A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.',
      documentationLink: 'https://redocly.com/learn/openapi/openapi-visual-reference/operation',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the operation does.',
      documentationLink:
        'https://redocly.com/learn/openapi/openapi-visual-reference/operation#summary',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the operation behavior. CommonMark syntax MAY be used for rich text representation.',
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
  required: ['responses'],
  extensionsPrefix: 'x-',
  description: `The Operation Object describes a single API operation on a path, including its parameters, responses, and request body (if applicable). Each path can support more than one operation, but those operations must be unique. A unique operation is a combination of a path and an HTTP method, so two GET or two POST methods for the same path are not allowed.`,
  documentationLink: 'https://redocly.com/learn/openapi/openapi-visual-reference/operation',
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
    content: 'MediaTypesMap',
  },
  required: ['content'],
  extensionsPrefix: 'x-',
  description:
    'The request body applicable for this operation. The requestBody is fully supported in HTTP methods where the HTTP 1.1 specification [RFC7231] Section 4.3.1 has explicitly defined semantics for request bodies. In other cases where the HTTP spec is vague (such as GET, HEAD and DELETE), requestBody is permitted but does not have well-defined semantics and SHOULD be avoided if possible.',
};

const MediaTypesMap: NodeType = {
  properties: {},
  additionalProperties: 'MediaType',
};

const MediaType: NodeType = {
  properties: {
    schema: 'Schema',
    example: { isExample: true },
    examples: 'ExamplesMap',
    encoding: 'EncodingMap',
  },
  extensionsPrefix: 'x-',
};

const Example: NodeType = {
  properties: {
    value: { resolvable: false },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalValue: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const Encoding: NodeType = {
  properties: {
    contentType: { type: 'string' },
    headers: 'HeadersMap',
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: { type: 'boolean' },
    allowReserved: { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

const EnumDescriptions: NodeType = {
  properties: {},
  additionalProperties: { type: 'string' },
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
    examples: 'ExamplesMap',
    content: 'MediaTypesMap',
  },
  requiredOneOf: ['schema', 'content'],
  extensionsPrefix: 'x-',
};

const Responses: NodeType = {
  properties: { default: 'Response' },
  additionalProperties: (_v: any, key: string) =>
    responseCodeRegexp.test(key) ? 'Response' : undefined,
  description: 'The list of possible responses as they are returned from executing this operation.',
};

const Response: NodeType = {
  properties: {
    description: { type: 'string' },
    headers: 'HeadersMap',
    content: 'MediaTypesMap',
    links: 'LinksMap',
    'x-summary': { type: 'string' },
  },
  required: ['description'],
  extensionsPrefix: 'x-',
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
  extensionsPrefix: 'x-',
};

// draft-00
const Schema: NodeType = {
  properties: {
    externalDocs: 'ExternalDocs',
    discriminator: 'Discriminator',
    title: { type: 'string' },
    multipleOf: { type: 'number', minimum: 0 },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'boolean' },
    exclusiveMinimum: { type: 'boolean' },
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
    type: {
      enum: ['object', 'array', 'string', 'number', 'integer', 'boolean'],
    },
    allOf: listOf('Schema'),
    anyOf: listOf('Schema'),
    oneOf: listOf('Schema'),
    not: 'Schema',
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
    default: null,
    nullable: { type: 'boolean' },
    readOnly: { type: 'boolean' },
    writeOnly: { type: 'boolean' },
    xml: 'Xml',
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    'x-tags': { type: 'array', items: { type: 'string' } },
    'x-additionalPropertiesName': { type: 'string' },
    'x-explicitMappingOnly': { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

const Xml: NodeType = {
  properties: {
    name: { type: 'string' },
    namespace: { type: 'string' },
    prefix: { type: 'string' },
    attribute: { type: 'boolean' },
    wrapped: { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
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
  extensionsPrefix: 'x-',
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
  extensionsPrefix: 'x-',
};

const ImplicitFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const PasswordFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const ClientCredentials: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const AuthorizationCode: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
    'x-usePkce': (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'XUsePkce';
      }
    },
  },
  required: ['authorizationUrl', 'tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const OAuth2Flows: NodeType = {
  properties: {
    implicit: 'ImplicitFlow',
    password: 'PasswordFlow',
    clientCredentials: 'ClientCredentials',
    authorizationCode: 'AuthorizationCode',
  },
  extensionsPrefix: 'x-',
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'OAuth2Flows',
    openIdConnectUrl: { type: 'string' },
    'x-defaultClientId': { type: 'string' },
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

const XUsePkce: NodeType = {
  properties: {
    disableManualConfiguration: { type: 'boolean' },
    hideClientSecretInput: { type: 'boolean' },
  },
};

export const Oas3Types = {
  Root,
  Tag,
  TagList: listOf('Tag', {
    description: `A list of tags used by the document with additional metadata.`,
  }),
  TagGroups: listOf('TagGroup'),
  TagGroup,
  ExternalDocs,
  Server,
  ServerList: listOf('Server'),
  ServerVariable,
  ServerVariablesMap: mapOf('ServerVariable'),
  SecurityRequirement,
  SecurityRequirementList: listOf('SecurityRequirement'),
  Info,
  Contact,
  License,
  Paths,
  PathItem,
  Parameter,
  ParameterList: listOf('Parameter', {
    description:
      'A list of parameters that are applicable for this operation. If a parameter is already defined at the Path Item, the new definition will override it but can never remove it. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location. The list can use the Reference Object to link to parameters that are defined at the OpenAPI Object’s components/parameters.',
  }),
  Operation,
  Callback: mapOf('PathItem'),
  CallbacksMap: mapOf('Callback'),
  RequestBody,
  MediaTypesMap,
  MediaType,
  Example,
  ExamplesMap: mapOf('Example'),
  Encoding,
  EncodingMap: mapOf('Encoding'),
  EnumDescriptions,
  Header,
  HeadersMap: mapOf('Header'),
  Responses,
  Response,
  Link,
  Logo,
  Schema,
  Xml,
  SchemaProperties,
  DiscriminatorMapping,
  Discriminator,
  Components,
  LinksMap: mapOf('Link'),
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
  OAuth2Flows,
  SecurityScheme,
  XCodeSample,
  XCodeSampleList: listOf('XCodeSample'),
  XUsePkce,
  WebhooksMap,
} as const;
