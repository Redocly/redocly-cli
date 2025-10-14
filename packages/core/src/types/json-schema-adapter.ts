// For internal usage only

import Ajv from '@redocly/ajv/dist/2020.js';
import { isPlainObject } from '../utils.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType, PropType, ResolveTypeFn } from './index.js';
import type { Oas3Schema } from '../typings/openapi.js';

const ajv = new Ajv({
  strictSchema: false,
  allowUnionTypes: true,
  useDefaults: true,
  allErrors: true,
  discriminator: true,
  strictTypes: false,
  verbose: true,
});

function findOneOf(schemaOneOf: JSONSchema[], oneOfs: (PropType | ResolveTypeFn)[]): ResolveTypeFn {
  if (oneOfs.some((option) => typeof option === 'function')) {
    throw new Error('Unexpected oneOf inside oneOf.');
  }

  return (value: unknown) => {
    let index = schemaOneOf.findIndex((option) => ajv.validate(option, value));
    if (index === -1) {
      index = 0;
    }
    return oneOfs[index] as PropType;
  };
}

function transformJSONSchemaToNodeType(
  propertyName: string,
  schema: JSONSchema,
  ctx: Record<string, NodeType>
): PropType | ResolveTypeFn {
  if (!schema || typeof schema === 'boolean') {
    throw new Error(`Unexpected schema in ${propertyName}.`);
  }

  if (schema instanceof Array) {
    throw new Error(`Unexpected array schema in ${propertyName}. Try using oneOf instead.`);
  }

  if (schema.type === 'null') {
    throw new Error(`Unexpected null schema type in ${propertyName} schema.`);
  }

  if (schema.type instanceof Array) {
    throw new Error(
      `Unexpected array schema type in ${propertyName} schema. Try using oneOf instead.`
    );
  }

  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  ) {
    const { default: _, format: _format, ...rest } = schema;
    return rest as PropType;
  }

  if (schema.type === 'object' && !schema.properties && !schema.oneOf) {
    if (schema.additionalProperties === undefined || schema.additionalProperties === true) {
      return { type: 'object' };
    } else if (schema.additionalProperties === false) {
      return { type: 'object', properties: {} };
    } else {
      // Handle case where additionalProperties is a schema
      return { type: 'object' };
    }
  }

  if (schema.allOf) {
    throw new Error(`Unexpected allOf in ${propertyName}.`);
  }

  if (schema.anyOf) {
    throw new Error(`Unexpected anyOf in ${propertyName}.`);
  }

  if (
    isPlainObject(schema.properties) ||
    isPlainObject(schema.additionalProperties) ||
    (isPlainObject(schema.items) &&
      (isPlainObject(schema.items.properties) ||
        isPlainObject(schema.items.additionalProperties) ||
        schema.items.oneOf)) // exclude scalar array types
  ) {
    return extractNodeToContext(propertyName, schema, ctx);
  }

  if (schema.oneOf) {
    if ((schema as Oas3Schema).discriminator) {
      const discriminatedPropertyName = (schema as Oas3Schema).discriminator?.propertyName;
      if (!discriminatedPropertyName) {
        throw new Error(`Unexpected discriminator without a propertyName in ${propertyName}.`);
      }

      // Create a NodeType that represents the discriminated union
      // Extract common properties from all oneOf options
      const commonProperties: Record<string, PropType | ResolveTypeFn> = {};

      // Find properties that exist in all oneOf options
      if (schema.oneOf && schema.oneOf.length > 0) {
        const firstOption = schema.oneOf[0] as any;
        if (firstOption && firstOption.properties) {
          for (const [propName, propSchema] of Object.entries(firstOption.properties)) {
            // Check if this property exists in all oneOf options
            const existsInAll = schema.oneOf.every(
              (option: any) => option && option.properties && option.properties[propName]
            );

            if (existsInAll) {
              // Special handling for the discriminator property - it should resolve to specific types
              if (propName === discriminatedPropertyName) {
                commonProperties[propName] = (value: any) => {
                  if (
                    isPlainObject(value) &&
                    typeof value[discriminatedPropertyName] === 'string'
                  ) {
                    const typeName = value[discriminatedPropertyName];
                    if (ctx[typeName]) {
                      return typeName;
                    }
                  }
                  // Fallback to the property schema
                  const fallbackType = transformJSONSchemaToNodeType(
                    `${propertyName}.${propName}`,
                    propSchema as JSONSchema,
                    ctx
                  );
                  return typeof fallbackType === 'string' ? fallbackType : (propSchema as PropType);
                };
              } else {
                // For other common properties, we need to process them inline
                // rather than creating separate type references to avoid "Unknown type" errors
                const processedType = transformJSONSchemaToNodeType(
                  `${propertyName}_${propName}`, // Use a unique name that won't conflict
                  propSchema as JSONSchema,
                  ctx
                );

                // If it returned a type name, we need to use that reference
                // If it returned an inline type, use that directly
                if (typeof processedType === 'string') {
                  commonProperties[propName] = processedType;
                } else {
                  // For inline types (like arrays, primitives), use them directly
                  commonProperties[propName] = processedType;
                }
              }
            }
          }
        }
      }

      ctx[propertyName] = {
        properties: commonProperties,
      };

      return propertyName;
    } else {
      const oneOfs = schema.oneOf.map((option, i) =>
        transformJSONSchemaToNodeType(propertyName + '_' + i, option, ctx)
      );
      return findOneOf(schema.oneOf as JSONSchema[], oneOfs);
    }
  }

  return schema as PropType;
}

function extractNodeToContext(
  propertyName: string,
  schema: JSONSchema,
  ctx: Record<string, NodeType>
): string {
  if (!schema || typeof schema === 'boolean') {
    throw new Error(`Unexpected schema in ${propertyName}.`);
  }

  if (schema instanceof Array) {
    throw new Error(`Unexpected array schema in ${propertyName}. Try using oneOf instead.`);
  }

  if (schema.type === 'null') {
    throw new Error(`Unexpected null schema type in ${propertyName} schema.`);
  }

  if (schema.type instanceof Array) {
    throw new Error(
      `Unexpected array schema type in ${propertyName} schema. Try using oneOf instead.`
    );
  }

  const properties: Record<string, PropType | ResolveTypeFn> = {};
  for (const [name, property] of Object.entries(schema.properties || {})) {
    properties[name] = transformJSONSchemaToNodeType(propertyName + '.' + name, property, ctx);
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
      isPlainObject(schema.items.additionalProperties) ||
      schema.items.oneOf) // exclude scalar array types
  ) {
    items = transformJSONSchemaToNodeType(propertyName + '_items', schema.items, ctx);
  }

  let required = schema.required as NodeType['required'];
  // Translate required in oneOfs into a ResolveTypeFn.
  if (schema.oneOf && schema.oneOf.every((option) => !!(option as Oas3Schema).required)) {
    required = (value): string[] => {
      const requiredList: string[][] = schema.oneOf!.map((option) => [
        ...(schema.required || []),
        ...(option as Oas3Schema).required!,
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
}

export function getNodeTypesFromJSONSchema(
  schemaName: string,
  entrySchema: JSONSchema
): Record<string, NodeType> {
  const ctx: Record<string, NodeType> = {};
  transformJSONSchemaToNodeType(schemaName, entrySchema, ctx);
  return ctx;
}
