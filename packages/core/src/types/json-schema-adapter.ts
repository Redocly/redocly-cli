import Ajv from '@redocly/ajv/dist/2020';
import { isPlainObject } from '../utils';

import type { NodeType, PropType, ResolveTypeFn } from '.';
import type { JSONSchema } from 'json-schema-to-ts';

const ajv = new Ajv({
  strictSchema: false,
  allowUnionTypes: true,
  useDefaults: true,
  allErrors: true,
  discriminator: true,
  strictTypes: false,
  verbose: true,
});

const findOneOf = (
  schemaOneOf: JSONSchema[],
  oneOfs: (PropType | ResolveTypeFn)[]
): ResolveTypeFn => {
  if (oneOfs.some((option) => typeof option === 'function')) {
    throw new Error('Unexpected oneOf inside oneOf.');
  }

  return (value: any) => {
    let index = schemaOneOf!.findIndex((option) => ajv.validate(option, value));
    if (index === -1) {
      index = 0;
    }
    return oneOfs[index] as PropType;
  };
};

export const transformJSONSchemaToNodeType = (
  propertyName: string,
  schema: JSONSchema,
  ctx: Record<string, NodeType>
): PropType | ResolveTypeFn => {
  if (!schema || typeof schema === 'boolean') {
    throw new Error('Unexpected schema.');
  }

  if (schema instanceof Array) {
    throw new Error('Unexpected array schema.');
  }

  if (schema.type === 'null') {
    throw new Error('Unexpected null type schema.');
  }

  if (schema.type instanceof Array) {
    throw new Error('Unexpected array type schema.');
  }

  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  ) {
    const { default: _, format: _format, ...rest } = schema;
    if (rest.type instanceof Array) {
      throw new Error('Unexpected array type schema.');
    }
    return rest as PropType; // FIXME: as
  }

  if (schema.type === 'object' && !schema.properties && !schema.oneOf) {
    if (schema.additionalProperties === undefined || schema.additionalProperties === true) {
      return { type: 'object' };
    } else if (schema.additionalProperties === false) {
      return { type: 'object', properties: {} };
    }
  }

  if (isPlainObject(schema.items) && schema.items.oneOf) {
    throw new Error('Unexpected oneOf in items.');
  }

  if (
    isPlainObject(schema.properties) ||
    isPlainObject(schema.additionalProperties) ||
    (isPlainObject(schema.items) &&
      (isPlainObject(schema.items.properties) || isPlainObject(schema.items.additionalProperties))) // && !schema.items.oneOf TODO:
  ) {
    return extractNodeToContext(propertyName, schema, ctx);
  }

  if (schema.oneOf) {
    if ((schema as any).discriminator) {
      const discriminatedPropertyName: string = (schema as any).discriminator?.propertyName;

      const oneOfs = schema.oneOf.map((option, i) => {
        if (typeof option === 'boolean') {
          throw new Error('Unexpected boolean schema.');
        }
        const discriminatedProperty = option?.properties?.[discriminatedPropertyName];
        if (!discriminatedProperty || typeof discriminatedProperty === 'boolean') {
          throw new Error('Unexpected property schema.');
        }
        const name = discriminatedProperty.const as string;
        return transformJSONSchemaToNodeType(name, option, ctx);
      });

      return (value: any, key: string) => {
        if (!isPlainObject(value)) {
          return findOneOf(schema.oneOf as JSONSchema[], oneOfs)(value, key);
        }
        return value[discriminatedPropertyName] as PropType;
      };
    } else {
      const oneOfs = schema.oneOf.map((option, i) =>
        transformJSONSchemaToNodeType(propertyName + '_' + i, option, ctx)
      );
      return findOneOf(schema.oneOf as JSONSchema[], oneOfs);
    }
  }

  return schema as PropType;
};

const extractNodeToContext = (
  propertyName: string,
  schema: JSONSchema,
  ctx: Record<string, NodeType>
): string => {
  if (!schema || typeof schema === 'boolean') {
    throw new Error('Unexpected schema.');
  }

  if (schema instanceof Array) {
    throw new Error('Unexpected array schema.');
  }

  if (schema.type === 'null') {
    throw new Error('Unexpected null type schema.');
  }

  if (schema.type instanceof Array) {
    throw new Error('Unexpected array type schema.');
  }

  const properties: Record<string, PropType | ResolveTypeFn> = {};
  for (const [name, property] of Object.entries(schema.properties || {})) {
    properties[name] = transformJSONSchemaToNodeType(name, property, ctx);
  }

  let additionalProperties;
  if (isPlainObject(schema.additionalProperties)) {
    additionalProperties = transformJSONSchemaToNodeType(
      propertyName + '_additionalProperties',
      schema.additionalProperties,
      ctx
    );
  }
  if (schema.additionalProperties === true) {
    additionalProperties = {};
  }

  let items;
  if (
    isPlainObject(schema.items) &&
    (isPlainObject(schema.items.properties) ||
      isPlainObject(schema.items.additionalProperties))
  ) {
    items = propertyName + '_items';
    transformJSONSchemaToNodeType(propertyName + '_items', schema.items, ctx);
  }

  let required = schema.required as NodeType['required'];
  // Translate required in oneOfs into a ResolveTypeFn.
  if (schema.oneOf && schema.oneOf.every((option) => !!(option as any).required)) {
    required = (value: any): string[] => {
      const requiredList: string[][] = schema.oneOf!.map((option) => [
        ...(schema.required || []),
        ...(option as any).required,
      ]);

      let index = requiredList.findIndex((r) =>
        r.every((requiredProp) => value[requiredProp] !== undefined)
      );
      if (index === -1) {
        index = 0;
      }

      return requiredList[index];
    };
  }

  ctx[propertyName] = { properties, additionalProperties, items, required };
  return propertyName;
};
