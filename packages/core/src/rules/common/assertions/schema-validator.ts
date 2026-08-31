import Ajv2020, { type ValidateFunction } from '@redocly/ajv/dist/2020.js';
import addFormats from 'ajv-formats';

let ajv: any;
const validators = new WeakMap<object, ValidateFunction>();

export function getSchemaValidator(schema: object): ValidateFunction {
  const cached = validators.get(schema);
  if (cached) return cached;

  if (!ajv) {
    ajv = new (Ajv2020 as any)({
      allErrors: true,
      validateSchema: true,
      strictSchema: false,
      logger: false,
    });
    (addFormats as any)(ajv);
  }

  let validate: ValidateFunction;
  try {
    validate = ajv.compile(schema);
  } catch (error) {
    throw new Error(`The 'schema' assertion has an invalid schema: ${error.message}`);
  }

  validators.set(schema, validate);
  return validate;
}
