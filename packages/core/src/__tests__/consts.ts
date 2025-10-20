export const ENTITY_RELATION_TYPES = [
  'partOf',
  'hasParts',
  'creates',
  'createdBy',
  'owns',
  'ownedBy',
  'implements',
  'implementedBy',
  'dependsOn',
  'dependencyOf',
  'uses',
  'usedBy',
  'produces',
  'consumes',
  'linksTo',
  'supersedes',
  'supersededBy',
  'compatibleWith',
  'extends',
  'extendedBy',
  'relatesTo',
  'hasMember',
  'memberOf',
  'triggers',
  'triggeredBy',
  'returns',
  'returnedBy',
] as const;

export const userMetadataSchema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      description: 'Email of the user',
    },
  },
  required: ['email'],
  additionalProperties: true,
} as const;

export const apiDescriptionMetadataSchema = {
  type: 'object',
  properties: {
    specType: {
      type: 'string',
      enum: ['jsonschema', 'openapi', 'asyncapi', 'avro', 'zod', 'graphql', 'protobuf', 'arazzo'],
      description: 'Type of the API description',
    },
    descriptionFile: {
      type: 'string',
      description: 'Path to the file containing the API description',
    },
  },
  required: ['specType', 'descriptionFile'],
  additionalProperties: true,
} as const;

export const apiOperationMetadataSchema = {
  type: 'object',
  properties: {
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'MUTATION', 'QUERY', 'SUBSCRIBE', 'PUBLISH'],
      description: 'HTTP method of the API operation',
    },
    path: {
      type: 'string',
      description: 'Path of the API operation',
    },
    payload: {
      type: 'array',
      items: {
        type: 'string',
        description: 'Related dataSchema name',
      },
    },
    responses: {
      type: 'array',
      items: {
        type: 'string',
        description: 'Related dataSchema name',
      },
    },
  },
  required: ['method', 'path'],
  additionalProperties: true,
} as const;

export const dataSchemaMetadataSchema = {
  type: 'object',
  properties: {
    specType: {
      type: 'string',
      enum: ['jsonschema', 'openapi', 'asyncapi', 'avro', 'zod', 'graphql', 'protobuf', 'arazzo'],
      description: 'Specification type of the data schema',
    },
    schema: {
      type: 'string',
      description: 'Inline schema of the data structure',
    },
    sdl: {
      type: 'string',
      description: 'SDL of the data structure',
    },
  },
  required: ['specType'],
  // oneOf: [{ required: ['schema'] }, { required: ['sdl'] }],
  additionalProperties: true,
} as const;

export const defaultMetadataSchema = {
  type: 'object',
  additionalProperties: true,
} as const;

export const slackChannelFileSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 150,
    },
  },
  required: ['name'],
  additionalProperties: false,
} as const;

export const slackContactFileSchema = {
  type: 'object',
  properties: {
    channels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 150,
          },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  required: ['channels'],
  additionalProperties: false,
} as const;

export const entityContactFileSchema = {
  type: 'object',
  properties: {
    slack: {
      type: 'object',
      properties: {
        channels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 2,
                maxLength: 150,
              },
              url: {
                type: 'string',
              },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
      },
      required: ['channels'],
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const entityLinkFileSchema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
      minLength: 2,
      maxLength: 150,
    },
    url: {
      type: 'string',
    },
  },
  required: ['label', 'url'],
  additionalProperties: false,
} as const;

export const entityRelationFileSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ENTITY_RELATION_TYPES,
    },
    key: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
    },
  },
  required: ['type', 'key'],
  additionalProperties: false,
} as const;

// Base entity schema properties
export const entityBaseProperties = {
  key: {
    type: 'string',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    minLength: 2,
    maxLength: 150,
  },
  type: {
    type: 'string',
    enum: ['user', 'data-schema', 'api-operation', 'api-description', 'service', 'domain', 'team'],
  },
  title: {
    type: 'string',
    minLength: 2,
    maxLength: 200,
  },
  summary: {
    type: 'string',
    minLength: 1,
    maxLength: 500,
  },
  tags: {
    type: 'array',
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
  },
  git: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  contact: {
    type: 'object',
    additionalProperties: true,
  },
  links: {
    type: 'array',
    items: entityLinkFileSchema,
  },
  relations: {
    type: 'array',
    items: entityRelationFileSchema,
  },
  metadata: {
    type: 'object',
    additionalProperties: true,
  },
} as const;

export const entityFileSchema = {
  type: 'object',
  discriminator: {
    propertyName: 'type',
  },
  oneOf: [
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'user' },
        metadata: userMetadataSchema,
      },
      required: ['key', 'title', 'type', 'metadata'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'api-operation' },
        metadata: apiOperationMetadataSchema,
      },
      required: ['key', 'title', 'type', 'metadata'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'data-schema' },
        metadata: dataSchemaMetadataSchema,
      },
      required: ['key', 'title', 'type', 'metadata'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'api-description' },
        metadata: apiDescriptionMetadataSchema,
      },
      required: ['key', 'title', 'type', 'metadata'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'service' },
      },
      required: ['key', 'title', 'type'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'domain' },
      },
      required: ['key', 'title', 'type'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        ...entityBaseProperties,
        type: { const: 'team' },
      },
      required: ['key', 'title', 'type'],
      additionalProperties: false,
    },
  ],
} as const;

export const entityFileDefaultSchema = {
  type: 'object',
  properties: {
    ...entityBaseProperties,
  },
  required: ['key', 'title', 'type'],
  additionalProperties: false,
} as const;
