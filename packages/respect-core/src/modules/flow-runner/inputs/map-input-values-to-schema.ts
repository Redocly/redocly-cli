import Ajv from '@redocly/ajv/dist/2020.js';

import type { InputSchema } from '../../../types.js';

type MappedValue = {
  [key: string]: any;
};

export class WorkflowInputValidationError extends Error {}

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
  // Scalar reusable schemas do not describe the named workflow input object.
  const isInputObjectSchema = !schema.type || schema.type === 'object';

  if (!validate(result) && validateInputs && isInputObjectSchema) {
    throw new WorkflowInputValidationError(
      `Invalid workflow inputs: ${ajv.errorsText(validate.errors, { dataVar: 'inputs' })}. Provide values that match the workflow input schema.`
    );
  }

  return result;
}
