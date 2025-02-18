import betterAjvErrors from 'better-ajv-errors';
import { RESET_ESCAPE_CODE } from './cli-outputs';

import type { JSONSchemaType } from '@redocly/ajv/dist/2020';


export function printErrors(schema: JSONSchemaType<unknown>, data: any, errors: any[]) {
  const updatedErrors = errors.map((error: any) => {
    if (error.keyword === 'unevaluatedProperties' || error.keyword === 'additionalProperties') {
      const failedProp = error.params.unevaluatedProperty || error.params.additionalProperty;
      // Add a custom message with the unevaluated or the additional property information
      return {
        ...error,
        message: `${error.message}: "${failedProp}".`,
      };
    }
    return error;
  });

  // Use betterAjvErrors with the modified errors
  const output = betterAjvErrors(schema, data, updatedErrors, {
    format: 'cli',
    indent: 2,
  });

  return `${RESET_ESCAPE_CODE}\n${output}${RESET_ESCAPE_CODE}\n`;
}
