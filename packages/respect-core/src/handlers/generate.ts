import { blue, yellow, gray } from 'colorette';
import { writeFileSync } from 'fs';
import { stringifyYaml } from '../utils/yaml';
import { generateArazzoDescription } from '../modules/arazzo-description-generator';
import { DefaultLogger } from '../utils/logger/logger';
import { exitWithError } from '../utils/exit-with-error';
import { type CommandArgs } from '../types';

export type GenerateArazzoFileOptions = {
  descriptionPath: string;
  'output-file'?: string;
  config?: never;
};

const logger = DefaultLogger.getInstance();

export async function handleGenerate({ argv }: CommandArgs<GenerateArazzoFileOptions>) {
  try {
    logger.log(gray('\n  Generating Arazzo description... \n'));

    const generatedConfig = await generateArazzoDescription(argv);
    const content = stringifyYaml(generatedConfig);

    const fileName = argv['output-file'] || 'auto-generated.arazzo.yaml';
    writeFileSync(fileName, content);

    logger.log(
      '\n' + blue(`Arazzo description ${yellow(fileName)} successfully generated.`) + '\n'
    );
  } catch (_err) {
    exitWithError(
      '\n' +
        '❌  Failed to generate Arazzo description. Check the provided output file path or the OpenAPI file content.'
    );
  }
}
