import { stringifyYaml } from '../utils/yaml.js';
import { generateArazzoDescription } from '../modules/arazzo-description-generator/index.js';

import type { BaseResolver, CollectFn, Config } from '@redocly/openapi-core';

export type GenerateArazzoOptions = {
  descriptionPath: string;
  outputFile?: string;
  config: Config;
  version: string;
  collectSpecData?: CollectFn;
  externalRefResolver?: BaseResolver;
};

export async function generateArazzo(options: GenerateArazzoOptions): Promise<string> {
  const arazzoDocument = await generateArazzoDescription(options);
  return stringifyYaml(arazzoDocument);
}
