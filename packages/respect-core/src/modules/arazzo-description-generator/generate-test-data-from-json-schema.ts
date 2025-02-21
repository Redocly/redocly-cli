import * as Sampler from 'openapi-sampler';
import { bgRed } from 'colorette';
import { DefaultLogger } from '../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

export function generateTestDataFromJsonSchema(schema: any) {
  if (!schema) return;
  try {
    return Sampler.sample(schema, { skipReadOnly: true, skipNonRequired: false, quiet: true });
  } catch (e) {
    logger.error(bgRed(` Error while generating test data from JSON Schema `) + '\n' + e);
    return;
  }
}
