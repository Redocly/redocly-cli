import Ajv2020, { type ValidateFunction } from '@redocly/ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const oasAnnotations = ['example', 'nullable', 'externalDocs', 'discriminator', 'xml'];

let ajv: any;

export function getSchemaValidator(schema: unknown): ValidateFunction {
  if (!ajv) {
    ajv = new (Ajv2020 as any)({
      allErrors: true,
      validateSchema: true,
      strictSchema: true,
      logger: false,
    });
    (addFormats as any)(ajv);
    for (const keyword of oasAnnotations) {
      if (!ajv.getKeyword(keyword)) ajv.addKeyword(keyword);
    }
  }
  try {
    return ajv.compile(schema);
  } catch (error) {
    throw new Error(`the 'schema' assertion has an invalid schema: ${error.message}`);
  }
}
