import { generateArazzoDescription } from '../modules/arazzo-description-generator/index.js';
import { type BaseResolver, type CollectFn, type Config } from '@redocly/openapi-core';

export type GenerateArazzoOptions = {
  descriptionPath: string;
  outputFile?: string;
  config: Config;
  version: string;
  collectSpecData?: CollectFn;
  externalRefResolver?: BaseResolver;
  base?: string;
};

export async function generate(options: GenerateArazzoOptions): Promise<string> {
  return await generateArazzoDescription(options);
}
