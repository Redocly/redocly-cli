import Ajv2020, { type AnySchema, type ValidateFunction } from '@redocly/ajv/dist/2020.js';
import addFormats from 'ajv-formats';

type ValidationError = {
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
  schemaPath?: string;
  instancePath?: string;
};

export class SchemaValidator {
  private readonly ajv: any;
  private readonly objectSchemaCache = new WeakMap<object, ValidateFunction>();
  private readonly scalarSchemaCache = new Map<string, ValidateFunction>();

  public constructor() {
    this.ajv = new (Ajv2020 as any)({
      strict: false,
      allErrors: true,
      allowUnionTypes: true,
      coerceTypes: true,
      validateFormats: true,
      verbose: true,
      formats: {
        // Some specs misuse `format: "enum"` instead of the `enum` keyword.
        // Treat it as a no-op format to avoid noisy unknown-format warnings.
        enum: true,
      },
    });

    (addFormats as any)(this.ajv);
  }

  public validate(schema: unknown, value: unknown): { valid: boolean; errors: ValidationError[] } {
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
    const errors = (validate.errors as ValidationError[] | null | undefined) ?? [];
    return { valid, errors };
  }

  private getOrCompileValidator(schema: unknown): ValidateFunction {
    if (schema && typeof schema === 'object') {
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
