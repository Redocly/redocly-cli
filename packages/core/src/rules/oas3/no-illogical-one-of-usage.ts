import { dequal } from '../../utils/dequal.js';
import { isRef } from '../../ref-utils.js';
import { areDuplicatedSchemas } from '../utils.js';
import { isEmptyObject, isDefined, isPlainObject } from '../../utils.js';

import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

type SchemaSignature = {
  properties?: Set<string>;
  propertySchemas?: Map<string, SchemaSignature>;
  type?: string | string[];
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

type RangeBounds = {
  min: number;
  max: number;
  minExclusive: boolean;
  maxExclusive: boolean;
};

export const NoIllogicalOneOfUsage: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      skip(node) {
        return !node.oneOf;
      },
      enter(schema: Oas3Schema | Oas3_1Schema, { report, location, resolve }: UserContext) {
        if (!schema.oneOf) return;
        if (!Array.isArray(schema.oneOf)) return;
        const oneOfSchemas = schema.oneOf;

        if (oneOfSchemas.length < 2) {
          report({
            message: `Schema object \`oneOf\` should contain at least 2 schemas. Use the schema directly instead.`,
            location: location.child(['oneOf']),
          });
        } else {
          // Check for empty schema
          for (let i = 0; i < oneOfSchemas.length; i++) {
            if (areSchemaEmpty(oneOfSchemas[i], resolve)) {
              report({
                message:
                  'Schema in `oneOf` is empty, which makes it impossible to discriminate between schemas.',
                location: location.child(['oneOf', String(i)]),
              });
              return;
            }
          }

          // Check for nullable type
          // Check for impossible nullable + oneOf with null type combination
          if (hasNullableType(schema)) {
            const hasNullTypeInOneOf = oneOfSchemas.some((subSchema) => {
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

          // Check for duplicate schemas
          const { isDuplicated, reason: duplicatedReason } = areDuplicatedSchemas(
            oneOfSchemas,
            'oneOf'
          );
          if (isDuplicated && duplicatedReason) {
            report({
              message: duplicatedReason,
              location: location.child(['oneOf']),
            });

            return;
          }

          // Always check mutual exclusivity - oneOf schemas should ALWAYS be mutually exclusive
          const { isExclusive, reasons } = areOneOfSchemasMutuallyExclusive(oneOfSchemas, resolve);

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

function areSchemaEmpty(
  schema: Oas3Schema | Oas3_1Schema,
  resolve: UserContext['resolve']
): boolean {
  const resolvedSchema = resolveSchema(schema, resolve);

  // Check if schema is empty (no properties defined)
  return isEmptyObject(resolvedSchema);
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

// Helper to get effective minimum/maximum bounds for numeric constraints
function getEffectiveBounds(prop: SchemaSignature): RangeBounds {
  let min = isDefined(prop.minimum) ? prop.minimum : -Infinity;
  let max = isDefined(prop.maximum) ? prop.maximum : Infinity;
  let minExclusive = false;
  let maxExclusive = false;

  // Handle exclusiveMinimum
  // OAS 3.0: boolean flag (if true, the boundary is exclusive)
  // OAS 3.1: numeric value that replaces the minimum
  if (typeof prop.exclusiveMinimum === 'number') {
    // OAS 3.1 style: exclusiveMinimum is the actual exclusive minimum value
    min = prop.exclusiveMinimum;
    minExclusive = true;
  } else if (prop.exclusiveMinimum === true && isDefined(prop.minimum)) {
    // OAS 3.0 style: exclusiveMinimum is a boolean
    minExclusive = true;
  }

  // Handle exclusiveMaximum
  // OAS 3.0: boolean flag (if true, the boundary is exclusive)
  // OAS 3.1: numeric value that replaces the maximum
  if (typeof prop.exclusiveMaximum === 'number') {
    // OAS 3.1 style: exclusiveMaximum is the actual exclusive maximum value
    max = prop.exclusiveMaximum;
    maxExclusive = true;
  } else if (prop.exclusiveMaximum === true && isDefined(prop.maximum)) {
    // OAS 3.0 style: exclusiveMaximum is a boolean
    maxExclusive = true;
  }

  return { min, max, minExclusive, maxExclusive };
}

// Unified function to check if two ranges overlap
function doRangesOverlap(bounds1: RangeBounds, bounds2: RangeBounds): boolean {
  const {
    min: min1,
    max: max1,
    minExclusive: min1Exclusive,
    maxExclusive: max1Exclusive,
  } = bounds1;
  const {
    min: min2,
    max: max2,
    minExclusive: min2Exclusive,
    maxExclusive: max2Exclusive,
  } = bounds2;

  // Ranges overlap if they are NOT completely separated
  // Range1 is completely before range2 if:
  const range1BeforeRange2 = (() => {
    if (max1Exclusive && min2Exclusive) {
      return max1 <= min2;
    } else if (max1Exclusive || min2Exclusive) {
      return max1 <= min2;
    } else {
      return max1 < min2;
    }
  })();

  // Range2 is completely before range1 if:
  const range2BeforeRange1 = (() => {
    if (max2Exclusive && min1Exclusive) {
      return max2 <= min1;
    } else if (max2Exclusive || min1Exclusive) {
      return max2 <= min1;
    } else {
      return max2 < min1;
    }
  })();

  // Ranges overlap if neither is completely before the other
  return !range1BeforeRange2 && !range2BeforeRange1;
}

// Helper to check range constraints for any type
function checkRangeConstraints(
  prop1: SchemaSignature,
  prop2: SchemaSignature,
  type: 'numeric' | 'string' | 'array' | 'object'
): ReturnType | null {
  let hasConstraints1 = false;
  let hasConstraints2 = false;
  let bounds1: RangeBounds;
  let bounds2: RangeBounds;
  let errorMessage = '';

  switch (type) {
    case 'numeric':
      hasConstraints1 =
        isDefined(prop1.minimum) ||
        isDefined(prop1.maximum) ||
        isDefined(prop1.exclusiveMinimum) ||
        isDefined(prop1.exclusiveMaximum);
      hasConstraints2 =
        isDefined(prop2.minimum) ||
        isDefined(prop2.maximum) ||
        isDefined(prop2.exclusiveMinimum) ||
        isDefined(prop2.exclusiveMaximum);

      if (hasConstraints1 || hasConstraints2) {
        bounds1 = getEffectiveBounds(prop1);
        bounds2 = getEffectiveBounds(prop2);
        errorMessage = 'Schemas have overlapping numeric ranges.';
      }
      break;

    case 'string':
      hasConstraints1 = isDefined(prop1.minLength) || isDefined(prop1.maxLength);
      hasConstraints2 = isDefined(prop2.minLength) || isDefined(prop2.maxLength);

      if (hasConstraints1 || hasConstraints2) {
        bounds1 = {
          min: prop1.minLength ?? 0,
          max: prop1.maxLength ?? Infinity,
          minExclusive: false,
          maxExclusive: false,
        };
        bounds2 = {
          min: prop2.minLength ?? 0,
          max: prop2.maxLength ?? Infinity,
          minExclusive: false,
          maxExclusive: false,
        };
        errorMessage = 'Schemas have overlapping string length ranges.';
      }
      break;

    case 'array':
      hasConstraints1 = isDefined(prop1.minItems) || isDefined(prop1.maxItems);
      hasConstraints2 = isDefined(prop2.minItems) || isDefined(prop2.maxItems);

      if (hasConstraints1 || hasConstraints2) {
        bounds1 = {
          min: prop1.minItems ?? 0,
          max: prop1.maxItems ?? Infinity,
          minExclusive: false,
          maxExclusive: false,
        };
        bounds2 = {
          min: prop2.minItems ?? 0,
          max: prop2.maxItems ?? Infinity,
          minExclusive: false,
          maxExclusive: false,
        };
        errorMessage = 'Schemas have overlapping array item count ranges.';
      }
      break;

    case 'object':
      hasConstraints1 = isDefined(prop1.minProperties) || isDefined(prop1.maxProperties);
      hasConstraints2 = isDefined(prop2.minProperties) || isDefined(prop2.maxProperties);

      if (hasConstraints1 || hasConstraints2) {
        bounds1 = {
          min: prop1.minProperties ?? 0,
          max: prop1.maxProperties ?? Infinity,
          minExclusive: false,
          maxExclusive: false,
        };
        bounds2 = {
          min: prop2.minProperties ?? 0,
          max: prop2.maxProperties ?? Infinity,
          minExclusive: false,
          maxExclusive: false,
        };
        errorMessage = 'Schemas have overlapping property count ranges.';
      }
      break;
  }

  // Only check if BOTH schemas have constraints - if only one has constraints, it's not useful for exclusivity
  if (hasConstraints1 && hasConstraints2) {
    // Check if ranges are identical - if so, they don't help with mutual exclusivity
    if (
      bounds1!.min === bounds2!.min &&
      bounds1!.max === bounds2!.max &&
      bounds1!.minExclusive === bounds2!.minExclusive &&
      bounds1!.maxExclusive === bounds2!.maxExclusive
    ) {
      // Identical ranges don't help distinguish schemas
      return null;
    }

    if (doRangesOverlap(bounds1!, bounds2!)) {
      return {
        isExclusive: false,
        reason: errorMessage,
      };
    }
    // If ranges don't overlap, they're mutually exclusive
    return { isExclusive: true };
  }

  return null;
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
    if (value === undefined || specialProperties.has(key)) {
      continue; // Skip undefined values and special properties
    }

    // Clone arrays to avoid mutation
    if (Array.isArray(value)) {
      (signature as Record<string, unknown>)[key] = [...value];
    } else {
      (signature as Record<string, unknown>)[key] = value;
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

function arePropertySchemasMutuallyExclusive(
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
    const hasOverlap = overlappingEnums.length > 0;

    return hasOverlap
      ? {
          isExclusive: false,
          reason: `Schemas have overlapping enum values: ${JSON.stringify(overlappingEnums)}.`,
        }
      : { isExclusive: true };
  }

  // If both have const values and they're different, they're mutually exclusive
  if (isDefined(prop1.const) && isDefined(prop2.const)) {
    const areDifferent = !dequal(prop1.const, prop2.const);

    return areDifferent
      ? { isExclusive: true }
      : {
          isExclusive: false,
          reason: `Both schemas have the same const value: ${JSON.stringify(prop1.const)}.`,
        };
  }

  // If types are different, they're mutually exclusive
  if (prop1.type && prop2.type && !dequal(prop1.type, prop2.type)) {
    return { isExclusive: true };
  }

  // If same type but different formats, they're mutually exclusive
  if (prop1.type && prop2.type && dequal(prop1.type, prop2.type)) {
    if (prop1.format && prop2.format && prop1.format !== prop2.format) {
      return { isExclusive: true };
    }
  }

  // Check range constraints using unified function
  if (prop1.type === 'number' || prop1.type === 'integer') {
    if (prop2.type === 'number' || prop2.type === 'integer') {
      const rangeResult = checkRangeConstraints(prop1, prop2, 'numeric');
      if (rangeResult) return rangeResult;
    }
  }

  if (prop1.type === 'string' && prop2.type === 'string') {
    const rangeResult = checkRangeConstraints(prop1, prop2, 'string');
    if (rangeResult) return rangeResult;

    // Pattern constraints - basic check if patterns are obviously different
    if (prop1.pattern && prop2.pattern && prop1.pattern !== prop2.pattern) {
      const numericPattern = /^\^?\[0-9\]/;
      const alphaPattern = /^\^?\[a-zA-Z\]/;
      const lowerAlphaPattern = /^\^?\[a-z\]/;
      const upperAlphaPattern = /^\^?\[A-Z\]/;

      const isNumeric1 = numericPattern.test(prop1.pattern);
      const isNumeric2 = numericPattern.test(prop2.pattern);
      const isAlpha1 =
        alphaPattern.test(prop1.pattern) ||
        lowerAlphaPattern.test(prop1.pattern) ||
        upperAlphaPattern.test(prop1.pattern);
      const isAlpha2 =
        alphaPattern.test(prop2.pattern) ||
        lowerAlphaPattern.test(prop2.pattern) ||
        upperAlphaPattern.test(prop2.pattern);

      // If one is numeric-only and other is alpha-only, they're mutually exclusive
      if ((isNumeric1 && isAlpha2) || (isAlpha1 && isNumeric2)) {
        return { isExclusive: true };
      }
    }
  }

  if (prop1.type === 'array' && prop2.type === 'array') {
    const rangeResult = checkRangeConstraints(prop1, prop2, 'array');
    if (rangeResult) return rangeResult;
  }

  if (prop1.type === 'object' && prop2.type === 'object') {
    const rangeResult = checkRangeConstraints(prop1, prop2, 'object');
    if (rangeResult) return rangeResult;
  }

  // If we reach here, the properties have not been proven to be mutually exclusive
  return { isExclusive: false };
}

function areSignaturesMutuallyExclusive(sig1: SchemaSignature, sig2: SchemaSignature): ReturnType {
  // Check top-level constraint exclusivity (types, formats, const values, enum values, and all constraints)
  const topLevelResult = arePropertySchemasMutuallyExclusive(sig1, sig2);
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
          const { isExclusive, reason } = arePropertySchemasMutuallyExclusive(
            prop1Schema,
            prop2Schema
          );

          if (!isExclusive && reason) {
            return {
              isExclusive,
              reason,
            };
          }

          // A property is truly mutually exclusive only if:
          // 1. It has mutually exclusive values (different types, enums, etc.), AND
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

      // Check if there are any required ambiguous properties
      let hasRequiredAmbiguousProperty = false;
      if (sig1.required && sig2.required) {
        const requiredIntersection = [...sig1.required].filter(
          (prop) => sig2.required!.has(prop) && ambiguousProperties.includes(prop)
        );
        hasRequiredAmbiguousProperty = requiredIntersection.length > 0;
      }

      if (hasRequiredAmbiguousProperty) {
        return {
          isExclusive: false,
          reason: `Schemas have overlapping property values that prevent discrimination: ${ambiguousProperties.join(
            ', '
          )}.`,
        };
      }

      if (ambiguousProperties.length > 0) {
        return {
          isExclusive: false,
          reason: `Schemas have overlapping properties: ${ambiguousProperties.join(', ')}.`,
        };
      }

      return { isExclusive: true };
    }

    // Check if one schema requires properties that the other doesn't have at all
    if (sig1.required && sig1.required.size > 0) {
      const requiredNotInSig2Properties = [...sig1.required].filter(
        (prop) => !sig2.properties || !sig2.properties.has(prop)
      );
      if (requiredNotInSig2Properties.length > 0) {
        return { isExclusive: true };
      }
    }

    if (sig2.required && sig2.required.size > 0) {
      const requiredNotInSig1Properties = [...sig2.required].filter(
        (prop) => !sig1.properties || !sig1.properties.has(prop)
      );
      if (requiredNotInSig1Properties.length > 0) {
        return { isExclusive: true };
      }
    }
  }

  // additionalProperties check
  if (isDefined(sig1.additionalProperties) || isDefined(sig2.additionalProperties)) {
    const addlProps1 = sig1.additionalProperties;
    const addlProps2 = sig2.additionalProperties;

    const allowsAdditional1 = addlProps1 !== false;
    const allowsAdditional2 = addlProps2 !== false;

    if (allowsAdditional1 !== allowsAdditional2) {
      if (sig1.required && sig2.required) {
        const requiredOverlap = [...sig1.required].filter((prop) => sig2.required!.has(prop));
        if (requiredOverlap.length > 0) {
          return {
            isExclusive: false,
            reason: `Schemas have conflicting additionalProperties settings with overlapping required properties: ${requiredOverlap.join(
              ', '
            )}.`,
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
