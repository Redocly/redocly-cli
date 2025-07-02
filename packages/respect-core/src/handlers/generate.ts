import { stringifyYaml } from '../utils/yaml.js';
import { generateArazzoDescription } from '../modules/arazzo-description-generator/index.js';
import { type CollectFn } from '@redocly/openapi-core';

export type GenerateArazzoOptions = {
  descriptionPath: string;
  outputFile?: string;
  config?: never;
  version: string;
  collectSpecData?: CollectFn;
};

export async function generateArazzo(options: GenerateArazzoOptions): Promise<string> {
  const arazzoDocument = await generateArazzoDescription(options);
  options.collectSpecData?.(arazzoDocument); //TODO: collect OPENAPI data
  return stringifyYaml(arazzoDocument);
}
