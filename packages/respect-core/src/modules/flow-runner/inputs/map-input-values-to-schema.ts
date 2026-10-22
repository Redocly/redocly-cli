import Ajv from '@redocly/ajv/dist/2020.js';

import type { InputSchema } from '../../../types.js';

type MappedValue = {
  [key: string]: any;
};

export function resolveInputValuesToSchema(
  value: any,
  schema: InputSchema,
  validateInputs = false
): MappedValue {
  if (!schema || Object.keys(schema).length === 0) {
    return {};
  }

  const ajv = new (Ajv as any)({
    useDefaults: true,
    removeAdditional: 'all',
    coerceTypes: true,
    strictTypes: false,
  });

  // Add custom formats
  ajv.addFormat('password', true);
  ajv.addFormat('int32', true);
  ajv.addFormat('int64', true);
  ajv.addFormat('float', true);
  ajv.addFormat('double', true);

  const validate = ajv.compile(schema);
  const result = { ...value };

  if (!validate(result) && validateInputs) {
    throw new Error(
      `Invalid workflow inputs: ${ajv.errorsText(validate.errors, { dataVar: 'inputs' })}. Provide values that match the workflow input schema.`
    );
  }

  return result;
}
