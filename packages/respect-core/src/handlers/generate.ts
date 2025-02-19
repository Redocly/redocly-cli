import { blue, yellow, gray } from 'colorette';
import { writeFileSync } from 'fs';
import { stringifyYaml } from '../utils/yaml';
import { generateTestConfig } from '../modules/test-config-generator';
import { DefaultLogger } from '../utils/logger/logger';

import type { GenerateConfigFileArgv } from '../types';

const logger = DefaultLogger.getInstance();

export async function handleGenerate(argv: GenerateConfigFileArgv) {
  logger.log(gray('\n  Generating test configuration... \n'));

  const generatedConfig = await generateTestConfig(argv as GenerateConfigFileArgv);
  const content = stringifyYaml(generatedConfig);

  const fileName = argv?.outputFile || 'auto-generated.yaml';
  writeFileSync(fileName, content);

  logger.log('\n' + blue(`Config ${yellow(fileName)} successfully generated.`) + '\n');
}
