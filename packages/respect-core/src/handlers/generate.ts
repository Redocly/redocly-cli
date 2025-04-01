import { blue, yellow, gray } from 'colorette';
import { writeFileSync } from 'node:fs';
import { stringifyYaml } from '../utils/yaml.js';
import { generateArazzoDescription } from '../modules/arazzo-description-generator/index.js';
import { DefaultLogger } from '../utils/logger/logger.js';
import { rethrowHandledError } from '../utils/exit-with-error.js';
import { type CommandArgs } from '../types.js';

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
    rethrowHandledError(
      '\n' +
        '❌  Failed to generate Arazzo description. Check the output file path you provided, or the OpenAPI file content.'
    );
  }
}
