import { blue, yellow, gray } from 'colorette';
import { writeFileSync } from 'fs';
import { stringifyYaml } from '../utils/yaml';
import { generateTestConfig } from '../modules/test-config-generator';
import { DefaultLogger } from '../utils/logger/logger';
import { type GenerateArazzoFileArgv } from '../types';
import { type CommandArgs } from './run';

const logger = DefaultLogger.getInstance();

export async function handleGenerate({ argv }: CommandArgs<GenerateArazzoFileArgv>) {
  logger.log(gray('\n  Generating test configuration... \n'));

  const generatedConfig = await generateTestConfig(argv);
  const content = stringifyYaml(generatedConfig);

  const fileName = argv['output-file'] || 'auto-generated.arazzo.yaml';
  writeFileSync(fileName, content);

  logger.log('\n' + blue(`Config ${yellow(fileName)} successfully generated.`) + '\n');
}
