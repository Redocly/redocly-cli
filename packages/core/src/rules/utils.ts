import levenshtein = require('js-levenshtein');
import { UserContext } from '../walk';
import { Location } from '../ref-utils';
import { validateJsonSchema } from './ajv';
import { Oas3Schema, Referenced } from '../typings/openapi';

export function oasTypeOf(value: unknown) {
  if (Array.isArray(value)) {
    return 'array';
  } else if (value === null) {
    return 'null';
  } else {
    return typeof value;
  }
}

/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns boolean
 */
export function matchesJsonSchemaType(value: unknown, type: string, nullable: boolean): boolean {
  if (nullable && value === null) {
    return value === null;
  }

  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    case 'integer':
      return Number.isInteger(value);
    default:
      return typeof value === type;
  }
}

export function missingRequiredField(type: string, field: string): string {
  return `${type} object should contain \`${field}\` field.`;
}

export function fieldNonEmpty(type: string, field: string): string {
  return `${type} object \`${field}\` must be non-empty string.`;
}

export function validateDefinedAndNonEmpty(fieldName: string, value: any, ctx: UserContext) {
  if (typeof value !== 'object') {
    return;
  }

  if (value[fieldName] === undefined) {
    ctx.report({
      message: missingRequiredField(ctx.type.name, fieldName),
      location: ctx.location.child([fieldName]).key(),
    });
  } else if (!value[fieldName]) {
    ctx.report({
      message: fieldNonEmpty(ctx.type.name, fieldName),
      location: ctx.location.child([fieldName]).key(),
    });
  }
}

export function getSuggest(given: string, variants: string[]): string[] {
  if (typeof given !== 'string' || !variants.length) return [];

  const distances: Array<{ variant: string; distance: number }> = [];

  for (let i = 0; i < variants.length; i++) {
    const distance = levenshtein(given, variants[i]);
    if (distance < 4) {
      distances.push({ distance, variant: variants[i] });
    }
  }

  distances.sort((a, b) => a.distance - b.distance);

  // if (bestMatch.distance <= 4) return bestMatch.string;
  return distances.map((d) => d.variant);
}

export function validateExample(
  example: any,
  schema: Referenced<Oas3Schema>,
  dataLoc: Location,
  { resolve, location, report }: UserContext,
  disallowAdditionalProperties: boolean,
) {
  try {
    const { valid, errors } = validateJsonSchema(
      example,
      schema,
      location.child('schema'),
      dataLoc.pointer,
      resolve,
      disallowAdditionalProperties,
    );
    if (!valid) {
      for (let error of errors) {
        report({
          message: `Example value must conform to the schema: ${error.message}.`,
          location: {
            ...new Location(dataLoc.source, error.instancePath),
            reportOnKey: error.keyword === 'additionalProperties',
          },
          from: location,
          suggest: error.suggest,
        });
      }
    }
  } catch (e) {
    report({
      message: `Example validation errored: ${e.message}.`,
      location: location.child('schema'),
      from: location,
    });
  }
}
