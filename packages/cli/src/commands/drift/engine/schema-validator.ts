import Ajv2020, {
  type AnySchema,
  type Options,
  type ValidateFunction,
  type Ajv2020 as Ajv2020Instance,
} from '@redocly/ajv/dist/2020.js';
import { isPlainObject, mapSubschemas, toAjvSchema } from '@redocly/openapi-core';
import addFormats from 'ajv-formats';

import type { SchemaValidationError } from '../types/index.js';

const AjvConstructor = Ajv2020 as unknown as new (options?: Options) => Ajv2020Instance;
const applyFormats = addFormats as unknown as (ajv: Ajv2020Instance) => void;

export type ValidationTarget = 'request' | 'response';

/**
 * A readOnly property never appears in a request and a writeOnly property never
 * appears in a response. OpenAPI 3.0 often attaches the flag through
 * `allOf: [{ $ref }, { readOnly: true }]`, so the allOf branches count as well.
 */
export function isPropertyExcludedFromTarget(
  propertySchema: unknown,
  target: ValidationTarget
): boolean {
  if (!isPlainObject(propertySchema)) {
    return false;
  }
  const flag = target === 'request' ? 'readOnly' : 'writeOnly';
  return (
    propertySchema[flag] === true ||
    (Array.isArray(propertySchema.allOf) &&
      propertySchema.allOf.some((branch) => isPlainObject(branch) && branch[flag] === true))
  );
}

function isRequiredNameExcludedFromTarget(
  schema: unknown,
  name: string,
  target: ValidationTarget,
  seen = new WeakSet<object>()
): boolean {
  if (!isPlainObject(schema) || seen.has(schema)) {
    return false;
  }
  seen.add(schema);

  const properties = schema.properties;
  if (isPlainObject(properties) && isPropertyExcludedFromTarget(properties[name], target)) {
    return true;
  }

  return [schema.allOf, schema.oneOf, schema.anyOf].some(
    (branches) =>
      Array.isArray(branches) &&
      branches.some((branch) => isRequiredNameExcludedFromTarget(branch, name, target, seen))
  );
}

/**
 * Per OpenAPI semantics, readOnly properties are absent from requests and
 * writeOnly properties are absent from responses, so they must not be enforced
 * via `required` when validating the corresponding message.
 *
 * A dereferenced recursive schema contains itself, and so does the result: a
 * revisited schema gets the copy that was already made for it.
 */
function relaxRequiredForTarget(
  schema: unknown,
  target: ValidationTarget,
  copies = new Map<object, Record<string, unknown>>()
): unknown {
  if (!isPlainObject(schema)) {
    return schema;
  }

  const copy = copies.get(schema);
  if (copy) {
    return copy;
  }

  // Registered before it is filled, because the schema can be one of its own subschemas.
  const relaxed: Record<string, unknown> = {};
  copies.set(schema, relaxed);
  Object.assign(
    relaxed,
    mapSubschemas(schema, (subschema) => relaxRequiredForTarget(subschema, target, copies))
  );

  if (Array.isArray(schema.required)) {
    relaxed.required = schema.required.filter(
      (name) => typeof name !== 'string' || !isRequiredNameExcludedFromTarget(schema, name, target)
    );
  }

  return relaxed;
}

export class SchemaValidator {
  private readonly ajv: Ajv2020Instance;
  private readonly fallbackAjv: Ajv2020Instance;
  private readonly objectSchemaCaches = {
    none: new WeakMap<object, ValidateFunction>(),
    request: new WeakMap<object, ValidateFunction>(),
    response: new WeakMap<object, ValidateFunction>(),
  };
  private readonly scalarSchemaCache = new Map<string, ValidateFunction>();

  public constructor(options?: { coerceTypes?: boolean }) {
    const ajvOptions: Options = {
      strict: false,
      allErrors: true,
      allowUnionTypes: true,
      discriminator: true,
      // By default, Ajv writes the code of a referenced schema in place of every `$ref` to it,
      // which undoes what `toAjvSchema` moves to `$defs`.
      inlineRefs: false,
      coerceTypes: options?.coerceTypes ? 'array' : false,
      validateFormats: true,
      // Without it, `98.8` fails `multipleOf: 0.1` because of floating point division.
      multipleOfPrecision: 6,
      verbose: true,
      formats: {
        // Some specs misuse `format: "enum"` instead of the `enum` keyword.
        // Treat it as a no-op format to avoid noisy unknown-format warnings.
        enum: true,
      },
    };

    this.ajv = new AjvConstructor(ajvOptions);
    // Ajv rejects loosely defined discriminators at compile time (for example
    // when the tag property has no `const`/`enum` or is not required); such
    // schemas fall back to being validated against every oneOf branch.
    this.fallbackAjv = new AjvConstructor({ ...ajvOptions, discriminator: false });

    applyFormats(this.ajv);
    applyFormats(this.fallbackAjv);
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

      const effectiveSchema = toAjvSchema(target ? relaxRequiredForTarget(schema, target) : schema);
      const compiled = this.compileSchema(effectiveSchema as AnySchema);
      cache.set(schema, compiled);
      return compiled;
    }

    const cacheKey = `${target ?? 'none'}:${JSON.stringify(schema)}`;
    const cached = this.scalarSchemaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const compiled = this.compileSchema(schema as AnySchema);
    this.scalarSchemaCache.set(cacheKey, compiled);
    return compiled;
  }

  private compileSchema(schema: AnySchema): ValidateFunction {
    try {
      return this.ajv.compile(schema);
    } catch {
      return this.fallbackAjv.compile(schema);
    }
  }
}
