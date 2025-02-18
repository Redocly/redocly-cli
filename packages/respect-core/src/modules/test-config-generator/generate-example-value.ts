import type { Parameter } from '../../types';

import { generateTestDataFromJsonSchema } from './generate-test-data-from-json-schema';
import { extractFirstExample } from '../description-parser';

export function generateExampleValue(parameter: Parameter) {
  if (parameter?.example) {
    return parameter.example;
  } else if (parameter?.examples) {
    return extractFirstExample(parameter.examples);
  } else if (parameter?.schema) {
    return generateTestDataFromJsonSchema(parameter.schema);
  }
}
