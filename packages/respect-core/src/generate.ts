import { type BaseResolver, type CollectSpecData, type Config } from '@redocly/openapi-core';

import { generateArazzoDescription } from './modules/arazzo-description-generator/index.js';
import { type TestDescription } from './types.js';

export type GenerateArazzoOptions = {
  descriptionPath: string;
  outputFile?: string;
  config: Config;
  version: string;
  collectSpecData?: CollectSpecData;
  externalRefResolver?: BaseResolver;
  base?: string;
};

export async function generate(options: GenerateArazzoOptions): Promise<TestDescription> {
  return await generateArazzoDescription(options);
}
