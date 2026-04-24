import { isRef } from '../../ref-utils.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import { dequal } from '../../utils/dequal.js';
import { isDefined } from '../../utils/is-defined.js';
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

        if ((keyword === 'oneOf' || keyword === 'anyOf') && schemas.length < 2) {
          report({
            message: `Schema object '${keyword}' should contain at least 2 schemas. Use the schema directly instead.`,
            location: location.child([keyword]).key(),
          });
          return;
        }

        if (keyword === 'oneOf') {
          for (let i = 0; i < schemas.length - 1; i++) {
            for (let j = i + 1; j < schemas.length; j++) {
              if (dequal(schemas[i], schemas[j])) {
                report({
                  message: `Duplicate schemas found in 'oneOf', which makes it impossible to discriminate between schemas.`,
                  location: location.child(['oneOf']).key(),
                });
                return;
              }
            }
          }

          if (hasNullableType(schema)) {
            const hasNullTypeInOneOf = schemas.some((subSchema) => {
              const resolved = resolveSchema(subSchema, resolve);
              return resolved ? hasNullableType(resolved) : false;
            });

            if (hasNullTypeInOneOf) {
              report({
                message: `Schema with nullable type cannot have a oneOf option that is also nullable. This creates ambiguity when the value is null.`,
                location: location.child(['oneOf']).key(),
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

function hasNullableType(schema: Oas3Schema | Oas3_1Schema | SchemaSignature): boolean {
  if ('nullable' in schema && schema.nullable === true) return true;
  if (schema.type === 'null') return true;
  if (schema.type && Array.isArray(schema.type)) return schema.type.includes('null');
  return false;
}

function isObjectLike(sig: SchemaSignature): boolean {
  if (!sig.type) return true;
  if (sig.type === 'object') return true;
  if (Array.isArray(sig.type) && sig.type.includes('object')) return true;
  return false;
}

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

function hasExclusiveConstraints(sig1: SchemaSignature, sig2: SchemaSignature): boolean {
  if (sig1.enum && sig2.enum) {
    return !sig1.enum.some((v) => sig2.enum!.some((v2) => dequal(v, v2)));
  }

  if (sig1.const && sig2.const) {
    return !dequal(sig1.const, sig2.const);
  }

  if (sig1.type && sig2.type && !isPlainObject(sig1.type) && !isPlainObject(sig2.type)) {
    if (!dequal(sig1.type, sig2.type)) return true;
    if (sig1.format && sig2.format && sig1.format !== sig2.format) return true;
  }

  return false;
}

function findOverlapReason(
  sig1: SchemaSignature,
  sig2: SchemaSignature,
  depth: number = 0
): string | null {
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) return null;

  if (hasNullableType(sig1) && hasNullableType(sig2)) {
    return 'Both schemas allow null values, creating ambiguity.';
  }

  if (sig1.enum && sig2.enum) {
    const overlap = sig1.enum.filter((v) => sig2.enum!.some((v2) => dequal(v, v2)));
    return overlap.length > 0
      ? `Schemas have overlapping enum values: ${JSON.stringify(overlap)}.`
      : null;
  }

  if (sig1.const && sig2.const) {
    return dequal(sig1.const, sig2.const)
      ? `Both schemas have the same const value: ${JSON.stringify(sig1.const)}.`
      : null;
  }

  if (hasExclusiveConstraints(sig1, sig2)) return null;

  if (sig1.properties && sig2.properties) {
    const shared = [...sig1.properties].filter((p) => sig2.properties!.has(p));
    if (
      sig1.required &&
      sig2.required &&
      ![...sig1.required].some((p) => sig2.required!.has(p)) &&
      !shared.some((p) => sig1.required!.has(p) || sig2.required!.has(p))
    ) {
      return null;
    }
    if (shared.length > 0) {
      const ambiguous: string[] = [];
      for (const prop of shared) {
        const s1 = sig1.propertySchemas?.get(prop);
        const s2 = sig2.propertySchemas?.get(prop);

        const isDiscriminatorProp =
          s1 &&
          s2 &&
          hasExclusiveConstraints(s1, s2) &&
          sig1.required?.has(prop) &&
          sig2.required?.has(prop);

        if (isDiscriminatorProp) return null;
        ambiguous.push(prop);
      }
      if (ambiguous.length > 0) {
        return `Schemas have overlapping properties: ${ambiguous.join(', ')}. Consider using a discriminator or ensuring that shared properties have mutually exclusive constraints.`;
      }
    }
  }

  if (isPlainObject(sig1.additionalProperties) && isPlainObject(sig2.additionalProperties)) {
    const nested = findOverlapReason(
      sig1.additionalProperties as SchemaSignature,
      sig2.additionalProperties as SchemaSignature,
      depth + 1
    );
    if (nested) {
      return `Schemas have overlapping additionalProperties definitions. ${nested}`;
    }
  }

  if (isObjectLike(sig1) && isObjectLike(sig2) && sig1.properties && sig2.properties) {
    if (sig1.additionalProperties !== sig2.additionalProperties) {
      return 'At least one schema allows additional properties, so a value valid for one may also satisfy the other.';
    }
  }

  return null;
}

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

  for (let i = 0; i < signatures.length - 1; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const reason = findOverlapReason(signatures[i], signatures[j]);
      if (!reason) continue;
      report({
        message: `Ambiguous oneOf schemas detected. Schemas ${getSchemaIdentifier(schemas[i], i)} and ${getSchemaIdentifier(schemas[j], j)} are not mutually exclusive. ${reason}`,
        location: location.child(['oneOf']).key(),
      });
    }
  }
}
