import { isRef } from '../../ref-utils.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import { dequal } from '../../utils/dequal.js';
import { isDefined } from '../../utils/is-defined.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

type SchemaSignature = {
  properties?: Set<string>;
  propertySchemas?: Map<string, SchemaSignature>;
  enum?: string[];
  items?: SchemaSignature;
  additionalProperties?: boolean | SchemaSignature;
  required?: Set<string>;
  [key: string]: unknown;
};

type ExclusivityResult = {
  isExclusive: boolean;
  reason?: string;
};

export const NoIllogicalCompositionKeywords: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      skip(node) {
        if (!node || typeof node !== 'object') return true;
        return !('oneOf' in node || 'anyOf' in node || 'allOf' in node);
      },
      enter(schema, { report, location, resolve }) {
        let keyword: 'oneOf' | 'anyOf' | 'allOf' | undefined;
        let schemas: Array<Oas3Schema | Oas3_1Schema> | undefined;

        if (Array.isArray(schema.oneOf)) {
          keyword = 'oneOf';
          schemas = schema.oneOf;
        } else if (Array.isArray(schema.anyOf)) {
          keyword = 'anyOf';
          schemas = schema.anyOf;
        } else if (Array.isArray(schema.allOf)) {
          keyword = 'allOf';
          schemas = schema.allOf;
        }

        if (!keyword || !schemas) return;

        // oneOf and anyOf require at least 2 schemas; use the schema directly otherwise
        if ((keyword === 'oneOf' || keyword === 'anyOf') && schemas.length < 2) {
          report({
            message: `Schema object '${keyword}' should contain at least 2 schemas. Use the schema directly instead.`,
            location: location.child([keyword]),
          });
          return;
        }

        // Empty schemas are meaningless in any composition keyword
        for (let i = 0; i < schemas.length; i++) {
          const resolvedSchema = resolveSchema(schemas[i], resolve);
          if (resolvedSchema && isEmptyObject(resolvedSchema)) {
            report({
              message: `Schema is empty.`,
              location: location.child([keyword, String(i)]),
            });
            return;
          }
        }

        if (keyword === 'oneOf') {
          // Duplicate schemas make oneOf impossible to discriminate
          for (let i = 0; i < schemas.length - 1; i++) {
            for (let j = i + 1; j < schemas.length; j++) {
              if (dequal(schemas[i], schemas[j])) {
                report({
                  message: `Duplicate schemas found in 'oneOf', which makes it impossible to discriminate between schemas.`,
                  location: location.child(['oneOf']),
                });
                return;
              }
            }
          }

          // A nullable parent with a nullable oneOf option creates null ambiguity
          if (hasNullableType(schema)) {
            const hasNullTypeInOneOf = schemas.some((subSchema) => {
              const resolved = resolveSchema(subSchema, resolve);
              return resolved ? hasNullableType(resolved) : false;
            });

            if (hasNullTypeInOneOf) {
              report({
                message: `Schema with nullable type cannot have a oneOf option that is also nullable. This creates ambiguity when the value is null.`,
                location: location.child(['oneOf']),
              });
              return;
            }
          }

          checkOneOfSchemasMutuallyExclusive(schemas, resolve, report, location);
        }
      },
    },
  };
};

/** Resolves a schema $ref to its target node. Returns undefined if the ref cannot be resolved. */
function resolveSchema(
  schema: Oas3Schema | Oas3_1Schema,
  resolve: UserContext['resolve']
): Oas3Schema | Oas3_1Schema | undefined {
  if (isRef(schema)) {
    const { node: resolvedSchema } = resolve(schema);
    return resolvedSchema ?? undefined;
  }
  return schema;
}

/** Checks if a schema represents a nullable type (OAS 3.0 nullable or OAS 3.1 type array/null). */
function hasNullableType(schema: Oas3Schema | Oas3_1Schema | SchemaSignature): boolean {
  if ('nullable' in schema && schema.nullable === true) return true;
  if (schema.type === 'null') return true;
  if (schema.type && Array.isArray(schema.type)) return (schema.type as string[]).includes('null');
  return false;
}

/** Builds a normalized signature of a schema for mutual exclusivity comparison, with cycle detection. */
function createSchemaSignature(
  schema: Oas3Schema | Oas3_1Schema,
  resolve: UserContext['resolve'],
  visited: Set<object> = new Set()
): SchemaSignature {
  const resolvedSchema = resolveSchema(schema, resolve);
  if (!resolvedSchema) return {};

  if (visited.has(resolvedSchema)) return {};
  visited.add(resolvedSchema);

  const signature: SchemaSignature = {};
  const specialProperties = new Set(['properties', 'required', 'items', 'additionalProperties']);

  for (const [key, value] of Object.entries(resolvedSchema)) {
    if (!isDefined(value) || specialProperties.has(key)) continue;
    signature[key] = Array.isArray(value) ? [...value] : value;
  }

  if (resolvedSchema.properties) {
    signature.properties = new Set(Object.keys(resolvedSchema.properties));
    signature.propertySchemas = new Map();
    for (const [propName, propSchema] of Object.entries(resolvedSchema.properties)) {
      if (isPlainObject(propSchema)) {
        signature.propertySchemas.set(
          propName,
          createSchemaSignature(propSchema, resolve, visited)
        );
      }
    }
  }

  if (resolvedSchema.required) {
    signature.required = new Set(resolvedSchema.required);
  }

  if (resolvedSchema.items && isPlainObject(resolvedSchema.items)) {
    signature.items = createSchemaSignature(resolvedSchema.items, resolve, visited);
  }

  if (isDefined(resolvedSchema.additionalProperties)) {
    if (typeof resolvedSchema.additionalProperties === 'boolean') {
      signature.additionalProperties = resolvedSchema.additionalProperties;
    } else {
      signature.additionalProperties = createSchemaSignature(
        resolvedSchema.additionalProperties,
        resolve,
        visited
      );
    }
  }

  return signature;
}

/** Checks if two schema signatures are mutually exclusive based on their constraints. */
function arePropertiesMutuallyExclusive(
  prop1: SchemaSignature,
  prop2: SchemaSignature
): ExclusivityResult {
  if (hasNullableType(prop1) && hasNullableType(prop2)) {
    return { isExclusive: false, reason: 'Both schemas allow null values, creating ambiguity.' };
  }

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

  if (prop1.const && prop2.const) {
    return !dequal(prop1.const, prop2.const)
      ? { isExclusive: true }
      : {
          isExclusive: false,
          reason: `Both schemas have the same const value: ${JSON.stringify(prop1.const)}.`,
        };
  }

  if (prop1.type && prop2.type && !isPlainObject(prop1.type) && !isPlainObject(prop2.type)) {
    if (!dequal(prop1.type, prop2.type)) return { isExclusive: true };
    if (prop1.format && prop2.format && prop1.format !== prop2.format) return { isExclusive: true };
    return { isExclusive: false };
  }

  return { isExclusive: true };
}

/** Recursively checks if two schema signatures are mutually exclusive, with a depth limit. */
function areSignaturesMutuallyExclusive(
  sig1: SchemaSignature,
  sig2: SchemaSignature,
  depth: number = 0
): ExclusivityResult {
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) {
    // Cannot determine exclusivity at this depth — assume exclusive to avoid false positives
    return { isExclusive: true };
  }

  const topLevelResult = arePropertiesMutuallyExclusive(sig1, sig2);
  if (!topLevelResult.isExclusive && topLevelResult.reason) {
    return topLevelResult;
  }

  if (sig1.properties && sig2.properties) {
    const intersection = [...sig1.properties].filter((prop) => sig2.properties!.has(prop));
    if (intersection.length > 0) {
      const ambiguousProperties: string[] = [];
      const mutuallyExclusiveProperties: string[] = [];

      for (const propName of intersection) {
        const prop1Schema = sig1.propertySchemas?.get(propName);
        const prop2Schema = sig2.propertySchemas?.get(propName);

        if (prop1Schema && prop2Schema) {
          const { isExclusive, reason } = arePropertiesMutuallyExclusive(prop1Schema, prop2Schema);
          if (!isExclusive && reason) return { isExclusive, reason };

          const isRequiredInBoth = sig1.required?.has(propName) && sig2.required?.has(propName);
          if (isExclusive && isRequiredInBoth) {
            mutuallyExclusiveProperties.push(propName);
          } else if (!isExclusive) {
            ambiguousProperties.push(propName);
          }
        } else {
          ambiguousProperties.push(propName);
        }
      }

      if (ambiguousProperties.length === 0 && mutuallyExclusiveProperties.length > 0) {
        return { isExclusive: true };
      }

      if (sig1.required && sig2.required && mutuallyExclusiveProperties.length > 0) {
        const requiredAndMutuallyExclusive = mutuallyExclusiveProperties.filter(
          (prop) => sig1.required!.has(prop) && sig2.required!.has(prop)
        );
        if (requiredAndMutuallyExclusive.length > 0) return { isExclusive: true };
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

  // Check additionalProperties schemas for discrimination (schema-vs-schema only)
  const addlProps1 = sig1.additionalProperties;
  const addlProps2 = sig2.additionalProperties;

  if (isPlainObject(addlProps1) && isPlainObject(addlProps2)) {
    const addlPropsResult = areSignaturesMutuallyExclusive(
      addlProps1 as SchemaSignature,
      addlProps2 as SchemaSignature,
      depth + 1
    );
    if (!addlPropsResult.isExclusive) {
      return {
        isExclusive: false,
        reason: `Schemas have overlapping additionalProperties definitions. ${addlPropsResult.reason ?? ''}`,
      };
    }
    return { isExclusive: true };
  }

  return { isExclusive: true };
}

/** Reports ambiguous oneOf schema pairs that are not mutually exclusive. */
function checkOneOfSchemasMutuallyExclusive(
  schemas: Array<Oas3Schema | Oas3_1Schema>,
  resolve: UserContext['resolve'],
  report: UserContext['report'],
  location: UserContext['location']
) {
  const signatures = schemas.map((s) => createSchemaSignature(s, resolve));

  const getSchemaIdentifier = (schema: Oas3Schema | Oas3_1Schema, index: number): string => {
    if (isRef(schema)) return `\`${schema.$ref}\``;
    if (schema.title) return `\`${schema.title}\` (position ${index + 1})`;
    return `at position ${index + 1}`;
  };

  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const { isExclusive, reason } = areSignaturesMutuallyExclusive(signatures[i], signatures[j]);
      if (!isExclusive) {
        report({
          message: `Ambiguous oneOf schemas detected. Schemas ${getSchemaIdentifier(schemas[i], i)} and ${getSchemaIdentifier(schemas[j], j)} are not mutually exclusive. ${reason ?? ''}`,
          location: location.child(['oneOf']),
        });
      }
    }
  }
}
