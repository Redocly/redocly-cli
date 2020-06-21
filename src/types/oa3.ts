export type PropertySchema = {
  name?: never;
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  items?: PropertySchema;
  enum?: string[];
};

export type NodeType = {
  properties: Record<string, PropType | ResolveTypeFn>;
  additionalProperties?: ResolveTypeFn;
  items?: string;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
};

type PropType = string | NodeType | PropertySchema | undefined | null;
type ResolveTypeFn = (value: any, key: string) => string | PropType;

export type NormalizedNodeType = {
  name: string;
  properties: Record<string, NormalizedPropType | NormalizedResolveTypeFn>;
  additionalProperties?: NormalizedResolveTypeFn;
  items?: NormalizedNodeType;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
};

type NormalizedPropType = NormalizedNodeType | PropertySchema | undefined | null;
type NormalizedResolveTypeFn = (
  value: any,
  key: string,
) => NormalizedNodeType | PropertySchema | undefined | null;

function items(typeName: string) {
  return {
    name: typeName + '_List',
    properties: {},
    items: typeName,
  };
}

function mapOf(typeName: string) {
  return {
    name: typeName + '_Map',
    properties: {},
    additionalProperties: () => typeName,
  };
}

export function normalizeTypes(
  types: Record<string, NodeType>,
): Record<string, NormalizedNodeType> {
  const normalizedTypes: Record<string, NormalizedNodeType> = {};

  for (const typeName of Object.keys(types)) {
    normalizedTypes[typeName] = {
      ...types[typeName],
      name: typeName,
    } as any;
  }

  for (const type of Object.values(normalizedTypes)) {
    normalizeType(type);
  }

  return normalizedTypes;

  function normalizeType(type: any) {
    if (type.additionalProperties) {
      type.additionalProperties = resolveType(type.additionalProperties);
    }
    if (type.items) {
      type.items = resolveType(type.items);
    }

    if (type.properties) {
      const mappedProps:Record<string, any> = {};
      for (const propName of Object.keys(type.properties)) {
        mappedProps[propName] = resolveType(type.properties[propName]);
      }
      type.properties = mappedProps;
    }
  }

  // typings are painful here...
  function resolveType(type?: any): any {
    if (typeof type === 'string') {
      if (!normalizedTypes[type]) {
        throw new Error(`Unknown type name found: ${type}`);
      }
      return normalizedTypes[type];
    } else if (typeof type === 'function') {
      return (value: any, key: string) => {
        return resolveType(type(value, key));
      };
    } else if (type && type.name) {
      type = {...type};
      normalizeType(type);
      return type;
    } else {
      return type;
    }
  }
}

const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

export const OAS3Types: Record<string, NodeType> = {
  DefinitionRoot: {
    properties: {
      openapi: null,
      info: 'Info',
      tags: items('Tag'),
      servers: items('Server'),
      security: items('SecurityRequirement'),
      externalDocs: 'ExternalDocs',
      paths: 'PathMap',
      components: 'Components',
    },
    required: ['openapi', 'paths', 'info'],
  },
  Tag: {
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      externalDocs: 'ExternalDocs',
    },
    required: ['name'],
  },
  ExternalDocs: {
    properties: {
      description: {
        type: 'string',
      },
      url: {
        type: 'string',
      },
    },
    required: ['url'],
  },
  Server: {
    properties: {
      url: {
        type: 'string',
      },
      description: {
        type: 'string',
      },
      variables: mapOf('ServerVariable'),
    },
    required: ['url'],
  },
  ServerVariable: {
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
  },
  SecurityRequirement: {
    properties: {},
    additionalProperties() {
      return { type: 'array', items: { type: 'string' } };
    },
  },
  Info: {
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
      contact: 'Contact',
      license: 'License',
    },
    required: ['title', 'version'],
  },
  Contact: {
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
  },
  License: {
    properties: {
      name: {
        type: 'string',
      },
      url: {
        type: 'string',
      },
    },
    required: ['name'],
  },
  PathMap: {
    properties: {},
    additionalProperties: (_value: any, key: string) =>
      key.startsWith('/') ? 'PathItem' : null,
  },
  PathItem: {
    properties: {
      $ref: 'PathItem', // TODO verify special $ref handling for Path Item
      servers: items('Server'),
      parameters: items('Parameter'),
      summary: {
        type: 'string',
      },
      description: {
        type: 'string',
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
  },
  Parameter: {
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
        enum: [
          'form',
          'simple',
          'label',
          'matrix',
          'spaceDelimited',
          'pipeDelimited',
          'deepObject',
        ],
      },
      explode: {
        type: 'boolean',
      },
      allowReserved: {
        type: 'boolean',
      },
      schema: 'Schema',
      example: null,
      examples: mapOf('Example'),
      content: 'MediaTypeMap',
    },
    required: ['name', 'in'],
  },
  Operation: {
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
      externalDocs: 'ExternalDocs',
      operationId: {
        type: 'string',
      },
      parameters: items('Parameter'),
      security: items('SecurityRequirement'),
      servers: items('Server'),
      requestBody: 'RequestBody',
      responses: 'ResponsesMap',
      deprecated: {
        type: 'boolean',
      },
      callbacks: 'PathMap',
      // 'x-codeSamples'?: OAS3XCodeSample[]; // TODO
      // 'x-code-samples'?: OAS3XCodeSample[]; // deprecated
    },
  },
  RequestBody: {
    properties: {
      description: {
        type: 'string',
      },
      required: {
        type: 'boolean',
      },
      content: 'MediaTypeMap',
    },
    required: ['content'],
  },

  MediaTypeMap: {
    properties: {},
    additionalProperties: () => 'MediaType',
  },
  MediaType: {
    properties: {
      schema: 'Schema',
      example: null,
      examples: mapOf('Example'),
      encoding: mapOf('Encoding'),
    },
  },

  Example: {
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
  },

  Encoding: {
    properties: {
      contentType: {
        type: 'string',
      },
      headers: mapOf('Header'),
      style: {
        enum: [
          'form',
          'simple',
          'label',
          'matrix',
          'spaceDelimited',
          'pipeDelimited',
          'deepObject',
        ],
      },
      explode: {
        type: 'boolean',
      },
      allowReserved: {
        type: 'boolean',
      },
    },
  },

  Header: {
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
        enum: [
          'form',
          'simple',
          'label',
          'matrix',
          'spaceDelimited',
          'pipeDelimited',
          'deepObject',
        ],
      },
      explode: {
        type: 'boolean',
      },
      allowReserved: {
        type: 'boolean',
      },
      schema: 'Schema',
      example: null,
      examples: mapOf('Example'),
      content: 'MediaTypeMap',
    },
  },

  ResponsesMap: {
    properties: {
      default: 'Response',
    },
    additionalProperties: (_v: any, key: string) =>
      responseCodeRegexp.test(key) ? 'Response' : null,
  },

  Response: {
    properties: {
      description: {
        type: 'string',
      },
      headers: mapOf('Header'),
      content: 'MediaTypeMap',
      links: mapOf('Link'),
    },
    required: ['description'],
  },

  Link: {
    properties: {
      operationRef: { type: 'string' },
      operationId: { type: 'string' },
      parameters: null, // TODO
      requestBody: null, // TODO
      description: { type: 'string' },
      server: 'Server',
    },
  },

  Schema: {
    properties: {
      externalDocs: 'ExternalDocs',
      discriminator: 'Discriminator',
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
      allOf: items('Schema'),
      anyOf: items('Schema'),
      oneOf: items('Schema'),
      not: 'Schema',
      properties: 'SchemaProperties',
      items: (value: any) => {
        if (Array.isArray(value)) {
          return items('Schema');
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
      example: null,
      deprecated: { type: 'boolean' },
    },
  },
  Xml: {
    properties: {
      name: { type: 'string' },
      namespace: { type: 'string' },
      prefix: { type: 'string' },
      attribute: { type: 'boolean' },
      wrapped: { type: 'boolean' },
    },
  },
  SchemaProperties: {
    properties: {},
    additionalProperties: () => 'Schema',
  },
  Discriminator: {
    properties: {
      propertyName: { type: 'string' },
      mapping: { type: 'object' }, // TODO,
    },
    required: ['propertyName'],
  },
  Components: {
    properties: {
      schemas: 'NamedSchemas',
      responses: 'NamedResponses',
      parameters: 'NamedParameters',
      examples: 'NamedExamples',
      requestBodies: 'NamedRequestBodies',
      headers: 'NamedHeaders',
      securitySchemes: 'NamedSecuritySchemes',
      links: 'NamedLinks',
      callbacks: 'NamedCallbacks',
    },
  },

  NamedSchemas: mapOf('Schema'),
  NamedResponses: mapOf('Response'),
  NamedParameters: mapOf('Parameter'),
  NamedExamples: mapOf('Example'),
  NamedRequestBodies: mapOf('RequestBody'),
  NamedHeaders: mapOf('Header'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  NamedLinks: mapOf('Link'),
  NamedCallbacks: mapOf('PathItem'),
  ImplicitFlow: {
    properties: {
      refreshUrl: { type: 'string' },
      scopes: { type: 'object' }, // TODO
      authorizationUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'scopes'],
  },
  PasswordFlow: {
    properties: {
      refreshUrl: { type: 'string' },
      scopes: { type: 'object' }, // TODO
      tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
  },
  ClientCredentials: {
    properties: {
      refreshUrl: { type: 'string' },
      scopes: { type: 'object' }, // TODO
      tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
  },
  AuthorizationCode: {
    properties: {
      refreshUrl: { type: 'string' },
      authorizationUrl: { type: 'string' },
      scopes: { type: 'object' }, // TODO
      tokenUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'tokenUrl', 'scopes'],
  },
  SecuritySchemeFlows: {
    properties: {
      implicit: 'ImplicitFlow',
      password: 'PasswordFlow',
      clientCredentials: 'ClientCredentials',
      authorizationCode: 'AuthorizationCode',
    },
  },
  SecurityScheme: {
    properties: {
      type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'] },
      description: { type: 'string' },
      name: { type: 'string' },
      in: { type: 'string' },
      scheme: { type: 'string' },
      bearerFormat: { type: 'string' },
      flow: 'SecuritySchemeFlows',
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
  },
};
