import { generateTestDataFromJsonSchema } from './generate-test-data-from-json-schema.js';
import { extractFirstExample } from '../description-parser/index.js';

import type { Parameter } from '../../types.js';
import type { LoggerInterface } from '@redocly/openapi-core';

export function generateExampleValue(parameter: Parameter, logger: LoggerInterface) {
  if (parameter?.example) {
    return parameter.example;
  } else if (parameter?.examples) {
    return extractFirstExample(parameter.examples);
  } else if (parameter?.schema) {
    return generateTestDataFromJsonSchema(parameter.schema, logger);
  }
}
