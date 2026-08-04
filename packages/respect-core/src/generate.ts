import { type BaseResolver, type CollectSpecData, type Config } from '@redocly/openapi-core';

import { generateArazzoDescription } from './modules/arazzo-description-generator/index.js';

export type GenerateArazzoOptions = {
  descriptionPath: string;
  outputFile?: string;
  config: Config;
  version: string;
  collectSpecData?: CollectSpecData;
  externalRefResolver?: BaseResolver;
  base?: string;
};

export async function generate(options: GenerateArazzoOptions): Promise<string> {
  return await generateArazzoDescription(options);
}
