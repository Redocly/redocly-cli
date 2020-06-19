function items(type: TypeTreeNode) {
  return {
    name: type.name + '_List',
    properties: {},
    items: type,
  };
}

function mapOf(type: any) {
  return {
    name: type.name + '_Map',
    properties: {},
    additionalProperties: () => type,
  };
}

const ContactType: TypeTreeNode = {
  name: 'Contact',
  properties: {
    name: {
      type: 'string',
    },
    url: {
      type: 'string',
    },
    email: {
      type: 'string',
    },
  },
};

const LicenseType: TypeTreeNode = {
  name: 'License',
  properties: {
    name: {
      type: 'string',
    },
    url: {
      type: 'string',
    },
  },
  required: ['name'],
};

const InfoType: TypeTreeNode = {
  name: 'Info',
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
    contact: ContactType,
    license: LicenseType,
  },
  required: ['title', 'version'],
};

const SchemaType: TypeTreeNode = {
  name: 'Schema',
  properties: {},
};

const SchemasMapType = {
  name: 'SchemasMap',
  properties: {},
  additionalProperties: () => SchemaType,
};

const DiscriminatorType: TypeTreeNode = {
  name: 'Discriminator',
  properties: {
    propertyName: { type: 'string' },
    mapping: { type: 'object' }, // TODO,
  },
  required: ['propertyName'],
};

const XmlType: TypeTreeNode = {
  name: 'XML',
  properties: {
    name: { type: 'string' },
    namespace: { type: 'string' },
    prefix: { type: 'string' },
    attribute: { type: 'boolean' },
    wrapped: { type: 'boolean' },
  },
};

const ExternalDocsType: TypeTreeNode = {
  name: 'ExternalDocs',
  properties: {
    description: {
      type: 'string',
    },
    url: {
      type: 'string',
    },
  },
  required: ['url'],
};

SchemaType.properties = {
  title: { type: 'string' },
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
    enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
  },
  allOf: items(SchemaType),
  anyOf: items(SchemaType),
  oneOf: items(SchemaType),
  not: SchemaType,
  properties: SchemasMapType,
  items: (value: any) => {
    if (Array.isArray(value)) {
      return items(SchemaType);
    } else {
      return SchemaType;
    }
  },
  additionalProperties: (value: any) => {
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    } else {
      return SchemaType;
    }
  },
  description: { type: 'string' },
  format: { type: 'string' },
  default: null,

  nullable: { type: 'boolean' },
  discriminator: DiscriminatorType,
  readOnly: { type: 'boolean' },
  writeOnly: { type: 'boolean' },
  externalDocs: ExternalDocsType,
  xml: XmlType,
  example: null,
  deprecated: { type: 'boolean' },
};

const ExampleType: TypeTreeNode = {
  name: 'Example',
  properties: {
    value: null,
    summary: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    externalValue: {
      type: 'string',
    },
  },
};

const ExampleMapType = {
  name: 'ExampleMap',
  properties: {},
  additionalProperties: () => ExampleType,
};

const EncodingType: TypeTreeNode = {
  name: 'Encoding',
  properties: {},
};

const MediaTypeType = {
  name: 'MediaType',
  properties: {
    schema: SchemaType,
    example: null,
    examples: ExampleMapType,
    encoding: mapOf(EncodingType),
  },
};

const MediaTypeMapType = {
  name: 'MediaTypeMap',
  properties: {},
  additionalProperties: () => MediaTypeType,
};

const ParameterType: TypeTreeNode = {
  name: 'Parameter',
  properties: {
    name: {
      type: 'string',
    },
    in: {
      enum: ['query', 'header', 'path', 'cookie'],
    },
    description: {
      type: 'string',
    },
    required: {
      type: 'boolean',
    },
    deprecated: {
      type: 'boolean',
    },
    allowEmptyValue: {
      type: 'boolean',
    },
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: {
      type: 'boolean',
    },
    allowReserved: {
      type: 'boolean',
    },
    schema: SchemaType,
    example: null,
    examples: ExampleMapType,
    content: MediaTypeMapType,
  },
  required: ['name', 'in'],
};

const HeaderType: TypeTreeNode = {
  name: 'Header',
  properties: {
    description: {
      type: 'string',
    },
    required: {
      type: 'boolean',
    },
    deprecated: {
      type: 'boolean',
    },
    allowEmptyValue: {
      type: 'boolean',
    },
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: {
      type: 'boolean',
    },
    allowReserved: {
      type: 'boolean',
    },
    schema: SchemaType,
    example: null,
    examples: ExampleMapType,
    content: MediaTypeMapType,
  },
};

EncodingType.properties = {
  contentType: {
    type: 'string',
  },
  headers: mapOf(HeaderType),
  style: {
    enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
  },
  explode: {
    type: 'boolean',
  },
  allowReserved: {
    type: 'boolean',
  },
};

export const ServerVariableType: TypeTreeNode = {
  name: 'ServerVariable',
  properties: {
    enum: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    default: {
      type: 'string',
    },
    description: null,
  },
  required: ['default'],
};

export const ServerType: TypeTreeNode = {
  name: 'Server',
  properties: {
    url: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    variables: mapOf(ServerVariableType),
  },
  required: ['url'],
};

const LinkType: TypeTreeNode = {
  name: 'Link',
  properties: {
    operationRef: { type: 'string' },
    operationId: { type: 'string' },
    parameters: null, // TODO
    requestBody: null, // TODO
    description: { type: 'string' },
    server: ServerType,
  },
};

const ResponseType: TypeTreeNode = {
  name: 'Response',
  properties: {
    description: {
      type: 'string',
    },
    headers: mapOf(HeaderType),
    content: MediaTypeMapType,
    links: mapOf(LinkType),
  },
  required: ['description'],
};

const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

const ResponsesMapType = {
  name: 'ResponsesMap',
  properties: {
    default: ResponseType,
  },
  additionalProperties: (_v: any, key: string) =>
    responseCodeRegexp.test(key) ? ResponseType : null,
};

const RequestBodyType: TypeTreeNode = {
  name: 'RequestBody',
  properties: {
    description: {
      type: 'string',
    },
    required: {
      type: 'boolean',
    },
    content: MediaTypeMapType,
  },
  required: ['content'],
};

const SecurityRequirementType: TypeTreeNode = {
  name: 'SecurityRequirement',
  properties: {},
  additionalProperties() {
    return { type: 'array', items: { type: 'string' } };
  },
};

const OperationType: TypeTreeNode = {
  name: 'Operation',
  properties: {
    tags: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    summary: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    externalDocs: ExternalDocsType,
    operationId: {
      type: 'string',
    },
    parameters: items(ParameterType),
    requestBody: RequestBodyType,
    responses: ResponsesMapType,
    deprecated: {
      type: 'boolean',
    },
    callbacks: null,
    security: items(SecurityRequirementType),
    servers: items(ServerType),
    // 'x-codeSamples'?: OAS3XCodeSample[];
    // 'x-code-samples'?: OAS3XCodeSample[]; // deprecated
  },
};

const PathItemType: TypeTreeNode = {
  name: 'PathItem',
  properties: {
    $ref: (null as any) as TypeTreeNode, // set below
    summary: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    get: OperationType,
    put: OperationType,
    post: OperationType,
    delete: OperationType,
    options: OperationType,
    head: OperationType,
    patch: OperationType,
    trace: OperationType,
    servers: items(ServerType),
    parameters: items(ParameterType),
  },
};

PathItemType.properties.$ref = PathItemType; // TODO implement special $ref handling for path item

const PathMapType: TypeTreeNode = {
  name: 'PathMap',
  properties: {},
  additionalProperties: (_value: any, key: string) => (key.startsWith('/') ? PathItemType : null),
};

OperationType.properties.callbacks = PathMapType as any;

const ImplicitFlowType: TypeTreeNode = {
  name: 'ImplicitFlow',
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object' }, // TODO
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'scopes'],
};

const PasswordFlowType: TypeTreeNode = {
  name: 'PasswordFlow',
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object' }, // TODO
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
};

const ClientCredentialsType: TypeTreeNode = {
  name: 'ClientCredentials',
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object' }, // TODO
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
};

const AuthorizationCodeType: TypeTreeNode = {
  name: 'AuthorizationCode',
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    scopes: { type: 'object' }, // TODO
    tokenUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'tokenUrl', 'scopes'],
};

const SecuritySchemeFlowsType: TypeTreeNode = {
  name: 'SecuritySchemeFlows',
  properties: {
    implicit: ImplicitFlowType,
    password: PasswordFlowType,
    clientCredentials: ClientCredentialsType,
    authorizationCode: AuthorizationCodeType,
  },
};

const SecuritySchemeType: TypeTreeNode = {
  name: 'SecurityScheme',
  properties: {
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string' },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flow: SecuritySchemeFlowsType,
    openIdConnectUrl: { type: 'string' },
  },
  required(value) {
    if (value.type === 'apiKey') {
      return ['type', 'name', 'in'];
    } else if (value.type === 'http') {
      return ['type', 'scheme'];
    } else if (value.type === 'oauth2') {
      return ['type', 'flows'];
    } else if (value.type === 'openIdConnect') {
      return ['type', 'openIdConnect'];
    }

    return ['type'];
  },
};

const NamedSchemasMapType: TypeTreeNode = {
  name: 'NamedSchemasMap',
  properties: {},
  additionalProperties: () => SchemaType,
};

const NamedExamplesMapType: TypeTreeNode = {
  name: 'NamedExamplesMap',
  properties: {},
  additionalProperties: () => ExampleType,
};

const ComponentsType: TypeTreeNode = {
  name: 'Components',
  properties: {
    schemas: NamedSchemasMapType,
    responses: mapOf(ResponseType),
    parameters: mapOf(ParameterType),
    examples: NamedExamplesMapType,
    requestBodies: mapOf(RequestBodyType),
    headers: mapOf(HeaderType),
    securitySchemes: mapOf(SecuritySchemeType),
    links: mapOf(LinkType),
    callbacks: mapOf(PathMapType),
  },
};

const TagType: TypeTreeNode = {
  name: 'Tag',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    externalDocs: ExternalDocsType,
  },
  required: ['name'],
};

export const DefinitionRootType = {
  name: 'DefinitionRoot',
  properties: {
    openapi: null,
    info: InfoType,
    servers: items(ServerType),
    paths: PathMapType,
    components: ComponentsType,
    security: items(SecurityRequirementType),
    tags: items(TagType),
    externalDocs: ExternalDocsType,
  },
  required: ['openapi', 'paths', 'info'],
};

export const OAS3Types: Record<string, TypeTreeNode> = {
  DefinitionRoot: DefinitionRootType,
  Contact: ContactType,
  License: LicenseType,
  Info: InfoType,
  SchemasMap: SchemasMapType,
  Schema: SchemaType,
  Example: ExampleType,
  ExampleMap: ExampleMapType,
  Encoding: EncodingType,
  MediaType: MediaTypeType,
  MediaTypeMap: MediaTypeMapType,
  Parameter: ParameterType,
  Header: HeaderType,
  ServerVariable: ServerVariableType,
  Server: ServerType,
  Link: LinkType,
  Response: ResponseType,
  ResponsesMap: ResponsesMapType,
  RequestBody: RequestBodyType,
  ExternalDocs: ExternalDocsType,
  SecurityRequirement: SecurityRequirementType,
  Operation: OperationType,
  PathItem: PathItemType,
  PathMap: PathMapType,
  NamedExamplesMap: NamedExamplesMapType,
  NamedSchemasMap: NamedSchemasMapType,
  ImplicitFlow: ImplicitFlowType,
  PasswordFlow: PasswordFlowType,
  ClientCredentials: ClientCredentialsType,
  AuthorizationCode: AuthorizationCodeType,
  SecuritySchemeFlows: SecuritySchemeFlowsType,
  SecurityScheme: SecuritySchemeType,
  Components: ComponentsType,
  Tag: TagType,
};

export type PropSchema = {
  name?: never;
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  items?: PropSchema;
  enum?: string[];
};

export type TypeTreeNode = {
  name: string;
  properties: Record<
    string,
    | TypeTreeNode
    | PropSchema
    | undefined
    | null
    | ((value: any, key: string) => TypeTreeNode | PropSchema | undefined | null)
  >;
  additionalProperties?(value: any, key: string): TypeTreeNode | PropSchema | undefined | null;
  items?: TypeTreeNode;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
};
