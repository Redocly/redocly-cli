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

const SINGLE_SCHEMA_KEYWORDS = new Set([
  'items',
  'additionalItems',
  'additionalProperties',
  'unevaluatedItems',
  'unevaluatedProperties',
  'contains',
  'propertyNames',
  'not',
  'if',
  'then',
  'else',
]);
const SCHEMA_LIST_KEYWORDS = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);
const SCHEMA_MAP_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'dependentSchemas',
  '$defs',
  'definitions',
]);

/**
 * Per OpenAPI semantics, readOnly properties are absent from requests and
 * writeOnly properties are absent from responses, so they must not be enforced
 * via `required` when validating the corresponding message.
 *
 * Only keywords that hold subschemas are traversed. Dereferenced recursive
 * schemas contain circular references; a revisited schema is replaced with the
 * permissive `true` schema so the copy stays acyclic and compilable, at the
 * cost of not validating below the recursion point.
 */
function relaxRequiredForTarget(
  schema: unknown,
  target: ValidationTarget,
  ancestors = new WeakSet<object>()
): unknown {
  if (!isPlainObject(schema)) {
    return schema;
  }

  if (ancestors.has(schema)) {
    return true;
  }
  ancestors.add(schema);

  const relaxValue = (value: unknown) => relaxRequiredForTarget(value, target, ancestors);

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (SINGLE_SCHEMA_KEYWORDS.has(key)) {
      output[key] = Array.isArray(value) ? value.map(relaxValue) : relaxValue(value);
    } else if (SCHEMA_LIST_KEYWORDS.has(key) && Array.isArray(value)) {
      output[key] = value.map(relaxValue);
    } else if (SCHEMA_MAP_KEYWORDS.has(key) && isPlainObject(value)) {
      output[key] = Object.fromEntries(
        Object.entries(value).map(([mapKey, mapValue]) => [mapKey, relaxValue(mapValue)])
      );
    } else {
      output[key] = value;
    }
  }

  if (Array.isArray(schema.required)) {
    output.required = schema.required.filter(
      (name) => typeof name !== 'string' || !isRequiredNameExcludedFromTarget(schema, name, target)
    );
  }

  ancestors.delete(schema);
  return output;
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
      coerceTypes: options?.coerceTypes ? 'array' : false,
      validateFormats: true,
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

      const effectiveSchema = target ? relaxRequiredForTarget(schema, target) : schema;
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
