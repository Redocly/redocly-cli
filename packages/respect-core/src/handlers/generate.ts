import { blue, yellow, gray } from 'colorette';
import { writeFileSync } from 'fs';
import { stringifyYaml } from '../utils/yaml';
import { generateTestConfig } from '../modules/test-config-generator';
import { DefaultLogger } from '../utils/logger/logger';
import { exitWithError } from '../utils/exit-with-error';
import { type CommandArgs } from '../types';

export type GenerateArazzoFileOptions = {
  descriptionPath: string;
  'output-file'?: string;
  extended?: boolean;
};

const logger = DefaultLogger.getInstance();

export async function handleGenerate({ argv }: CommandArgs<GenerateArazzoFileOptions>) {
  try {
    logger.log(gray('\n  Generating test configuration... \n'));

    const generatedConfig = await generateTestConfig(argv);
    const content = stringifyYaml(generatedConfig);

    const fileName = argv['output-file'] || 'auto-generated.arazzo.yaml';
    writeFileSync(fileName, content);

    logger.log('\n' + blue(`Config ${yellow(fileName)} successfully generated.`) + '\n');
  } catch (_err) {
    exitWithError('\n' + '❌  Auto config generation failed.');
  }
}
