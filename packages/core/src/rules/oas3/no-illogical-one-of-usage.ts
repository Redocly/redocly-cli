import { dequal } from '../../utils/dequal.js';
import { isRef } from '../../ref-utils.js';

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

export const NoIllogicalOneOfUsage: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      skip(node) {
        return !node.oneOf;
      },
      enter(schema: Oas3Schema | Oas3_1Schema, { report, location, resolve }: UserContext) {
        if (schema.oneOf) {
          if (!Array.isArray(schema.oneOf)) return;

          if (schema.oneOf.length < 2) {
            report({
              message: `Schema object \`oneOf\` should contain at least 2 schemas. Use the schema directly instead.`,
              location: location.child(['oneOf']),
            });
          } else {
            // Check for duplicate schemas
            const { isDuplicate, reason: duplicatedReason } = areDuplicatedSchemas(schema.oneOf);
            if (isDuplicate && duplicatedReason) {
              report({
                message: duplicatedReason,
                location,
              });
            }

            // Always check mutual exclusivity - oneOf schemas should ALWAYS be mutually exclusive
            const { isExclusive, reason: exclusivityReason } = areOneOfSchemasMutuallyExclusive(
              schema.oneOf,
              resolve,
              schema
            );

            if (!isExclusive && exclusivityReason) {
              report({
                message: exclusivityReason,
                location: location.child(['oneOf']),
              });
            }
          }
        }
      },
    },
  };
};

function hasNullableType(schema: Oas3Schema | Oas3_1Schema): boolean {
  // Check for OAS 3.0 nullable property
  if ('nullable' in schema && schema.nullable === true) {
    return true;
  }

  // Check for OAS 3.1 type array containing null
  if (schema.type && Array.isArray(schema.type)) {
    return schema.type.includes('null');
  }

  return false;
}

// Helper to get effective minimum/maximum bounds for numeric constraints
function getEffectiveBounds(prop: SchemaSignature): { min: number; max: number } {
  let min = prop.minimum !== undefined ? prop.minimum : -Infinity;
  let max = prop.maximum !== undefined ? prop.maximum : Infinity;

  // Handle exclusiveMinimum
  // OAS 3.0: boolean flag (uses minimum value if true, already set above)
  // OAS 3.1: numeric value that replaces the minimum
  if (typeof prop.exclusiveMinimum === 'number') {
    min = prop.exclusiveMinimum;
  }

  // Handle exclusiveMaximum
  // OAS 3.0: boolean flag (uses maximum value if true, already set above)
  // OAS 3.1: numeric value that replaces the maximum
  if (typeof prop.exclusiveMaximum === 'number') {
    max = prop.exclusiveMaximum;
  }

  return { min, max };
}

// Helper to check if two ranges don't overlap
function rangesDoNotOverlap(min1: number, max1: number, min2: number, max2: number): boolean {
  // Non-overlapping if: max1 < min2 OR max2 < min1
  return max1 < min2 || max2 < min1;
}

function createSchemaSignature(
  schema: Oas3Schema | Oas3_1Schema,
  resolve: UserContext['resolve']
): SchemaSignature {
  // Resolve $ref if present
  if (isRef(schema)) {
    const { node: resolvedSchema } = resolve(schema);
    if (resolvedSchema) {
      return createSchemaSignature(resolvedSchema, resolve);
    }
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
      if (typeof propSchema === 'object' && propSchema !== null) {
        signature.propertySchemas.set(propName, createSchemaSignature(propSchema, resolve));
      }
    }
  }

  if (schema.required) {
    signature.required = new Set(schema.required);
  }

  if (schema.items && typeof schema.items === 'object') {
    signature.items = createSchemaSignature(schema.items, resolve);
  }

  if (schema.additionalProperties !== undefined) {
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
  // Check for null type distinction (OpenAPI 3.1)
  // If one schema is type: null and the other is not, they're mutually exclusive
  const checkIsNull = (sig: SchemaSignature) => {
    return (
      sig.type === 'null' ||
      (Array.isArray(sig.type) && sig.type.length === 1 && sig.type[0] === 'null')
    );
  };

  // If exactly one is null type, they're mutually exclusive
  if (checkIsNull(prop1) !== checkIsNull(prop2)) {
    return { isExclusive: true };
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
  if (prop1.const !== undefined && prop2.const !== undefined) {
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

  // Numeric range constraints - check if ranges don't overlap
  if (
    (prop1.type === 'number' || prop1.type === 'integer') &&
    (prop2.type === 'number' || prop2.type === 'integer')
  ) {
    const bounds1 = getEffectiveBounds(prop1);
    const bounds2 = getEffectiveBounds(prop2);

    if (rangesDoNotOverlap(bounds1.min, bounds1.max, bounds2.min, bounds2.max)) {
      return { isExclusive: true };
    }
  }

  // String length constraints - check if ranges don't overlap
  if (prop1.type === 'string' && prop2.type === 'string') {
    const minLen1 = prop1.minLength ?? 0;
    const maxLen1 = prop1.maxLength ?? Infinity;
    const minLen2 = prop2.minLength ?? 0;
    const maxLen2 = prop2.maxLength ?? Infinity;

    if (rangesDoNotOverlap(minLen1, maxLen1, minLen2, maxLen2)) {
      return { isExclusive: true };
    }

    // Pattern constraints - basic check if patterns are obviously different
    // Note: Full regex overlap detection is complex, so we do simple heuristics
    if (prop1.pattern && prop2.pattern && prop1.pattern !== prop2.pattern) {
      // Check for some obvious non-overlapping patterns
      const numericPattern = /^\^?\[0-9\]/;
      const alphaPattern = /^\^?\[a-zA-Z\]/;

      const isNumeric1 = numericPattern.test(prop1.pattern);
      const isNumeric2 = numericPattern.test(prop2.pattern);
      const isAlpha1 = alphaPattern.test(prop1.pattern);
      const isAlpha2 = alphaPattern.test(prop2.pattern);

      // If one is numeric-only and other is alpha-only, they're mutually exclusive
      if ((isNumeric1 && isAlpha2) || (isAlpha1 && isNumeric2)) {
        return { isExclusive: true };
      }
    }
  }

  // Array length constraints - check if ranges don't overlap
  if (prop1.type === 'array' && prop2.type === 'array') {
    const minItems1 = prop1.minItems ?? 0;
    const maxItems1 = prop1.maxItems ?? Infinity;
    const minItems2 = prop2.minItems ?? 0;
    const maxItems2 = prop2.maxItems ?? Infinity;

    if (rangesDoNotOverlap(minItems1, maxItems1, minItems2, maxItems2)) {
      return { isExclusive: true };
    }
  }

  // Object property count constraints - check if ranges don't overlap
  if (prop1.type === 'object' && prop2.type === 'object') {
    const minProps1 = prop1.minProperties ?? 0;
    const maxProps1 = prop1.maxProperties ?? Infinity;
    const minProps2 = prop2.minProperties ?? 0;
    const maxProps2 = prop2.maxProperties ?? Infinity;

    if (rangesDoNotOverlap(minProps1, maxProps1, minProps2, maxProps2)) {
      return { isExclusive: true };
    }
  }

  return { isExclusive: false };
}

function areSignaturesMutuallyExclusive(sig1: SchemaSignature, sig2: SchemaSignature): ReturnType {
  // Check top-level constraint exclusivity (types, formats, const values, enum values, and all constraints)
  const topLevelResult = arePropertySchemasMutuallyExclusive(sig1, sig2);
  if (topLevelResult.isExclusive || topLevelResult.reason) {
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
          const { isExclusive } = arePropertySchemasMutuallyExclusive(prop1Schema, prop2Schema);

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
      if (ambiguousProperties.length === 0) {
        return { isExclusive: true };
      }

      // Key insight: If ANY required property is mutually exclusive, the schemas are distinguishable
      // Example: artworkType: enum[painting] vs enum[sculpture] makes them mutually exclusive
      // even if they share other properties like artist, dimensions, etc.
      if (sig1.required && sig2.required && mutuallyExclusiveProperties.length > 0) {
        const requiredAndMutuallyExclusive = mutuallyExclusiveProperties.filter(
          (prop) => sig1.required!.has(prop) && sig2.required!.has(prop)
        );

        // If there's at least one required property that's mutually exclusive, schemas are NOT ambiguous
        if (requiredAndMutuallyExclusive.length > 0) {
          return { isExclusive: true };
        }
      }

      // Check if there are any required ambiguous properties that could be discriminators
      // but currently have overlapping values
      let hasRequiredAmbiguousProperty = false;
      if (sig1.required && sig2.required) {
        const requiredIntersection = [...sig1.required].filter(
          (prop) => sig2.required!.has(prop) && ambiguousProperties.includes(prop)
        );
        hasRequiredAmbiguousProperty = requiredIntersection.length > 0;
      }

      // If there's at least one required property with ambiguous values,
      // report ONLY those specific properties (not the "same required fields" message)
      // because fixing that required property would make the schemas distinguishable
      if (hasRequiredAmbiguousProperty) {
        return {
          isExclusive: false,
          reason: `Schemas have overlapping property values that prevent discrimination: ${ambiguousProperties.join(
            ', '
          )}.`,
        };
      }

      // Otherwise, report general overlapping properties
      return {
        isExclusive: false,
        reason: `Schemas have overlapping properties: ${ambiguousProperties.join(', ')}.`,
      };
    }

    // Check if one schema requires properties that the other doesn't have at all
    // This makes them mutually exclusive
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

  // Array items check
  if (sig1.items && sig2.items) {
    const { isExclusive, reason } = areSignaturesMutuallyExclusive(sig1.items, sig2.items);
    if (!isExclusive) {
      return {
        isExclusive: false,
        reason: reason || 'Array items are not mutually exclusive.',
      };
    }
  }

  // additionalProperties check - schemas with conflicting additionalProperties settings
  if (sig1.additionalProperties !== undefined || sig2.additionalProperties !== undefined) {
    const addlProps1 = sig1.additionalProperties;
    const addlProps2 = sig2.additionalProperties;

    // If one explicitly disallows additional properties (false) and the other allows them (true or schema)
    // AND they have overlapping required properties, this creates ambiguity
    const allowsAdditional1 = addlProps1 !== false;
    const allowsAdditional2 = addlProps2 !== false;

    if (allowsAdditional1 !== allowsAdditional2) {
      // Check if they have overlapping required properties
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

function areDuplicatedSchemas(schemas: Array<Oas3Schema | Oas3_1Schema>): {
  isDuplicate: boolean;
  reason?: string;
} {
  const seen = new Map<string, number>();

  for (let i = 0; i < schemas.length; i++) {
    const schema = schemas[i];
    const schemaStr = JSON.stringify(schema);

    if (seen.has(schemaStr)) {
      return {
        isDuplicate: true,
        reason: `Duplicate schema found in \`oneOf\` at positions ${seen.get(schemaStr)} and ${i}.`,
      };
    } else {
      seen.set(schemaStr, i);
    }
  }

  return { isDuplicate: false };
}

function areOneOfSchemasMutuallyExclusive(
  schemas: Array<Oas3Schema | Oas3_1Schema>,
  resolve: UserContext['resolve'],
  parentSchema: Oas3Schema | Oas3_1Schema
): ReturnType {
  // Check for empty schemas first - an empty schema {} accepts any value
  for (let i = 0; i < schemas.length; i++) {
    const schema = schemas[i];

    // Skip $ref schemas - they're not empty
    if (isRef(schema)) continue;

    // Check if schema is empty (no properties defined)
    const keys = Object.keys(schema);
    if (keys.length === 0) {
      return {
        isExclusive: false,
        reason: `Empty schema at position ${i} in \`oneOf\` matches all values and cannot be mutually exclusive.`,
      };
    }
  }

  // Check for impossible nullable + oneOf with null type combination
  // This is a specific anti-pattern where the parent schema is nullable
  // AND one of the oneOf options is type: 'null', making it impossible to distinguish
  if (hasNullableType(parentSchema)) {
    const hasNullTypeInOneOf = schemas.some((subSchema) => {
      if (isRef(subSchema)) {
        const { node: resolved } = resolve(subSchema);
        if (resolved && hasNullableType(resolved)) {
          return true;
        }
      }
      return hasNullableType(subSchema);
    });

    if (hasNullTypeInOneOf) {
      return {
        isExclusive: false,
        reason: `Schema with nullable type cannot have a oneOf option that is also nullable. This creates ambiguity when the value is null.`,
      };
    }
  }

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
      return `\`${schema.title}\` (position ${index})`;
    }
    return `position ${index}`;
  };

  // Check for ambiguous combinations
  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const { isExclusive, reason } = areSignaturesMutuallyExclusive(signatures[i], signatures[j]);
      if (!isExclusive) {
        const schema1Id = getSchemaIdentifier(schemas[i], i);
        const schema2Id = getSchemaIdentifier(schemas[j], j);

        return {
          isExclusive: false,
          reason: `Ambiguous oneOf schemas detected. Schemas ${schema1Id} and ${schema2Id} are not mutually exclusive. ${
            reason ? reason : ''
          }`,
        };
      }
    }
  }

  return { isExclusive: false };
}
