import Ajv2020, {
  type AnySchema,
  type Options,
  type ValidateFunction,
  type Ajv2020 as Ajv2020Instance,
} from '@redocly/ajv/dist/2020.js';
import { isPlainObject } from '@redocly/openapi-core';
import addFormats from 'ajv-formats';

import type { SchemaValidationError } from '../types/index.js';

const AjvConstructor = Ajv2020 as unknown as new (options?: Options) => Ajv2020Instance;
const applyFormats = addFormats as unknown as (ajv: Ajv2020Instance) => void;

export type ValidationTarget = 'request' | 'response';

function isPropertyExcludedFromTarget(propertySchema: unknown, target: ValidationTarget): boolean {
  if (!isPlainObject(propertySchema)) {
    return false;
  }
  return target === 'request'
    ? propertySchema.readOnly === true
    : propertySchema.writeOnly === true;
}

function isRequiredNameExcludedFromTarget(
  schema: unknown,
  name: string,
  target: ValidationTarget
): boolean {
  if (!isPlainObject(schema)) {
    return false;
  }

  const properties = schema.properties;
  if (isPlainObject(properties) && isPropertyExcludedFromTarget(properties[name], target)) {
    return true;
  }

  return [schema.allOf, schema.oneOf, schema.anyOf].some(
    (branches) =>
      Array.isArray(branches) &&
      branches.some((branch) => isRequiredNameExcludedFromTarget(branch, name, target))
  );
}

/**
 * Per OpenAPI semantics, readOnly properties are absent from requests and
 * writeOnly properties are absent from responses, so they must not be enforced
 * via `required` when validating the corresponding message.
 */
function relaxRequiredForTarget(schema: unknown, target: ValidationTarget): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => relaxRequiredForTarget(item, target));
  }

  if (!isPlainObject(schema)) {
    return schema;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    output[key] = relaxRequiredForTarget(value, target);
  }

  if (Array.isArray(schema.required)) {
    output.required = schema.required.filter(
      (name) => typeof name !== 'string' || !isRequiredNameExcludedFromTarget(schema, name, target)
    );
  }

  return output;
}

export class SchemaValidator {
  private readonly ajv: Ajv2020Instance;
  private readonly objectSchemaCaches = {
    none: new WeakMap<object, ValidateFunction>(),
    request: new WeakMap<object, ValidateFunction>(),
    response: new WeakMap<object, ValidateFunction>(),
  };
  private readonly scalarSchemaCache = new Map<string, ValidateFunction>();

  public constructor(options?: { coerceTypes?: boolean }) {
    this.ajv = new AjvConstructor({
      strict: false,
      allErrors: true,
      allowUnionTypes: true,
      coerceTypes: options?.coerceTypes ? 'array' : false,
      validateFormats: true,
      verbose: true,
      formats: {
        // Some specs misuse `format: "enum"` instead of the `enum` keyword.
        // Treat it as a no-op format to avoid noisy unknown-format warnings.
        enum: true,
      },
    });

    applyFormats(this.ajv);
  }

  public validate(
    schema: unknown,
    value: unknown,
    target?: ValidationTarget
  ): { valid: boolean; errors: SchemaValidationError[] } {
    if (schema === undefined) {
      return { valid: true, errors: [] };
    }

    let validate: ValidateFunction;

    try {
      validate = this.getOrCompileValidator(schema, target);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            message: `Schema compilation failed: ${(error as Error).message}`,
          },
        ],
      };
    }

    const valid = Boolean(validate(value));
    const errors: SchemaValidationError[] = validate.errors ?? [];
    return { valid, errors };
  }

  private getOrCompileValidator(schema: unknown, target?: ValidationTarget): ValidateFunction {
    if (isPlainObject(schema)) {
      const cache = this.objectSchemaCaches[target ?? 'none'];
      const cached = cache.get(schema);
      if (cached) {
        return cached;
      }

      const effectiveSchema = target ? relaxRequiredForTarget(schema, target) : schema;
      const compiled = this.ajv.compile(effectiveSchema as AnySchema);
      cache.set(schema, compiled);
      return compiled;
    }

    const cacheKey = `${target ?? 'none'}:${JSON.stringify(schema)}`;
    const cached = this.scalarSchemaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const compiled = this.ajv.compile(schema as AnySchema);
    this.scalarSchemaCache.set(cacheKey, compiled);
    return compiled;
  }
}
