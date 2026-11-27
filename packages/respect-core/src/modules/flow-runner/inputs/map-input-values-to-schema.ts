import Ajv from '@redocly/ajv/dist/2020.js';
import { toAjvSchema } from '@redocly/openapi-core';

import type { InputSchema } from '../../../types.js';

type MappedValue = {
  [key: string]: any;
};

export function resolveInputValuesToSchema(
  value: any,
  schema: InputSchema,
  onInvalid?: (problems: string) => void
): MappedValue {
  if (!schema || Object.keys(schema).length === 0) {
    return {};
  }

  const ajv = new (Ajv as any)({
    allErrors: true,
    useDefaults: true,
    removeAdditional: 'all',
    coerceTypes: true,
    strictTypes: false,
    strictSchema: false,
    // Without it, `98.8` fails `multipleOf: 0.1` because of floating point division.
    multipleOfPrecision: 6,
  });

  // Add custom formats
  ajv.addFormat('password', true);
  ajv.addFormat('int32', true);
  ajv.addFormat('int64', true);
  ajv.addFormat('float', true);
  ajv.addFormat('double', true);

  // The Arazzo description is dereferenced, so a recursive schema holds a copy of itself.
  const validate = ajv.compile(toAjvSchema(schema));
  const result = { ...value };

  // Defaults, coercion, and removal of extra properties happen first, so only the problems the user has to fix are reported.
  if (!validate(result) && onInvalid) {
    onInvalid(ajv.errorsText(validate.errors, { dataVar: 'inputs' }));
  }

  return result;
}
