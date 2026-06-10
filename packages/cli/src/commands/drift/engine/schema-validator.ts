import { isPlainObject } from '@redocly/openapi-core';
import addFormats from 'ajv-formats';
import Ajv2020, {
  type AnySchema,
  type Options,
  type ValidateFunction,
  type Ajv2020 as Ajv2020Instance,
} from 'ajv/dist/2020.js';

import type { SchemaValidationError } from '../types/index.js';

const AjvConstructor = Ajv2020 as unknown as new (options?: Options) => Ajv2020Instance;
const applyFormats = addFormats as unknown as (ajv: Ajv2020Instance) => void;

export class SchemaValidator {
  private readonly ajv: Ajv2020Instance;
  private readonly objectSchemaCache = new WeakMap<object, ValidateFunction>();
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
    value: unknown
  ): { valid: boolean; errors: SchemaValidationError[] } {
    if (schema === undefined) {
      return { valid: true, errors: [] };
    }

    let validate: ValidateFunction;

    try {
      validate = this.getOrCompileValidator(schema);
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

  private getOrCompileValidator(schema: unknown): ValidateFunction {
    if (isPlainObject(schema)) {
      const cached = this.objectSchemaCache.get(schema);
      if (cached) {
        return cached;
      }

      const compiled = this.ajv.compile(schema as AnySchema);
      this.objectSchemaCache.set(schema, compiled);
      return compiled;
    }

    const cacheKey = JSON.stringify(schema);
    const cached = this.scalarSchemaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const compiled = this.ajv.compile(schema as AnySchema);
    this.scalarSchemaCache.set(cacheKey, compiled);
    return compiled;
  }
}
