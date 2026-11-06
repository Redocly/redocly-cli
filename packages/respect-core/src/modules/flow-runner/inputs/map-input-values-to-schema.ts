import Ajv from '@redocly/ajv/dist/2020.js';
import type { LoggerInterface } from '@redocly/openapi-core';

import type { InputSchema } from '../../../types.js';

type MappedValue = {
  [key: string]: any;
};

export type WorkflowInputValidationContext = {
  workflowId: string;
  logger: Pick<LoggerInterface, 'warn'>;
};

export function resolveInputValuesToSchema(
  value: any,
  schema: InputSchema,
  validationContext?: WorkflowInputValidationContext
): MappedValue {
  if (!schema || Object.keys(schema).length === 0) {
    return {};
  }

  if (schema.type && schema.type !== 'object') {
    validationContext?.logger.warn(
      `Workflow "${validationContext.workflowId}" has a non-object input schema. Named inputs are preserved without validation. Use an object schema to validate named inputs.\n`
    );
    return { ...value };
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
  if (!validate(result) && validationContext) {
    const error = validate.errors[0];
    // Report the schema location, since data paths can contain supplied secret keys.
    validationContext.logger.warn(
      `Invalid inputs for workflow "${validationContext.workflowId}": ${error.message} (${error.schemaPath}). Provide values that match the workflow input schema.\n`
    );
  }

  return result;
}
