import { isMappingRef } from '../ref-utils.js';
import { listOf, type NodeType } from './index.js';

export const Schema: NodeType = {
  properties: {
    $id: { type: 'string' },
    $schema: { type: 'string' },
    definitions: 'NamedSchemas',
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
      return Array.isArray(value)
        ? {
            type: 'array',
            items: { enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'] },
          }
        : {
            enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
          };
    },
    allOf: listOf('Schema'),
    anyOf: listOf('Schema'),
    oneOf: listOf('Schema'),
    not: 'Schema',
    if: 'Schema',
    then: 'Schema',
    else: 'Schema',
    contains: 'Schema',
    patternProperties: { type: 'object' },
    propertyNames: 'Schema',
    properties: 'SchemaProperties',
    items: (value: any) => {
      return Array.isArray(value) ? listOf('Schema') : 'Schema';
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
    examples: { type: 'array' },
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    const: null,
    $comment: { type: 'string' },
    additionalItems: (value: any) => {
      return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
    },
    dependencies: 'Dependencies',
  },
};

export const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
  },
};

export const Dependencies: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    return Array.isArray(value) ? { type: 'array', items: { type: 'string' } } : 'Schema';
  },
};

export const DiscriminatorMapping: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (isMappingRef(value)) {
      return { type: 'string', directResolveAs: 'Schema' };
    } else {
      return { type: 'string' };
    }
  },
};

export const Discriminator: NodeType = {
  properties: {
    propertyName: { type: 'string' },
    mapping: 'DiscriminatorMapping',
  },
  required: ['propertyName'],
};
