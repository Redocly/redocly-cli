import { bgRed } from 'colorette';
import * as Sampler from 'openapi-sampler';

import type { LoggerInterface } from '@redocly/openapi-core';

export function generateTestDataFromJsonSchema(schema: any, logger: LoggerInterface) {
  if (!schema) return;
  try {
    return Sampler.sample(schema, { skipReadOnly: true, skipNonRequired: false, quiet: true });
  } catch (e) {
    logger.error(bgRed(` Error while generating test data from JSON Schema `) + '\n' + e);
    return;
  }
}
