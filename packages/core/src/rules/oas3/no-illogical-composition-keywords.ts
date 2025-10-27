import { dequal } from '../../utils/dequal.js';
import { isRef } from '../../ref-utils.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

type SchemaSignature = {
  properties?: Set<string>;
  propertySchemas?: Map<string, SchemaSignature>;
  enum?: string[];
  items?: SchemaSignature;
  additionalProperties?: boolean | SchemaSignature;
  required?: Set<string>;
  [key: string]: any;
};

type ReturnType = {
  isExclusive: boolean;
  reason?: string;
};

export const NoIllogicalCompositionKeywords: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      skip(node) {
        return !(node.oneOf || node.anyOf || node.allOf);
      },
      enter(schema, { report, location, resolve }) {
        // Helper function to get the composition keyword and schemas
        const compositionData = (() => {
          if (schema.oneOf && Array.isArray(schema.oneOf)) {
            return { keyword: 'oneOf' as const, schemas: schema.oneOf };
          }
          if (schema.anyOf && Array.isArray(schema.anyOf)) {
            return { keyword: 'anyOf' as const, schemas: schema.anyOf };
          }
          if (schema.allOf && Array.isArray(schema.allOf)) {
            return { keyword: 'allOf' as const, schemas: schema.allOf };
          }
          return undefined;
        })();

        if (!compositionData) return;

        const { keyword, schemas } = compositionData;

        // Check for minimum schema count (oneOf and anyOf require at least 2)
        if ((keyword === 'oneOf' || keyword === 'anyOf') && schemas.length < 2) {
          report({
            message: `Schema object '${keyword}' should contain at least 2 schemas. Use the schema directly instead.`,
            location: location.child([keyword]),
          });
          return;
        }

        // Check for empty schemas (applies to all composition keywords)
        for (let i = 0; i < schemas.length; i++) {
          const resolvedSchema = resolveSchema(schemas[i], resolve);
          if (isEmptyObject(resolvedSchema)) {
            report({
              message: `Schema is empty.`,
              location: location.child([keyword, String(i)]),
            });
            return;
          }
        }

        // Check for duplicate schemas
        for (let i = 0; i < schemas.length - 1; i++) {
          for (let j = i + 1; j < schemas.length; j++) {
            if (dequal(Object.values(schemas[i]), Object.values(schemas[j]))) {
              report({
                message: `Duplicate schemas found in '${keyword}', which makes it impossible to discriminate between schemas.`,
                location: location.child([keyword]),
              });
              return;
            }
          }
        }

        // oneOf-specific checks
        if (keyword === 'oneOf') {
          // Check for nullable type conflict
          if (hasNullableType(schema)) {
            const hasNullTypeInOneOf = schemas.some((subSchema) => {
              const resolved = resolveSchema(subSchema, resolve);
              return hasNullableType(resolved);
            });

            if (hasNullTypeInOneOf) {
              report({
                message: `Schema with nullable type cannot have a oneOf option that is also nullable. This creates ambiguity when the value is null.`,
                location: location.child(['oneOf']),
              });
              return;
            }
          }

          // Check mutual exclusivity - oneOf schemas should ALWAYS be mutually exclusive
          const { isExclusive, reasons } = areOneOfSchemasMutuallyExclusive(schemas, resolve);

          if (!isExclusive && reasons && reasons.length > 0) {
            // Report each ambiguous pair as a separate warning
            for (const reason of reasons) {
              report({
                message: reason,
                location: location.child(['oneOf']),
              });
            }
          }
        }
      },
    },
  };
};

// Helper function to resolve a schema if it's a reference
function resolveSchema(
  schema: Oas3Schema | Oas3_1Schema,
  resolve: UserContext['resolve']
): Oas3Schema | Oas3_1Schema {
  if (isRef(schema)) {
    const { node: resolvedSchema } = resolve(schema);
    if (resolvedSchema) {
      return resolvedSchema;
    }
  }
  return schema;
}

// Helper to check if a schema or signature represents a nullable type
// Works with both Schema objects and SchemaSignature objects
function hasNullableType(schema: Oas3Schema | Oas3_1Schema | SchemaSignature): boolean {
  if ('nullable' in schema && schema.nullable === true) {
    return true;
  }

  // Check if type is the string 'null'
  if (schema.type === 'null') {
    return true;
  }

  // Check if type is an array containing 'null'
  if (schema.type && Array.isArray(schema.type)) {
    return schema.type.includes('null');
  }

  return false;
}

function createSchemaSignature(
  schema: Oas3Schema | Oas3_1Schema,
  resolve: UserContext['resolve']
): SchemaSignature {
  // Resolve $ref if present
  const resolvedSchema = resolveSchema(schema, resolve);

  // If resolving returned a different schema, recurse with the resolved one
  if (resolvedSchema !== schema) {
    return createSchemaSignature(resolvedSchema, resolve);
  }

  const signature: SchemaSignature = {};

  // Properties that need special handling
  const specialProperties = new Set(['properties', 'required', 'items', 'additionalProperties']);

  // Copy all simple properties automatically
  for (const [key, value] of Object.entries(schema)) {
    if (!isDefined(value) || specialProperties.has(key)) {
      continue; // Skip undefined values and special properties
    }

    // Clone arrays to avoid mutation
    if (Array.isArray(value)) {
      signature[key] = [...value];
    } else {
      signature[key] = value;
    }
  }

  // Handle special properties that need transformation
  if (schema.properties) {
    signature.properties = new Set(Object.keys(schema.properties));
    signature.propertySchemas = new Map();

    // Store property schemas for deeper comparison
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (isPlainObject(propSchema)) {
        signature.propertySchemas.set(propName, createSchemaSignature(propSchema, resolve));
      }
    }
  }

  if (schema.required) {
    signature.required = new Set(schema.required);
  }

  if (schema.items && isPlainObject(schema.items)) {
    signature.items = createSchemaSignature(schema.items, resolve);
  }

  if (isDefined(schema.additionalProperties)) {
    if (typeof schema.additionalProperties === 'boolean') {
      signature.additionalProperties = schema.additionalProperties;
    } else {
      signature.additionalProperties = createSchemaSignature(schema.additionalProperties, resolve);
    }
  }

  return signature;
}

function arePropertiesMutuallyExclusive(
  prop1: SchemaSignature,
  prop2: SchemaSignature
): ReturnType {
  // Check for null type distinction (OpenAPI 3.0 and 3.1)
  if (hasNullableType(prop1) && hasNullableType(prop2)) {
    return { isExclusive: false, reason: 'Both schemas allow null values, creating ambiguity.' };
  }

  // If both have enums, check if they're completely non-overlapping
  if (prop1.enum && prop2.enum) {
    const overlappingEnums = prop1.enum.filter((val) =>
      prop2.enum!.some((val2) => dequal(val, val2))
    );

    return overlappingEnums.length > 0
      ? {
          isExclusive: false,
          reason: `Schemas have overlapping enum values: ${JSON.stringify(overlappingEnums)}.`,
        }
      : { isExclusive: true };
  }

  // If both have const values and they're different, they're mutually exclusive
  if (prop1.const && prop2.const) {
    return !dequal(prop1.const, prop2.const)
      ? { isExclusive: true }
      : {
          isExclusive: false,
          reason: `Both schemas have the same const value: ${JSON.stringify(prop1.const)}.`,
        };
  }

  // If types are different, they're mutually exclusive.
  if (prop1.type && prop2.type && prop1.type !== 'object' && prop2.type !== 'object') {
    if (!dequal(prop1.type, prop2.type)) {
      return { isExclusive: true };
    } else if (prop1.format && prop2.format && prop1.format !== prop2.format) {
      return { isExclusive: true };
    }
    return { isExclusive: false };
  }

  return { isExclusive: true };
}

function areSignaturesMutuallyExclusive(
  sig1: SchemaSignature,
  sig2: SchemaSignature,
  depth: number = 0
): ReturnType {
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) {
    // If we've gone too deep, assume they're not mutually exclusive to be safe
    return {
      isExclusive: false,
      reason: 'Maximum recursion depth reached while checking schema exclusivity.',
    };
  }
  // Check top-level constraint exclusivity (types, formats, const values, enum values, and all constraints)
  const topLevelResult = arePropertiesMutuallyExclusive(sig1, sig2);
  if (!topLevelResult.isExclusive && topLevelResult.reason) {
    return topLevelResult;
  }

  // Property overlap check
  if (sig1.properties && sig2.properties) {
    const intersection = [...sig1.properties].filter((prop) => sig2.properties!.has(prop));
    if (intersection.length > 0) {
      // Check if overlapping properties have mutually exclusive values
      const ambiguousProperties: string[] = [];
      const mutuallyExclusiveProperties: string[] = [];

      for (const propName of intersection) {
        const prop1Schema = sig1.propertySchemas?.get(propName);
        const prop2Schema = sig2.propertySchemas?.get(propName);

        // If we have both property schemas, check if they're mutually exclusive
        if (prop1Schema && prop2Schema) {
          const { isExclusive, reason } = arePropertiesMutuallyExclusive(prop1Schema, prop2Schema);

          if (!isExclusive && reason) {
            return {
              isExclusive,
              reason,
            };
          }

          // A property is truly mutually exclusive only if:
          // 1. It has mutually exclusive values (different types, enums, etc.), OR
          // 2. It's required in BOTH schemas (otherwise data can omit it)
          const isRequiredInBoth = sig1.required?.has(propName) && sig2.required?.has(propName);

          if (isExclusive && isRequiredInBoth) {
            mutuallyExclusiveProperties.push(propName);
          } else if (isExclusive && !isRequiredInBoth) {
            // Property has different types/values but is not required in both
            // This doesn't make schemas mutually exclusive, but also not ambiguous
            // Don't add to either list - it's neutral
          } else {
            // Property has overlapping/same values
            ambiguousProperties.push(propName);
          }
        } else {
          // If we can't determine, assume it's ambiguous
          ambiguousProperties.push(propName);
        }
      }

      // If all overlapping properties have mutually exclusive values, schemas are not ambiguous
      if (ambiguousProperties.length === 0 && mutuallyExclusiveProperties.length > 0) {
        return { isExclusive: true };
      }

      // Key insight: If ANY required property is mutually exclusive, the schemas are distinguishable
      if (sig1.required && sig2.required && mutuallyExclusiveProperties.length > 0) {
        const requiredAndMutuallyExclusive = mutuallyExclusiveProperties.filter(
          (prop) => sig1.required!.has(prop) && sig2.required!.has(prop)
        );

        // If there's at least one required property that's mutually exclusive, schemas are NOT ambiguous
        if (requiredAndMutuallyExclusive.length > 0) {
          return { isExclusive: true };
        }
      }

      if (ambiguousProperties.length > 0) {
        return {
          isExclusive: false,
          reason: `Schemas have overlapping properties: ${ambiguousProperties.join(', ')}.`,
        };
      }

      return { isExclusive: true };
    }
  }

  // additionalProperties check
  if (isDefined(sig1.additionalProperties) || isDefined(sig2.additionalProperties)) {
    const addlProps1 = sig1.additionalProperties;
    const addlProps2 = sig2.additionalProperties;

    // Determine the type of additionalProperties for each schema
    const isBoolean1 = typeof addlProps1 === 'boolean';
    const isBoolean2 = typeof addlProps2 === 'boolean';
    const isSchema1 = isPlainObject(addlProps1);
    const isSchema2 = isPlainObject(addlProps2);

    // Case 1: Both are booleans
    if (isBoolean1 && isBoolean2) {
      const allowsAdditional1 = addlProps1 !== false;
      const allowsAdditional2 = addlProps2 !== false;

      // If one allows and the other doesn't, they're not mutually exclusive (ambiguous)
      if (allowsAdditional1 !== allowsAdditional2) {
        return {
          isExclusive: false,
          reason: 'One schema allows additional properties while the other does not.',
        };
      }
    }
    // Case 2: One is boolean, the other is a schema/ref
    else if ((isBoolean1 && isSchema2) || (isSchema1 && isBoolean2)) {
      // If boolean is false, it means no additional properties allowed
      // If the other has a schema, they conflict (one allows with constraints, one disallows)
      const boolValue = isBoolean1 ? addlProps1 : addlProps2;

      if (boolValue === false) {
        return {
          isExclusive: false,
          reason:
            'One schema disallows additional properties (false) while the other defines a schema for them.',
        };
      }
      // If boolean is true, one allows any additional properties, the other allows with constraints
      // This could be mutually exclusive if other constraints distinguish them, but the
      // additionalProperties themselves don't provide discrimination
    }
    // Case 3: Both are schemas/refs
    else if (isSchema1 && isSchema2) {
      // Check if the additionalProperties schemas are mutually exclusive
      const addlPropsResult = areSignaturesMutuallyExclusive(
        addlProps1 as SchemaSignature,
        addlProps2 as SchemaSignature,
        depth + 1
      );

      // If the additionalProperties schemas are not mutually exclusive, it creates ambiguity
      if (!addlPropsResult.isExclusive) {
        return {
          isExclusive: false,
          reason: `Schemas have overlapping additionalProperties definitions. ${
            addlPropsResult.reason || ''
          }`,
        };
      }
      // If they ARE mutually exclusive, this helps distinguish the schemas
      // The additionalProperties provide discrimination, so schemas are mutually exclusive
      return { isExclusive: true };
    }
    // Case 4: One or both are undefined (default is true in JSON Schema)
    else {
      // Default behavior: if undefined, it typically means additionalProperties: true
      // If one is explicitly false and the other is undefined, they differ
      if (addlProps1 === false || addlProps2 === false) {
        const otherIsUndefined =
          addlProps1 === false ? !isDefined(addlProps2) : !isDefined(addlProps1);

        if (otherIsUndefined) {
          return {
            isExclusive: false,
            reason:
              'One schema explicitly disallows additional properties while the other allows them by default.',
          };
        }
      }
    }
  }

  return { isExclusive: true };
}

function areOneOfSchemasMutuallyExclusive(
  schemas: Array<Oas3Schema | Oas3_1Schema>,
  resolve: UserContext['resolve']
): Pick<ReturnType, 'isExclusive'> & {
  reasons?: string[];
} {
  // Check for ambiguous combinations
  const ambiguousReasons: string[] = [];
  const signatures: SchemaSignature[] = [];

  // Collect signatures
  for (let i = 0; i < schemas.length; i++) {
    signatures.push(createSchemaSignature(schemas[i], resolve));
  }

  // Helper to get schema reference or description
  const getSchemaIdentifier = (schema: Oas3Schema | Oas3_1Schema, index: number): string => {
    if (isRef(schema)) {
      return `\`${schema.$ref}\``;
    }
    if (schema.title) {
      return `\`${schema.title}\` (position ${index + 1})`;
    }
    return `at position ${index + 1}`;
  };

  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const { isExclusive, reason } = areSignaturesMutuallyExclusive(signatures[i], signatures[j]);
      if (!isExclusive) {
        const schema1Id = getSchemaIdentifier(schemas[i], i);
        const schema2Id = getSchemaIdentifier(schemas[j], j);

        const message = `Ambiguous oneOf schemas detected. Schemas ${schema1Id} and ${schema2Id} are not mutually exclusive. ${
          reason ? reason : ''
        }`;
        ambiguousReasons.push(message);
      }
    }
  }

  // If any ambiguous pairs found, return them all
  if (ambiguousReasons.length > 0) {
    return {
      isExclusive: false,
      reasons: ambiguousReasons,
    };
  }

  // All schemas are mutually exclusive
  return { isExclusive: true };
}
