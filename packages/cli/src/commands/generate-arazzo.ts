import { writeFileSync } from 'node:fs';
import { HandledError, logger, stringifyYaml } from '@redocly/openapi-core';
import { blue, gray, yellow } from 'colorette';
import type { CommandArgs } from '../wrapper.js';

export type GenerateArazzoCommandArgv = {
  descriptionPath: string;
  'output-file'?: string;
  config?: string;
};

export async function handleGenerateArazzo({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<GenerateArazzoCommandArgv>) {
  const outputFile = argv['output-file'] || 'auto-generated.arazzo.yaml';
  const options = {
    outputFile,
    descriptionPath: argv.descriptionPath,
    collectSpecData,
    version,
    config,
  };

  try {
    const { generate } = await import('@redocly/respect-core');

    logger.info(gray('\n  Generating Arazzo description... \n'));

    const generatedArazzo = await generate(options);
    writeFileSync(outputFile, stringifyYaml(generatedArazzo));

    logger.info(
      '\n' + blue(`Arazzo description ${yellow(outputFile)} successfully generated.`) + '\n'
    );
  } catch (error) {
    throw new HandledError(
      '\n' +
        '❌  Failed to generate Arazzo description. Check the output file path you provided, or the OpenAPI file content.'
    );
  }
}
