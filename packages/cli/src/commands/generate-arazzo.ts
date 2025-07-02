import { blue, gray, yellow } from 'colorette';
import { generateArazzo } from '@redocly/respect-core';
import { type CommandArgs } from '../wrapper.js';
import { writeFileSync } from 'node:fs';
import { HandledError, logger } from '@redocly/openapi-core';

export type GenerateArazzoCommandArgs = {
  descriptionPath: string;
  'output-file'?: string;
  config?: never;
};

export async function handleGenerateArazzo({
  argv,
  config: _config,
  version,
  collectSpecData,
}: CommandArgs<GenerateArazzoCommandArgs>) {
  const outputFile = argv['output-file'] || 'auto-generated.arazzo.yaml';
  const options = {
    outputFile,
    descriptionPath: argv.descriptionPath,
    collectSpecData,
    version,
  };

  try {
    logger.info(gray('\n  Generating Arazzo description... \n'));

    const generatedArazzo = await generateArazzo(options);
    writeFileSync(outputFile, generatedArazzo);

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
